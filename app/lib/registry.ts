import { z } from "zod";
import {
  CACHE_FRESH_TTL,
  CACHE_HARD_TTL,
  CACHE_NEGATIVE_TTL,
  DEFAULT_SEARCH_PAGE_SIZE,
  cacheGetEntry,
  cacheSet,
  isExpired,
  isFresh,
  downloadsCacheKey,
  overviewCacheKey,
  packageCacheKey,
  searchCacheKey,
  versionOverviewCacheKey,
} from "./cache";
import { runInBackground } from "./background";
import {
  PAGE_REVALIDATE_SECONDS,
  revalidationSafeWindow,
} from "./freshness";
import { getGithubStats } from "./github";
import { coalesce } from "./in-flight";
import { MAX_QUERY_LENGTH, MIN_QUERY_LENGTH } from "./search-query";
import type {
  DownloadPoint,
  LatestVersionInfo,
  PackageDetail,
  PackageOverview,
  PackageSummary,
  RecentVersion,
  SearchResults,
} from "./types";

const REGISTRY_BASE = "https://registry.npmjs.org";
const DOWNLOADS_BASE = "https://api.npmjs.org";
const REQUEST_TIMEOUT_MS = 8_000;
const REGISTRY_REVALIDATE_SECONDS = PAGE_REVALIDATE_SECONDS;
const REGISTRY_USER_AGENT = "npmsearch/0.1 (+https://npmsearch121.vercel.app)";

export const MAX_SEARCH_PAGE_SIZE = 50;
export const MAX_SEARCH_FROM = 1_000;
export const README_LIMIT = 256_000;
export const MAX_PACKAGE_NAME_LENGTH = 214;

const PACKAGE_NAME_PATTERN =
  /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;

type RegistryErrorContext = {
  packageName?: string;
  status?: number;
  contentType?: string | null;
  retryAfterSeconds?: number;
  durationMs?: number;
};

export class RegistryError extends Error {
  readonly packageName?: string;
  readonly status?: number;
  readonly contentType?: string | null;
  readonly retryAfterSeconds?: number;
  readonly durationMs?: number;

  constructor(message: string, context: RegistryErrorContext = {}) {
    super(message);
    this.name = "RegistryError";
    this.packageName = context.packageName;
    this.status = context.status;
    this.contentType = context.contentType;
    this.retryAfterSeconds = context.retryAfterSeconds;
    this.durationMs = context.durationMs;
  }
}

function parseRetryAfter(value: string | null): number | undefined {
  if (!value) return undefined;

  const seconds = Number(value);

  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.max(1, Math.ceil(seconds));
  }

  const date = Date.parse(value);

  if (!Number.isFinite(date)) return undefined;

  return Math.max(1, Math.ceil((date - Date.now()) / 1_000));
}

function isJsonContentType(value: string | null): boolean {
  return (value ?? "").toLowerCase().includes("json");
}

function registryHeaders(accept: string): HeadersInit {
  return { Accept: accept, "User-Agent": REGISTRY_USER_AGENT };
}

type RegistryResponse =
  | { kind: "ok"; json: unknown }
  | { kind: "not-found" };

/**
 * Single registry request path: descriptive UA, hard timeout, content-type
 * validation before parsing, and a `RegistryError` rich enough to log and to
 * derive a failure cooldown from `retry-after`.
 */
async function fetchRegistryJson(
  url: string,
  context: { packageName?: string; resource: string; revalidate: number },
): Promise<RegistryResponse> {
  const startedAt = Date.now();
  const requestInit = {
    headers: registryHeaders("application/json"),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  };
  let response: Response;

  try {
    response = await fetch(
      url,
      context.revalidate > 0
        ? { ...requestInit, next: { revalidate: context.revalidate } }
        : { ...requestInit, cache: "no-store" },
    );
  } catch (error) {
    const reason =
      error instanceof Error ? `${error.name}: ${error.message}` : String(error);

    throw new RegistryError(
      `Unable to reach the npm registry for ${context.resource} (${reason})`,
      {
        packageName: context.packageName,
        durationMs: Date.now() - startedAt,
      },
    );
  }

  const contentType = response.headers.get("content-type");
  const retryAfterSeconds = parseRetryAfter(
    response.headers.get("retry-after"),
  );

  if (response.status === 404) {
    return { kind: "not-found" };
  }

  if (!response.ok) {
    throw new RegistryError(
      `Registry ${context.resource} request failed with status ${response.status}`,
      {
        packageName: context.packageName,
        status: response.status,
        contentType,
        retryAfterSeconds,
        durationMs: Date.now() - startedAt,
      },
    );
  }

  if (!isJsonContentType(contentType)) {
    throw new RegistryError(
      `Registry returned a non-JSON response for ${context.resource}`,
      {
        packageName: context.packageName,
        status: response.status,
        contentType,
        durationMs: Date.now() - startedAt,
      },
    );
  }

  try {
    return { kind: "ok", json: await response.json() };
  } catch {
    throw new RegistryError("Registry returned invalid JSON", {
      packageName: context.packageName,
      status: response.status,
      contentType,
      durationMs: Date.now() - startedAt,
    });
  }
}

