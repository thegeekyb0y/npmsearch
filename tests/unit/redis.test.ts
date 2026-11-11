import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("getRedis", () => {
  it("returns null when Redis is not configured", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");

    const { getRedis } = await import("../../app/lib/redis");
    expect(getRedis()).toBeNull();
  });

  it("creates a client when both values are present", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "token");

    const { getRedis } = await import("../../app/lib/redis");
    expect(getRedis()).not.toBeNull();
  });
});
