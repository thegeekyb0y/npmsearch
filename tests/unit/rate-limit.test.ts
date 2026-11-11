import { beforeEach, describe, expect, it, vi } from "vitest";

const { getRedisMock, limitMock } = vi.hoisted(() => ({
  getRedisMock: vi.fn(),
  limitMock: vi.fn(),
}));

vi.mock("../../app/lib/redis", () => ({
  getRedis: getRedisMock,
}));

vi.mock("@upstash/ratelimit", () => {
  class Ratelimit {
    static slidingWindow = vi.fn(() => "window");
    limit = limitMock;
  }

  return { Ratelimit };
});

beforeEach(() => {
  vi.resetModules();
  getRedisMock.mockReset();
  limitMock.mockReset();
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

async function loadRateLimit() {
  return import("../../app/lib/rate-limit");
}

describe("checkRateLimit", () => {
  it("allows requests when Redis is not configured", async () => {
    getRedisMock.mockReturnValue(null);
    const { checkRateLimit } = await loadRateLimit();

    await expect(checkRateLimit("ip")).resolves.toEqual({ allowed: true });
    expect(limitMock).not.toHaveBeenCalled();
  });

  it("allows requests under the limit", async () => {
    getRedisMock.mockReturnValue({});
    limitMock.mockResolvedValue({ success: true, reset: Date.now() + 10_000 });
    const { checkRateLimit } = await loadRateLimit();

    await expect(checkRateLimit("ip")).resolves.toEqual({ allowed: true });
    expect(limitMock).toHaveBeenCalledWith("ip");
  });

  it("rejects requests over the limit with a retry window", async () => {
    getRedisMock.mockReturnValue({});
    limitMock.mockResolvedValue({ success: false, reset: Date.now() + 5_000 });
    const { checkRateLimit } = await loadRateLimit();

    const result = await checkRateLimit("ip");

    expect(result.allowed).toBe(false);
    expect(result.allowed === false && result.retryAfterSeconds).toBeGreaterThanOrEqual(1);
  });

  it("fails open and backs off when Redis errors", async () => {
    getRedisMock.mockReturnValue({});
    limitMock.mockRejectedValue(new Error("redis deleted"));
    const { checkRateLimit } = await loadRateLimit();

    await expect(checkRateLimit("ip")).resolves.toEqual({ allowed: true });
    await expect(checkRateLimit("ip")).resolves.toEqual({ allowed: true });
    expect(limitMock).toHaveBeenCalledTimes(1);
  });
});