const searchPackageSchema = z.object({
  name: z.string().min(1),
  version: z.string().min(1),
  description: z.string().nullish(),
  keywords: z.array(z.string()).nullish(),
  date: z.string().nullish(),
  links: z
    .object({
      npm: z.string().nullish(),
      homepage: z.string().nullish(),
      repository: z.string().nullish(),
    })
    .nullish(),
});

const searchObjectSchema = z.object({
  package: searchPackageSchema,
  downloads: z
    .object({
      weekly: z.number().nullish(),
      monthly: z.number().nullish(),
    })
    .nullish(),
});

const searchResponseSchema = z.object({
  objects: z.array(z.unknown()).nullish(),
  total: z.number().nullish(),
});

export function normalizeQuery(query: string): string {
  return query
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .slice(0, MAX_QUERY_LENGTH);
}

export function normalizePackageName(name: string): string {
  let decoded = name;

  try {
    decoded = decodeURIComponent(name);
  } catch {
    decoded = name;
  }

  return decoded.trim().toLowerCase();
}

export function isValidPackageName(name: string): boolean {
  return (
    name.length > 0 &&
    name.length <= MAX_PACKAGE_NAME_LENGTH &&
    PACKAGE_NAME_PATTERN.test(name)
  );
}

export function clampSearchParams(input: { from?: number; size?: number }): {
  from: number;
  size: number;
} {
  const size = Number.isFinite(input.size)
    ? Math.min(
        Math.max(Math.trunc(input.size as number), 1),
        MAX_SEARCH_PAGE_SIZE,
      )
    : DEFAULT_SEARCH_PAGE_SIZE;
  const from = Number.isFinite(input.from)
    ? Math.min(Math.max(Math.trunc(input.from as number), 0), MAX_SEARCH_FROM)
    : 0;

  return { from, size };
}

export function buildSearchUrl(query: string, from: number, size: number): string {
  return `${REGISTRY_BASE}/-/v1/search?text=${encodeURIComponent(normalizeQuery(query))}&size=${size}&from=${from}`;
}

function mapSearchObject(
  entry: z.infer<typeof searchObjectSchema>,
  query: string,
): PackageSummary {
  const pkg = entry.package;

  return {
    name: pkg.name,
    version: pkg.version,
    description: pkg.description?.trim() || undefined,
    links: {
      npm:
        pkg.links?.npm ||
        `https://www.npmjs.com/package/${encodeURIComponent(pkg.name)}`,
      homepage: pkg.links?.homepage ?? undefined,
      repository: pkg.links?.repository ?? undefined,
    },
    weeklyDownloads: entry.downloads?.weekly ?? undefined,
    publishedAt: pkg.date ?? undefined,
    exact: pkg.name.toLowerCase() === normalizeQuery(query),
    keywords: pkg.keywords ?? undefined,
  };
}

async function refreshSearch(
  normalized: string,
  from: number,
  size: number,
  cacheKey: string,
): Promise<SearchResults> {
  const result = await fetchRegistryJson(buildSearchUrl(normalized, from, size), {
    resource: "search",
    // Search has a 60s freshness contract; the Next Data Cache must not
    // outlive it.
    revalidate: 0,
  });

  if (result.kind === "not-found") {
    throw new RegistryError("Registry search returned 404", { status: 404 });
  }

  const parsed = searchResponseSchema.safeParse(result.json);

  if (!parsed.success) {
    throw new RegistryError("Unexpected search response from the registry");
  }

  const results = (parsed.data.objects ?? []).flatMap((object) => {
    const entry = searchObjectSchema.safeParse(object);
    return entry.success ? [mapSearchObject(entry.data, normalized)] : [];
  });

  const data: SearchResults = {
    total: parsed.data.total ?? results.length,
    results,
    from,
    size,
  };

  await cacheSet(cacheKey, data, CACHE_HARD_TTL.search);

  return data;
}

