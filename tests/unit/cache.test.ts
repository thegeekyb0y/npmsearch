import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CACHE_FRESH_TTL,
  CACHE_HARD_TTL,
  CACHE_NEGATIVE_TTL,
  CACHE_TTL,
  CACHE_VERSION,
  downloadsCacheKey,
  githubCacheKey,
  isExpired,
  isFresh,
  packageCacheKey,
  searchCacheKey,
} from "../../app/lib/cache";

const get = vi.fn();
const set = vi.fn();
const del = vi.fn();

beforeEach(() => {
  vi.resetModules();
  get.mockReset();
  set.mockReset();
  del.mockReset();
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.doUnmock("../../app/lib/redis");
  vi.resetModules();
  vi.restoreAllMocks();
});

async function loadCache(client: unknown) {
  vi.doMock("../../app/lib/redis", () => ({
    getRedis: () => client,
  }));
  return import("../../app/lib/cache");
}

describe("cache keys", () => {
  it("normalizes search input", () => {
    expect(searchCacheKey("  React   Hooks  ")).toBe(`${CACHE_VERSION}:search:react hooks`);
  });

  it("truncates very long search input", () => {
    const key = searchCacheKey("a".repeat(500));
    expect(key.endsWith("a".repeat(200))).toBe(true);
  });

  it("includes pagination only when it differs from the default page", () => {
    expect(searchCacheKey("react")).toBe(`${CACHE_VERSION}:search:react`);
    expect(searchCacheKey("react", 40, 20)).toBe(
      `${CACHE_VERSION}:search:react:40:20`,
    );
  });

  it("normalizes package names and keeps scopes", () => {
    expect(packageCacheKey("  @Scope/Name ")).toBe(`${CACHE_VERSION}:package:@scope/name`);
    expect(downloadsCacheKey("React")).toBe(`${CACHE_VERSION}:downloads:react`);
  });

  it("normalizes GitHub owners and repositories", () => {
    expect(githubCacheKey("Vercel", "Next.js")).toBe(`${CACHE_VERSION}:github:vercel/next.js`);
  });
});

describe("cacheGetEntry", () => {
  it("returns the full entry with its timestamp", async () => {
    get.mockResolvedValue({ data: { total: 2 }, cachedAt: 1234 });
    const { cacheGetEntry } = await loadCache({ get, set, del });

    await expect(cacheGetEntry("key")).resolves.toEqual({
      data: { total: 2 },
      cachedAt: 1234,
    });
  });

  it("rejects entries without a timestamp", async () => {
    get.mockResolvedValue({ data: { total: 2 } });
    const { cacheGetEntry } = await loadCache({ get, set, del });

    await expect(cacheGetEntry("key")).resolves.toBeNull();
  });

  it("returns a cached null so callers can tell it apart from a miss", async () => {
    const cachedAt = Date.now();
    get.mockResolvedValue({ data: null, cachedAt });
    const { cacheGetEntry } = await loadCache({ get, set, del });

    await expect(cacheGetEntry("key")).resolves.toEqual({ data: null, cachedAt });
    await expect(cacheGetEntry("key")).resolves.not.toBeNull();
  });
});

describe("negative caching", () => {
  it("keeps missing packages out of the registry for one minute", () => {
    expect(CACHE_NEGATIVE_TTL).toBe(60);
  });
});

describe("freshness", () => {
  it("uses the fresh window", () => {
    const now = Date.now();

    expect(isFresh({ data: null, cachedAt: now - 10_000 }, 60)).toBe(true);
    expect(isFresh({ data: null, cachedAt: now - 61_000 }, 60)).toBe(false);
    expect(CACHE_FRESH_TTL.search).toBe(60);
    expect(CACHE_HARD_TTL.search).toBeGreaterThan(CACHE_FRESH_TTL.search);
  });

  it("detects entries beyond the hard TTL", () => {
    const now = Date.now();

    expect(isExpired({ data: null, cachedAt: now - 1_000 }, 3_600)).toBe(false);
    expect(isExpired({ data: null, cachedAt: now - 3_601_000 }, 3_600)).toBe(true);
  });
});

