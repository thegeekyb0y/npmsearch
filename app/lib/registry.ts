import { z } from "zod";
import {
  CACHE_TTL,
  DEFAULT_SEARCH_PAGE_SIZE,
  cacheGet,
  cacheSet,
  searchCacheKey,
} from "./cache";
import type { PackageSummary, SearchResults } from "./types";

const REGISTRY_BASE = "https://registry.npmjs.org";
const REQUEST_TIMEOUT_MS = 8_000;

export const MAX_SEARCH_PAGE_SIZE = 50;
export const MAX_SEARCH_FROM = 1_000;

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
  const cached = await cacheGet<SearchResults>(cacheKey);

  if (cached !== null) {
    return cached;
  }

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

  await cacheSet(cacheKey, data, CACHE_TTL.search);

  return data;
}