export async function searchPackages(
  query: string,
  options: { from?: number; size?: number } = {},
): Promise<SearchResults> {
  const normalized = normalizeQuery(query);
  const { from, size } = clampSearchParams(options);

  if (normalized.length < MIN_QUERY_LENGTH) {
    return { total: 0, results: [], from, size };
  }

  const cacheKey = searchCacheKey(normalized, from, size);
  const entry = await cacheGetEntry<SearchResults>(cacheKey);

  if (entry && !isExpired(entry, CACHE_HARD_TTL.search)) {
    if (!isFresh(entry, CACHE_FRESH_TTL.search)) {
      runInBackground(cacheKey, async () => {
        await refreshSearch(normalized, from, size, cacheKey);
      });
    }

    return entry.data;
  }

  return refreshSearch(normalized, from, size, cacheKey);
}

const licenseSchema = z
  .union([z.string(), z.object({ type: z.string().nullish() })])
  .nullish();

const versionSchema = z.object({
  license: licenseSchema,
  dependencies: z.record(z.string(), z.string()).nullish(),
  dist: z
    .object({
      unpackedSize: z.number().nullish(),
      fileCount: z.number().nullish(),
    })
    .nullish(),
  engines: z.object({ node: z.string().nullish() }).nullish(),
  keywords: z.array(z.string()).nullish(),
  type: z.string().nullish(),
  main: z.string().nullish(),
  module: z.string().nullish(),
  exports: z.unknown().nullish(),
  types: z.string().nullish(),
  typings: z.string().nullish(),
});

const packumentSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullish(),
  readme: z.string().nullish(),
  license: licenseSchema,
  homepage: z.string().nullish(),
  keywords: z.array(z.string()).nullish(),
  maintainers: z
    .array(
      z.object({
        name: z.string(),
        email: z.string().nullish(),
      }),
    )
    .nullish(),
  repository: z
    .union([z.string(), z.object({ url: z.string().nullish() })])
    .nullish(),
  time: z.record(z.string(), z.string()).nullish(),
  "dist-tags": z.record(z.string(), z.string()).nullish(),
  versions: z.record(z.string(), versionSchema).nullish(),
});

const downloadsRangeSchema = z.object({
  start: z.string().nullish(),
  end: z.string().nullish(),
  downloads: z
    .array(
      z.object({
        day: z.string().nullish(),
        downloads: z.number().nullish(),
      }),
    )
    .nullish(),
});

const latestManifestSchema = versionSchema.extend({
  name: z.string().min(1),
  version: z.string().min(1),
  description: z.string().nullish(),
  homepage: z.string().nullish(),
  maintainers: z
    .array(
      z.object({
        name: z.string(),
        email: z.string().nullish(),
      }),
    )
    .nullish(),
  repository: z
    .union([z.string(), z.object({ url: z.string().nullish() })])
    .nullish(),
});

type LatestManifest = z.infer<typeof latestManifestSchema>;

type Packument = z.infer<typeof packumentSchema>;

function normalizeLicense(
  value:
    | string
    | { type?: string | null }
    | null
    | undefined,
): string | undefined {
  if (!value) return undefined;
  if (typeof value === "string") return value.trim() || undefined;
  return value.type?.trim() || undefined;
}

function normalizeRepository(
  value: string | { url?: string | null } | null | undefined,
): { url?: string } | undefined {
  if (!value) return undefined;

  const url =
    typeof value === "string" ? value : (value.url ?? undefined);

  if (!url) return undefined;

  return {
    url: url.replace(/^git\+/, "").replace(/\.git$/, ""),
  };
}

