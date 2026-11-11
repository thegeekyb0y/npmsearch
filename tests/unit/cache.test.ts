import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CACHE_TTL,
  CACHE_VERSION,
  downloadsCacheKey,
  githubCacheKey,
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