describe("cacheGet", () => {
  it("returns cached data", async () => {
    get.mockResolvedValue({ data: { total: 2 }, cachedAt: Date.now() });
    const { cacheGet } = await loadCache({ get, set, del });

    await expect(cacheGet("key")).resolves.toEqual({ total: 2 });
    expect(get).toHaveBeenCalledWith("key");
  });

  it("parses string entries from older values", async () => {
    get.mockResolvedValue(JSON.stringify({ data: { total: 3 }, cachedAt: Date.now() }));
    const { cacheGet } = await loadCache({ get, set, del });

    await expect(cacheGet("key")).resolves.toEqual({ total: 3 });
  });

  it("ignores malformed entries without disabling the cache", async () => {
    get.mockResolvedValue("not json");
    const { cacheGet } = await loadCache({ get, set, del });

    await expect(cacheGet("key")).resolves.toBeNull();
    await expect(cacheGet("key")).resolves.toBeNull();
    expect(get).toHaveBeenCalledTimes(2);
  });

  it("returns null and backs off after a Redis failure", async () => {
    get.mockRejectedValue(new Error("redis deleted"));
    const { cacheGet } = await loadCache({ get, set, del });

    await expect(cacheGet("key")).resolves.toBeNull();
    await expect(cacheGet("key")).resolves.toBeNull();
    expect(get).toHaveBeenCalledTimes(1);
  });

  it("returns null when Redis is not configured", async () => {
    const { cacheGet } = await loadCache(null);
    await expect(cacheGet("key")).resolves.toBeNull();
    expect(get).not.toHaveBeenCalled();
  });
});

describe("cacheSet", () => {
  it("stores a timestamped entry with the requested TTL", async () => {
    set.mockResolvedValue("OK");
    const { cacheSet } = await loadCache({ get, set, del });

    await cacheSet("key", { total: 4 }, CACHE_TTL.search);

    expect(set).toHaveBeenCalledWith(
      "key",
      { data: { total: 4 }, cachedAt: expect.any(Number) },
      { ex: 60 },
    );
  });

  it("swallows write failures", async () => {
    set.mockRejectedValue(new Error("redis deleted"));
    const { cacheSet } = await loadCache({ get, set, del });

    await expect(cacheSet("key", { total: 4 }, 60)).resolves.toBeUndefined();
  });

  it("does nothing when Redis is not configured", async () => {
    const { cacheSet } = await loadCache(null);
    await cacheSet("key", { total: 4 }, 60);
    expect(set).not.toHaveBeenCalled();
  });
});

describe("cacheDelete", () => {
  it("deletes a key", async () => {
    del.mockResolvedValue(1);
    const { cacheDelete } = await loadCache({ get, set, del });

    await cacheDelete("key");
    expect(del).toHaveBeenCalledWith("key");
  });
});

describe("refresh guards", () => {
  it("allows a refresh when no failure marker exists", async () => {
    get.mockResolvedValue(null);
    const { cacheShouldRefresh } = await loadCache({ get, set, del });

    await expect(cacheShouldRefresh("v1:overview:react")).resolves.toBe(true);
    expect(get).toHaveBeenCalledWith("fail:v1:overview:react");
  });

  it("suppresses the refresh while the failure marker exists", async () => {
    get.mockResolvedValue(1);
    const { cacheShouldRefresh } = await loadCache({ get, set, del });

    await expect(cacheShouldRefresh("key")).resolves.toBe(false);
  });

  it("suppresses the refresh when Redis fails", async () => {
    get.mockRejectedValue(new Error("ERR DB capacity"));
    const { cacheShouldRefresh } = await loadCache({ get, set, del });

    await expect(cacheShouldRefresh("key")).resolves.toBe(false);
  });

  it("acquires the lock with NX and a 30 second expiry", async () => {
    set.mockResolvedValue("OK");
    const { cacheAcquireRefreshLock } = await loadCache({ get, set, del });

    await expect(cacheAcquireRefreshLock("key")).resolves.toBe(true);
    expect(set).toHaveBeenCalledWith("lock:key", 1, { nx: true, ex: 30 });
  });

  it("does not acquire a lock another refresh holds", async () => {
    set.mockResolvedValue(null);
    const { cacheAcquireRefreshLock } = await loadCache({ get, set, del });

    await expect(cacheAcquireRefreshLock("key")).resolves.toBe(false);
  });

  it("does not acquire a lock when Redis fails", async () => {
    set.mockRejectedValue(new Error("ERR DB capacity"));
    const { cacheAcquireRefreshLock } = await loadCache({ get, set, del });

    await expect(cacheAcquireRefreshLock("key")).resolves.toBe(false);
  });

  it("marks failures for at least ten minutes, longer for retry-after", async () => {
    set.mockResolvedValue("OK");
    const { cacheMarkRefreshFailure } = await loadCache({ get, set, del });

    await cacheMarkRefreshFailure("key", 900);
    expect(set).toHaveBeenCalledWith("fail:key", 1, { ex: 900 });

    await cacheMarkRefreshFailure("key", 30);
    expect(set).toHaveBeenLastCalledWith("fail:key", 1, { ex: 600 });
  });

  it("allows refreshes when Redis is not configured", async () => {
    const { cacheAcquireRefreshLock, cacheShouldRefresh } =
      await loadCache(null);

    await expect(cacheShouldRefresh("key")).resolves.toBe(true);
    await expect(cacheAcquireRefreshLock("key")).resolves.toBe(true);
  });
});