function buildRecentVersions(
  time: Record<string, string> | null | undefined,
  distTags: Record<string, string> | null | undefined,
): RecentVersion[] {
  return Object.entries(time ?? {})
    .filter(([version]) => version !== "created" && version !== "modified")
    .map(([version, publishedAt]) => ({
      version,
      publishedAt,
      timestamp: Date.parse(publishedAt),
    }))
    .filter((entry) => Number.isFinite(entry.timestamp))
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 10)
    .map((entry) => ({
      version: entry.version,
      publishedAt: entry.publishedAt,
      tag: Object.entries(distTags ?? {}).find(
        ([, taggedVersion]) => taggedVersion === entry.version,
      )?.[0],
    }));
}

function buildLatestVersionInfo(
  data: z.infer<typeof versionSchema> | undefined,
): LatestVersionInfo | undefined {
  if (!data) return undefined;

  return {
    license: normalizeLicense(data.license),
    dependencies: data.dependencies ?? {},
    dist: data.dist
      ? {
          unpackedSize: data.dist.unpackedSize ?? undefined,
          files: data.dist.fileCount ?? undefined,
        }
      : undefined,
    engines: data.engines
      ? { node: data.engines.node ?? undefined }
      : undefined,
    keywords: data.keywords ?? [],
    type: data.type ?? undefined,
    types: data.types ?? data.typings ?? undefined,
    main: data.main ?? undefined,
    module: data.module ?? undefined,
    exports: data.exports ?? undefined,
  };
}

function buildDownloadTrend(
  downloads: z.infer<typeof downloadsRangeSchema> | null,
): DownloadPoint[] {
  return (downloads?.downloads ?? []).flatMap((entry) =>
    entry.day ? [{ day: entry.day, downloads: entry.downloads ?? 0 }] : [],
  );
}

async function fetchPackument(name: string): Promise<Packument | null> {
  const result = await fetchRegistryJson(
    `${REGISTRY_BASE}/${encodeURIComponent(name)}`,
    {
      packageName: name,
      resource: "package",
      revalidate: REGISTRY_REVALIDATE_SECONDS,
    },
  );

  if (result.kind === "not-found") return null;

  const parsed = packumentSchema.safeParse(result.json);

  if (!parsed.success) {
    throw new RegistryError("Unexpected package response from the registry", {
      packageName: name,
    });
  }

  return parsed.data;
}

async function fetchDownloads(
  name: string,
): Promise<z.infer<typeof downloadsRangeSchema> | null> {
  const startedAt = Date.now();

  try {
    const result = await fetchRegistryJson(
      `${DOWNLOADS_BASE}/downloads/range/last-month/${encodeURIComponent(name)}`,
      {
        packageName: name,
        resource: "downloads",
        revalidate: REGISTRY_REVALIDATE_SECONDS,
      },
    );

    if (result.kind === "not-found") return null;

    const parsed = downloadsRangeSchema.safeParse(result.json);
    return parsed.success ? parsed.data : null;
  } catch (error) {
    console.warn("Download stats unavailable.", {
      packageName: name,
      durationMs: Date.now() - startedAt,
      status: error instanceof RegistryError ? error.status : undefined,
      error,
    });
    return null;
  }
}

async function fetchManifest(
  name: string,
  selector: string,
): Promise<LatestManifest | null> {
  const result = await fetchRegistryJson(
    `${REGISTRY_BASE}/${encodeURIComponent(name)}/${encodeURIComponent(selector)}`,
    {
      packageName: name,
      resource: "manifest",
      revalidate: REGISTRY_REVALIDATE_SECONDS,
    },
  );

  if (result.kind === "not-found") return null;

  const parsed = latestManifestSchema.safeParse(result.json);

  if (!parsed.success) {
    throw new RegistryError("Unexpected package response from the registry", {
      packageName: name,
    });
  }

  return parsed.data;
}

function buildDownloadSummary(
  downloads: z.infer<typeof downloadsRangeSchema> | null,
) {
  const downloadTrend = buildDownloadTrend(downloads);

  return {
    downloadTrend,
    weeklyDownloads:
      downloadTrend
        .slice(-7)
        .reduce((sum, entry) => sum + entry.downloads, 0) || undefined,
    monthlyDownloads:
      downloadTrend.reduce((sum, entry) => sum + entry.downloads, 0) ||
      undefined,
    downloadRange: downloads
      ? {
          start: downloads.start ?? undefined,
          end: downloads.end ?? undefined,
        }
      : undefined,
  };
}

