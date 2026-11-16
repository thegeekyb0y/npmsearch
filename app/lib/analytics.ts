import { z } from "zod";
import { runInBackground } from "./background";
import {
  PAGE_REVALIDATE_SECONDS,
  revalidationSafeWindow,
} from "./freshness";
import {
  CACHE_FRESH_TTL,
  CACHE_HARD_TTL,
  analyticsCacheKey,
  cacheGetEntry,
  cacheSet,
  isExpired,
  isFresh,
} from "./cache";
import { normalizePackageName, isValidPackageName } from "./registry";
import { coalesce } from "./in-flight";
import { isOutdated } from "./semver";
import type {
  DependencyStatus,
  LatestVersionInfo,
  ModuleFormat,
  PackageAnalytics,
} from "./types";

const REGISTRY_BASE = "https://registry.npmjs.org";
const REQUEST_TIMEOUT_MS = 3_000;
const TOTAL_BUDGET_MS = 2_000;
const MAX_PACKAGES = 60;
const MAX_DEPTH = 3;
const CONCURRENCY = 8;
const REGISTRY_REVALIDATE_SECONDS = PAGE_REVALIDATE_SECONDS;
const REGISTRY_USER_AGENT = "npmsearch/0.1 (+https://npmsearch121.vercel.app)";

const manifestSchema = z.object({
  name: z.string().min(1),
  version: z.string().nullish(),
  dependencies: z.record(z.string(), z.string()).nullish(),
  dist: z.object({ unpackedSize: z.number().nullish() }).nullish(),
  type: z.string().nullish(),
  main: z.string().nullish(),
  module: z.string().nullish(),
  types: z.string().nullish(),
  typings: z.string().nullish(),
  exports: z.unknown().nullish(),
});

type Manifest = z.infer<typeof manifestSchema>;

function hasExportCondition(value: unknown, condition: string): boolean {
  if (!value || typeof value !== "object") return false;

  if (Array.isArray(value)) {
    return value.some((entry) => hasExportCondition(entry, condition));
  }

  return Object.entries(value).some(
    ([key, nested]) =>
      key === condition || hasExportCondition(nested, condition),
  );
}

export function detectModuleFormats(info: {
  type?: string;
  main?: string;
  module?: string;
  types?: string;
  exports?: unknown;
}): ModuleFormat {
  return {
    esm:
      info.type === "module" ||
      Boolean(info.module) ||
      hasExportCondition(info.exports, "import") ||
      info.main?.endsWith(".mjs") === true,
    cjs:
      info.type !== "module" ||
      hasExportCondition(info.exports, "require") ||
      info.main?.endsWith(".cjs") === true,
    types: Boolean(info.types),
  };
}

