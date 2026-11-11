import { z } from "zod";
import {
  CACHE_FRESH_TTL,
  CACHE_HARD_TTL,
  DEFAULT_SEARCH_PAGE_SIZE,
  cacheDelete,
  cacheGetEntry,
  cacheSet,
  isExpired,
  isFresh,
  packageCacheKey,
  searchCacheKey,
} from "./cache";
import { runInBackground } from "./background";
import { getGithubStats } from "./github";
import type {
  DownloadPoint,
  LatestVersionInfo,
  PackageDetail,
  PackageSummary,
  RecentVersion,
  SearchResults,
} from "./types";

const REGISTRY_BASE = "https://registry.npmjs.org";
const DOWNLOADS_BASE = "https://api.npmjs.org";
const REQUEST_TIMEOUT_MS = 8_000;

export const MAX_SEARCH_PAGE_SIZE = 50;
export const MAX_SEARCH_FROM = 1_000;
export const README_LIMIT = 256_000;

const PACKAGE_NAME_PATTERN =
  /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;

export class RegistryError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "RegistryError";
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
  return query.trim().replace(/\s+/g, " ").toLowerCase().slice(0, 200);
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
  return PACKAGE_NAME_PATTERN.test(name);
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
  let response: Response;

  try {
    response = await fetch(buildSearchUrl(normalized, from, size), {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: "no-store",
    });
  } catch {
    throw new RegistryError("Unable to reach the npm registry");
  }

  if (!response.ok) {
    throw new RegistryError(
      `Registry search failed with status ${response.status}`,
      response.status,
    );
  }

  let json: unknown;

  try {
    json = await response.json();
  } catch {
    throw new RegistryError("Registry returned invalid JSON");
  }

  const parsed = searchResponseSchema.safeParse(json);

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

  if (!normalized) {
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
  dist: z.object({ unpackedSize: z.number().nullish() }).nullish(),
  engines: z.object({ node: z.string().nullish() }).nullish(),
  keywords: z.array(z.string()).nullish(),
  type: z.string().nullish(),
  main: z.string().nullish(),
  module: z.string().nullish(),
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
      ? { unpackedSize: data.dist.unpackedSize ?? undefined }
      : undefined,
    engines: data.engines
      ? { node: data.engines.node ?? undefined }
      : undefined,
    keywords: data.keywords ?? [],
    type: data.type ?? undefined,
    types: data.types ?? data.typings ?? undefined,
    main: data.main ?? undefined,
    module: data.module ?? undefined,
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
  let response: Response;

  try {
    response = await fetch(`${REGISTRY_BASE}/${encodeURIComponent(name)}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: "no-store",
    });
  } catch {
    throw new RegistryError("Unable to reach the npm registry");
  }

  if (response.status === 404) return null;

  if (!response.ok) {
    throw new RegistryError(
      `Registry package request failed with status ${response.status}`,
      response.status,
    );
  }

  let json: unknown;

  try {
    json = await response.json();
  } catch {
    throw new RegistryError("Registry returned invalid JSON");
  }

  const parsed = packumentSchema.safeParse(json);

  if (!parsed.success) {
    throw new RegistryError("Unexpected package response from the registry");
  }

  return parsed.data;
}

async function fetchDownloads(
  name: string,
): Promise<z.infer<typeof downloadsRangeSchema> | null> {
  try {
    const response = await fetch(
      `${DOWNLOADS_BASE}/downloads/range/last-week/${encodeURIComponent(name)}`,
      {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        cache: "no-store",
      },
    );

    if (!response.ok) return null;

    const parsed = downloadsRangeSchema.safeParse(await response.json());
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
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
    await cacheDelete(cacheKey);
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
  const downloadTrend = buildDownloadTrend(downloads);
  const weeklyDownloads =
    downloadTrend.reduce((sum, entry) => sum + entry.downloads, 0) ||
    undefined;
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
    weeklyDownloads,
    downloadTrend,
    downloadRange: downloads
      ? { start: downloads.start ?? undefined, end: downloads.end ?? undefined }
      : undefined,
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
): Promise<PackageDetail | null> {
  const normalized = normalizePackageName(name);

  if (!isValidPackageName(normalized)) {
    return null;
  }

  const cacheKey = packageCacheKey(normalized);
  const entry = await cacheGetEntry<PackageDetail>(cacheKey);

  if (entry && !isExpired(entry, CACHE_HARD_TTL.package)) {
    if (!isFresh(entry, CACHE_FRESH_TTL.package)) {
      runInBackground(cacheKey, async () => {
        await refreshPackage(normalized, cacheKey);
      });
    }

    return entry.data;
  }

  return refreshPackage(normalized, cacheKey);
}