function buildOverview(
  manifest: LatestManifest,
  downloads: z.infer<typeof downloadsRangeSchema> | null,
): PackageOverview {
  return {
    name: manifest.name,
    description: manifest.description?.trim() || undefined,
    license: normalizeLicense(manifest.license),
    homepage: manifest.homepage ?? undefined,
    keywords: manifest.keywords ?? [],
    maintainers: (manifest.maintainers ?? []).map((maintainer) => ({
      name: maintainer.name,
      email: maintainer.email ?? undefined,
    })),
    repository: normalizeRepository(manifest.repository),
    latestVersion: manifest.version,
    latestVersionInfo: buildLatestVersionInfo(manifest),
    ...buildDownloadSummary(downloads),
  };
}

async function refreshOverview(
  normalized: string,
  cacheKey: string,
  selector: string,
): Promise<PackageOverview | null> {
  const [manifest, downloads] = await Promise.all([
    fetchManifest(normalized, selector),
    fetchDownloads(normalized),
  ]);

  if (!manifest) {
    await cacheSet(cacheKey, null, CACHE_NEGATIVE_TTL);
    return null;
  }

  const data = buildOverview(manifest, downloads);

  await cacheSet(cacheKey, data, CACHE_HARD_TTL.overview);

  return data;
}

export type LoadOptions = {
  /**
   * Used by ISR regeneration: refresh the soft-stale entry before rendering
   * instead of serving it and refreshing after the response. Falls back to the
   * cached value if the refresh fails, so output never depends on the registry.
   */
  fresh?: boolean;
};

async function refreshOrReuse<T>(
  key: string,
  task: () => Promise<T>,
  fallback: T,
): Promise<T> {
  const startedAt = Date.now();

  try {
    return await task();
  } catch (error) {
    console.warn("Revalidation refresh failed; serving the cached value.", {
      key,
      durationMs: Date.now() - startedAt,
      status: error instanceof RegistryError ? error.status : undefined,
      error,
    });

    return fallback;
  }
}

export async function getPackageOverview(
  name: string,
  options: LoadOptions = {},
): Promise<PackageOverview | null> {
  const normalized = normalizePackageName(name);

  if (!isValidPackageName(normalized)) {
    return null;
  }

  const cacheKey = overviewCacheKey(normalized);

  return coalesce(cacheKey, async () => {
    const entry = await cacheGetEntry<PackageOverview | null>(cacheKey);

    if (entry && !isExpired(entry, CACHE_HARD_TTL.overview)) {
      if (entry.data === null) return null;

      const softTtl = options.fresh
        ? revalidationSafeWindow(CACHE_FRESH_TTL.overview)
        : CACHE_FRESH_TTL.overview;

      if (!isFresh(entry, softTtl)) {
        const refresh = () => refreshOverview(normalized, cacheKey, "latest");

        if (options.fresh) {
          return refreshOrReuse(cacheKey, refresh, entry.data);
        }

        runInBackground(cacheKey, refresh);
      }

      return entry.data;
    }

    return refreshOverview(normalized, cacheKey, "latest");
  });
}

const VERSION_PATTERN = /^[0-9a-z][0-9a-z._+-]*$/i;

export function isValidVersion(version: string): boolean {
  return VERSION_PATTERN.test(version);
}

export async function getPackageVersionOverview(
  name: string,
  version: string,
  options: LoadOptions = {},
): Promise<PackageOverview | null> {
  const normalized = normalizePackageName(name);
  const selector = version.trim();

  if (!isValidPackageName(normalized) || !isValidVersion(selector)) {
    return null;
  }

  const cacheKey = versionOverviewCacheKey(normalized, selector);

  return coalesce(cacheKey, async () => {
    const entry = await cacheGetEntry<PackageOverview | null>(cacheKey);

    if (entry && !isExpired(entry, CACHE_HARD_TTL.overview)) {
      if (entry.data === null) return null;

      const softTtl = options.fresh
        ? revalidationSafeWindow(CACHE_FRESH_TTL.overview)
        : CACHE_FRESH_TTL.overview;

      if (!isFresh(entry, softTtl)) {
        const refresh = () =>
          refreshOverview(normalized, cacheKey, selector);

        if (options.fresh) {
          return refreshOrReuse(cacheKey, refresh, entry.data);
        }

        runInBackground(cacheKey, refresh);
      }

      return entry.data;
    }

    return refreshOverview(normalized, cacheKey, selector);
  });
}

