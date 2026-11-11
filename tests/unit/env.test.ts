import { describe, expect, it } from "vitest";
import { hasRedisEnv, parseEnv } from "../../app/lib/env";

describe("parseEnv", () => {
  it("parses a complete environment", () => {
    const env = parseEnv({
      NODE_ENV: "production",
      UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
      UPSTASH_REDIS_REST_TOKEN: "redis-token",
      GITHUB_TOKEN: "github-token",
      NEXT_PUBLIC_BASE_URL: "https://npmsearch.dev",
    });

    expect(env).toEqual({
      NODE_ENV: "production",
      UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
      UPSTASH_REDIS_REST_TOKEN: "redis-token",
      GITHUB_TOKEN: "github-token",
      NEXT_PUBLIC_BASE_URL: "https://npmsearch.dev",
    });
  });

  it("treats blank optional values as absent", () => {
    const env = parseEnv({
      NODE_ENV: "test",
      UPSTASH_REDIS_REST_URL: "  ",
      UPSTASH_REDIS_REST_TOKEN: "",
      GITHUB_TOKEN: "",
      NEXT_PUBLIC_BASE_URL: "",
    });

    expect(env.UPSTASH_REDIS_REST_URL).toBeUndefined();
    expect(env.UPSTASH_REDIS_REST_TOKEN).toBeUndefined();
    expect(env.GITHUB_TOKEN).toBeUndefined();
    expect(env.NEXT_PUBLIC_BASE_URL).toBeUndefined();
  });

  it("defaults NODE_ENV to development", () => {
    expect(parseEnv({}).NODE_ENV).toBe("development");
  });

  it("trims tokens", () => {
    const env = parseEnv({
      UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
      UPSTASH_REDIS_REST_TOKEN: "  token  ",
    });

    expect(env.UPSTASH_REDIS_REST_TOKEN).toBe("token");
  });

  it("rejects an invalid Redis URL", () => {
    expect(() =>
      parseEnv({
        UPSTASH_REDIS_REST_URL: "not-a-url",
        UPSTASH_REDIS_REST_TOKEN: "token",
      }),
    ).toThrow(/UPSTASH_REDIS_REST_URL/);
  });

  it("rejects an invalid NODE_ENV", () => {
    expect(() => parseEnv({ NODE_ENV: "staging" })).toThrow(/NODE_ENV/);
  });

  it("does not mutate the source object", () => {
    const source = {
      NODE_ENV: "test",
      UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
    };
    parseEnv(source);
    expect(source).toEqual({
      NODE_ENV: "test",
      UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
    });
  });
});

describe("hasRedisEnv", () => {
  it("requires both URL and token", () => {
    expect(
      hasRedisEnv(
        parseEnv({
          UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
          UPSTASH_REDIS_REST_TOKEN: "token",
        }),
      ),
    ).toBe(true);

    expect(
      hasRedisEnv(
        parseEnv({
          UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
        }),
      ),
    ).toBe(false);

    expect(hasRedisEnv(parseEnv({}))).toBe(false);
  });
});
