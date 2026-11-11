import { getRedis } from "./redis";

export const CACHE_VERSION = "v1";

export const CACHE_FRESH_TTL = {
  search: 60,
  package: 300,
  downloads: 300,
  github: 86_400,
  analytics: 3_600,
} as const;

export const CACHE_HARD_TTL = {
  search: 3_600,
  package: 86_400,
  downloads: 86_400,
  github: 604_800,
  analytics: 86_400,
} as const;

/** Backwards-compatible alias for the fresh window. */
export const CACHE_TTL = CACHE_FRESH_TTL;

export type CacheEntry<T> = {
  data: T;
  cachedAt: number;
};

const CACHE_TIMEOUT_MS = 1_500;
const FAILURE_COOLDOWN_MS = 30_000;

let unavailableUntil = 0;
let warned = false;

export function normalizeSearchInput(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase().slice(0, 200);
}

export function normalizePackageInput(value: string): string {
  return value.trim().toLowerCase();
}

export const DEFAULT_SEARCH_PAGE_SIZE = 20;

export function searchCacheKey(
  query: string,
  from = 0,
  size = DEFAULT_SEARCH_PAGE_SIZE,
): string {
  const base = `${CACHE_VERSION}:search:${normalizeSearchInput(query)}`;
  return from === 0 && size === DEFAULT_SEARCH_PAGE_SIZE
    ? base
    : `${base}:${from}:${size}`;
}

export function packageCacheKey(name: string): string {
  return `${CACHE_VERSION}:package:${normalizePackageInput(name)}`;
}

export function downloadsCacheKey(name: string): string {
  return `${CACHE_VERSION}:downloads:${normalizePackageInput(name)}`;
}

export function analyticsCacheKey(name: string): string {
  return `${CACHE_VERSION}:analytics:${normalizePackageInput(name)}`;
}

export function githubCacheKey(owner: string, repo: string): string {
  return `${CACHE_VERSION}:github:${owner.toLowerCase()}/${repo.toLowerCase()}`;
}

function markUnavailable(error: unknown) {
  unavailableUntil = Date.now() + FAILURE_COOLDOWN_MS;
  if (warned) return;
  warned = true;
  console.warn("Cache unavailable; continuing without it.", error);
}

function isAvailable(): boolean {
  return Date.now() >= unavailableUntil;
}

function resolveClient() {
  try {
    return getRedis();
  } catch (error) {
    markUnavailable(error);
    return null;
  }
}

async function withTimeout<T>(operation: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("Cache operation timed out")),
          CACHE_TIMEOUT_MS,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function isCacheEntry<T>(value: unknown): value is CacheEntry<T> {
  return (
    typeof value === "object" &&
    value !== null &&
    "data" in value &&
    "cachedAt" in value &&
    typeof (value as CacheEntry<T>).cachedAt === "number"
  );
}

export function isFresh(
  entry: CacheEntry<unknown>,
  freshSeconds: number,
): boolean {
  return Date.now() - entry.cachedAt < freshSeconds * 1_000;
}

export function isExpired(
  entry: CacheEntry<unknown>,
  hardSeconds: number,
): boolean {
  return Date.now() - entry.cachedAt >= hardSeconds * 1_000;
}

/**
 * Cache failures are intentionally silent to callers: a missing or broken
 * Redis must degrade to a normal upstream request, never an error page.
 */
export async function cacheGetEntry<T>(
  key: string,
): Promise<CacheEntry<T> | null> {
  const redis = resolveClient();
  if (!redis || !isAvailable()) return null;

  let raw: unknown;

  try {
    raw = await withTimeout(redis.get<unknown>(key));
  } catch (error) {
    markUnavailable(error);
    return null;
  }

  if (raw === null || raw === undefined) return null;

  let parsed: unknown = raw;

  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      console.warn("Ignoring malformed cache entry.", { key });
      return null;
    }
  }

  return isCacheEntry<T>(parsed) ? parsed : null;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const entry = await cacheGetEntry<T>(key);
  return entry ? entry.data : null;
}

export async function cacheSet<T>(
  key: string,
  data: T,
  ttlSeconds: number,
): Promise<void> {
  const redis = resolveClient();
  if (!redis || !isAvailable()) return;

  const entry: CacheEntry<T> = { data, cachedAt: Date.now() };

  try {
    await withTimeout(redis.set(key, entry, { ex: ttlSeconds }));
  } catch (error) {
    markUnavailable(error);
  }
}

export async function cacheDelete(key: string): Promise<void> {
  const redis = resolveClient();
  if (!redis || !isAvailable()) return;

  try {
    await withTimeout(redis.del(key));
  } catch (error) {
    markUnavailable(error);
  }
}