async function fetchManifest(name: string): Promise<Manifest | null> {
  let response: Response;

  try {
    response = await fetch(
      `${REGISTRY_BASE}/${encodeURIComponent(name)}/latest`,
      {
        headers: {
          Accept: "application/json",
          "User-Agent": REGISTRY_USER_AGENT,
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        next: { revalidate: REGISTRY_REVALIDATE_SECONDS },
      },
    );
  } catch {
    return null;
  }

  if (!response.ok) return null;

  let json: unknown;

  try {
    json = await response.json();
  } catch {
    return null;
  }

  const parsed = manifestSchema.safeParse(json);
  return parsed.success ? parsed.data : null;
}

type CrawlResult = {
  bytes: number;
  packages: number;
  truncated: boolean;
  manifests: Map<string, Manifest>;
};

/**
 * Walks the dependency graph just far enough to estimate install size. The
 * budget and caps keep a single package page from fanning out into hundreds
 * of registry requests; the result is cached, so the crawl is a cold-path cost.
 */
async function crawl(
  packageName: string,
  latest: LatestVersionInfo,
): Promise<CrawlResult> {
  const manifests = new Map<string, Manifest>();
  const seen = new Set<string>([normalizePackageName(packageName)]);
  const queue: Array<{ name: string; depth: number }> = Object.keys(
    latest.dependencies,
  )    .slice(0, MAX_PACKAGES)
    .map((name) => ({ name, depth: 1 }));
  let bytes = latest.dist?.unpackedSize ?? 0;
  let packages = 1;
  let truncated = false;
  const startedAt = Date.now();

  while (queue.length > 0) {
    if (Date.now() - startedAt >= TOTAL_BUDGET_MS) {
      truncated = true;
      break;
    }

    if (packages >= MAX_PACKAGES) {
      truncated = true;
      break;
    }

    const batch = queue.splice(0, CONCURRENCY);
    const results = await Promise.all(
      batch.map(async (item) => {
        const key = normalizePackageName(item.name);

        if (seen.has(key)) {
          return { item, key, manifest: null, skipped: true };
        }

        return {
          item,
          key,
          manifest: await fetchManifest(item.name),
          skipped: false,
        };
      }),
    );

    for (const { item, key, manifest, skipped } of results) {
      if (skipped) continue;

      seen.add(key);
      if (!manifest) continue;

      manifests.set(key, manifest);
      packages += 1;
      bytes += manifest.dist?.unpackedSize ?? 0;

      if (item.depth >= MAX_DEPTH) continue;

      for (const dependency of Object.keys(manifest.dependencies ?? {})) {
        const dependencyKey = normalizePackageName(dependency);

        if (seen.has(dependencyKey)) continue;
        if (queue.some((entry) => normalizePackageName(entry.name) === dependencyKey)) {
          continue;
        }

        queue.push({ name: dependency, depth: item.depth + 1 });
      }
    }
  }

  return { bytes, packages, truncated, manifests };
}

function buildDependencies(
  dependencies: Record<string, string>,
  manifests: Map<string, Manifest>,
): DependencyStatus[] {
  return Object.entries(dependencies).map(([name, range]) => {
    const latest = manifests.get(normalizePackageName(name))?.version ?? undefined;

    return {
      name,
      range,
      latest,
      outdated: latest ? isOutdated(range, latest) : false,
    };
  });
}

async function refreshAnalytics(
  packageName: string,
  latest: LatestVersionInfo,
  cacheKey: string,
): Promise<PackageAnalytics> {
  const result = await crawl(packageName, latest);
  const dependencies = buildDependencies(latest.dependencies, result.manifests);

  const data: PackageAnalytics = {
    installSize:
      result.bytes > 0
        ? {
            bytes: result.bytes,
            packages: result.packages,
            truncated: result.truncated,
          }
        : undefined,
    dependencies,
    outdatedCount: dependencies.filter((dependency) => dependency.outdated)
      .length,
    moduleFormats: detectModuleFormats(latest),
  };

  await cacheSet(cacheKey, data, CACHE_HARD_TTL.analytics);

  return data;
}

export async function getPackageAnalytics(
  packageName: string,
  latest: LatestVersionInfo | undefined,
  options: { fresh?: boolean } = {},
): Promise<PackageAnalytics | undefined> {
  if (!latest) return undefined;

  const normalized = normalizePackageName(packageName);

  if (!isValidPackageName(normalized)) return undefined;

  const cacheKey = analyticsCacheKey(normalized);

  return coalesce(cacheKey, async () => {
    const entry = await cacheGetEntry<PackageAnalytics>(cacheKey);

    if (entry && !isExpired(entry, CACHE_HARD_TTL.analytics)) {
      const softTtl = options.fresh
        ? revalidationSafeWindow(CACHE_FRESH_TTL.analytics)
        : CACHE_FRESH_TTL.analytics;

      if (!isFresh(entry, softTtl)) {
        const refresh = () =>
          refreshAnalytics(normalized, latest, cacheKey);

        if (options.fresh) {
          try {
            return await refresh();
          } catch (error) {
            console.warn(
              "Analytics revalidation failed; serving the cached value.",
              { key: cacheKey, error },
            );
            return entry.data;
          }
        }

        runInBackground(cacheKey, refresh);
      }

      return entry.data;
    }

    return refreshAnalytics(normalized, latest, cacheKey);
  });
}