export async function getDownloadTrend(
  name: string,
): Promise<DownloadPoint[]> {
  const normalized = normalizePackageName(name);

  if (!isValidPackageName(normalized)) {
    return [];
  }

  const cacheKey = downloadsCacheKey(normalized);
  const entry = await cacheGetEntry<DownloadPoint[]>(cacheKey);

  if (entry && !isExpired(entry, CACHE_HARD_TTL.downloads)) {
    if (!isFresh(entry, CACHE_FRESH_TTL.downloads)) {
      runInBackground(cacheKey, async () => {
        const downloads = await fetchDownloads(normalized);
        const points = buildDownloadTrend(downloads);
        if (points.length > 0) {
          await cacheSet(cacheKey, points, CACHE_HARD_TTL.downloads);
        }
      });
    }

    return entry.data;
  }

  const downloads = await fetchDownloads(normalized);
  const points = buildDownloadTrend(downloads);

  if (points.length > 0) {
    await cacheSet(cacheKey, points, CACHE_HARD_TTL.downloads);
  }

  return points;
}

async function refreshPackage(
  normalized: string,
  cacheKey: string,
): Promise<PackageDetail | null> {
  const [packument, downloads] = await Promise.all([
    fetchPackument(normalized),
    fetchDownloads(normalized),
  ]);

  if (!packument) {
    await cacheSet(cacheKey, null, CACHE_NEGATIVE_TTL);
    return null;
  }

  const latestVersion = packument["dist-tags"]?.latest ?? "";
  const latestVersionData = latestVersion
    ? packument.versions?.[latestVersion]
    : undefined;
  const rawReadme = packument.readme?.trim();
  const readmeTruncated = Boolean(
    rawReadme && rawReadme.length > README_LIMIT,
  );
  const repository = normalizeRepository(packument.repository);
  const github = await getGithubStats(repository?.url);

  const data: PackageDetail = {
    name: packument.name,
    description: packument.description?.trim() || undefined,
    readme:
      rawReadme && readmeTruncated
        ? rawReadme.slice(0, README_LIMIT)
        : rawReadme,
    readmeTruncated,
    license:
      normalizeLicense(latestVersionData?.license) ??
      normalizeLicense(packument.license),
    homepage: packument.homepage ?? undefined,
    keywords: latestVersionData?.keywords ?? packument.keywords ?? [],
    maintainers: (packument.maintainers ?? []).map((maintainer) => ({
      name: maintainer.name,
      email: maintainer.email ?? undefined,
    })),
    repository,
    latestVersion: latestVersion || "Unknown",
    latestVersionInfo: buildLatestVersionInfo(latestVersionData),
    recentVersions: buildRecentVersions(
      packument.time,
      packument["dist-tags"],
    ),
    ...buildDownloadSummary(downloads),
    publishedAt: latestVersion
      ? packument.time?.[latestVersion]
      : undefined,
    github: github ?? undefined,
  };

  await cacheSet(cacheKey, data, CACHE_HARD_TTL.package);

  return data;
}

export async function getPackage(
  name: string,
  options: LoadOptions = {},
): Promise<PackageDetail | null> {
  const normalized = normalizePackageName(name);

  if (!isValidPackageName(normalized)) {
    return null;
  }

  const cacheKey = packageCacheKey(normalized);

  return coalesce(cacheKey, async () => {
    const entry = await cacheGetEntry<PackageDetail | null>(cacheKey);

    if (entry && !isExpired(entry, CACHE_HARD_TTL.package)) {
      if (entry.data === null) return null;

      const softTtl = options.fresh
        ? revalidationSafeWindow(CACHE_FRESH_TTL.package)
        : CACHE_FRESH_TTL.package;

      if (!isFresh(entry, softTtl)) {
        const refresh = () => refreshPackage(normalized, cacheKey);

        if (options.fresh) {
          return refreshOrReuse(cacheKey, refresh, entry.data);
        }

        runInBackground(cacheKey, refresh);
      }

      return entry.data;
    }

    return refreshPackage(normalized, cacheKey);
  });
}
