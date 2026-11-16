import { getRedis } from "./redis";

export const CACHE_VERSION = "v1";

export const CACHE_FRESH_TTL = {
  search: 60,
  package: 300,
  overview: 300,
  downloads: 300,
  github: 86_400,
  analytics: 3_600,
  readme: 86_400,
  profile: 3_600,
} as const;

export const CACHE_HARD_TTL = {
  search: 3_600,
  package: 86_400,
  overview: 86_400,
  downloads: 86_400,
  github: 604_800,
  analytics: 86_400,
  readme: 604_800,
  profile: 86_400,
} as const;

/** Missing or invalid packages are cached briefly so crawlers cannot storm the registry. */
export const CACHE_NEGATIVE_TTL = 60;

/** Only one refresh runs per key, across instances. */
export const REFRESH_LOCK_TTL_SECONDS = 30;

/** A failed refresh suppresses retries for ten minutes (or longer for `retry-after`). */
export const REFRESH_FAILURE_TTL_SECONDS = 600;

/** Backwards-compatible alias for the fresh window. */
export const CACHE_TTL = CACHE_FRESH_TTL;

export type CacheEntry<T> = {
  data: T;
  cachedAt: number;
};

type CacheFailureContext = {
  operation: string;
  key?: string;
  durationMs?: number;
};

const CACHE_TIMEOUT_MS = 1_500;
const FAILURE_COOLDOWN_MS = 30_000;

let unavailableUntil = 0;
let loggedFailure = false;

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

export function overviewCacheKey(name: string): string {
  return `${CACHE_VERSION}:overview:${normalizePackageInput(name)}`;
}

export function versionOverviewCacheKey(
  name: string,
  version: string,
): string {
  return `${CACHE_VERSION}:overview:${normalizePackageInput(name)}@${version.toLowerCase()}`;
}

export function readmeCacheKey(name: string, version: string): string {
  return `${CACHE_VERSION}:readme:${normalizePackageInput(name)}@${version.toLowerCase()}`;
}

export function profileTrendCacheKey(name: string): string {
  return `${CACHE_VERSION}:profile-trend:${normalizePackageInput(name)}`;
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

export function refreshLockKey(key: string): string {
  return `lock:${key}`;
}

export function refreshFailureKey(key: string): string {
  return `fail:${key}`;
}

function markUnavailable(error: unknown, context: CacheFailureContext) {
  const now = Date.now();
  const isNewEpisode = now >= unavailableUntil;

  unavailableUntil = now + FAILURE_COOLDOWN_MS;

  // Log one structured failure per cooldown window instead of every request.
  if (loggedFailure && !isNewEpisode) return;
  loggedFailure = true;

  console.warn("Cache unavailable; continuing without it.", {
    operation: context.operation,
    key: context.key,
    durationMs: context.durationMs,
    error,
  });
}

function isAvailable(): boolean {
  return Date.now() >= unavailableUntil;
}

function resolveClient() {
  try {
    return getRedis();
  } catch (error) {
    markUnavailable(error, { operation: "client" });
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
 *
 * A stored `{ data: null }` entry is a real negative result, so callers can
 * tell "cached miss" (`entry.data === null`) from "no entry" (`entry === null`).
 */
export async function cacheGetEntry<T>(
  key: string,
): Promise<CacheEntry<T> | null> {
  const redis = resolveClient();
  if (!redis || !isAvailable()) return null;

  const startedAt = Date.now();
  let raw: unknown;

  try {
    raw = await withTimeout(redis.get<unknown>(key));
  } catch (error) {
    markUnavailable(error, {
      operation: "get",
      key,
      durationMs: Date.now() - startedAt,
    });
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
  const startedAt = Date.now();

  try {
    await withTimeout(redis.set(key, entry, { ex: ttlSeconds }));
  } catch (error) {
    markUnavailable(error, {
      operation: "set",
      key,
      durationMs: Date.now() - startedAt,
    });
  }
}

export async function cacheDelete(key: string): Promise<void> {
  const redis = resolveClient();
  if (!redis || !isAvailable()) return;

  const startedAt = Date.now();

  try {
    await withTimeout(redis.del(key));
  } catch (error) {
    markUnavailable(error, {
      operation: "del",
      key,
      durationMs: Date.now() - startedAt,
    });
  }
}

/**
 * Returns false when a refresh must not run: either the key is cooling down
 * after a failure, or Redis is configured but failing. Redis being absent
 * means nothing is cached, so refreshes are allowed.
 */
export async function cacheShouldRefresh(key: string): Promise<boolean> {
  if (!isAvailable()) return false;

  const redis = resolveClient();
  if (!redis) return true;

  const startedAt = Date.now();

  try {
    const marker = await withTimeout(redis.get(refreshFailureKey(key)));
    return marker === null || marker === undefined;
  } catch (error) {
    markUnavailable(error, {
      operation: "refresh-marker",
      key,
      durationMs: Date.now() - startedAt,
    });
    return false;
  }
}

/**
 * `SET lock:<key> 1 NX EX 30`: only one instance refreshes a key at a time.
 * Returns false when another refresh holds the lock or Redis cannot confirm it.
 */
export async function cacheAcquireRefreshLock(key: string): Promise<boolean> {
  if (!isAvailable()) return false;

  const redis = resolveClient();
  if (!redis) return true;

  const startedAt = Date.now();

  try {
    const result = await withTimeout(
      redis.set(refreshLockKey(key), 1, {
        nx: true,
        ex: REFRESH_LOCK_TTL_SECONDS,
      }),
    );
    return result === "OK";
  } catch (error) {
    markUnavailable(error, {
      operation: "refresh-lock",
      key,
      durationMs: Date.now() - startedAt,
    });
    return false;
  }
}

export async function cacheReleaseRefreshLock(key: string): Promise<void> {
  const redis = resolveClient();
  if (!redis || !isAvailable()) return;

  try {
    await withTimeout(redis.del(refreshLockKey(key)));
  } catch (error) {
    markUnavailable(error, { operation: "refresh-unlock", key });
  }
}

export async function cacheMarkRefreshFailure(
  key: string,
  ttlSeconds: number = REFRESH_FAILURE_TTL_SECONDS,
): Promise<void> {
  const redis = resolveClient();
  if (!redis || !isAvailable()) return;

  const ttl = Math.max(REFRESH_FAILURE_TTL_SECONDS, Math.ceil(ttlSeconds));

  try {
    await withTimeout(redis.set(refreshFailureKey(key), 1, { ex: ttl }));
  } catch (error) {
    markUnavailable(error, { operation: "refresh-failure", key });
  }
}

export async function cacheClearRefreshFailure(key: string): Promise<void> {
  const redis = resolveClient();
  if (!redis || !isAvailable()) return;

  try {
    await withTimeout(redis.del(refreshFailureKey(key)));
  } catch (error) {
    markUnavailable(error, { operation: "refresh-recover", key });
  }
}
