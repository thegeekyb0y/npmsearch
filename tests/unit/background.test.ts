import { beforeEach, describe, expect, it, vi } from "vitest";

const { afterMock, callbacks, guards } = vi.hoisted(() => ({
  callbacks: [] as Array<() => Promise<void>>,
  afterMock: vi.fn((callback: () => Promise<void>) => {
    callbacks.push(callback);
  }),
  guards: {
    should: vi.fn(),
    acquire: vi.fn(),
    release: vi.fn(),
    markFailure: vi.fn(),
    clearFailure: vi.fn(),
  },
}));

vi.mock("next/server", () => ({
  after: afterMock,
}));

vi.mock("../../app/lib/cache", () => ({
  REFRESH_FAILURE_TTL_SECONDS: 600,
  cacheShouldRefresh: guards.should,
  cacheAcquireRefreshLock: guards.acquire,
  cacheReleaseRefreshLock: guards.release,
  cacheMarkRefreshFailure: guards.markFailure,
  cacheClearRefreshFailure: guards.clearFailure,
}));

beforeEach(() => {
  vi.resetModules();
  callbacks.length = 0;
  afterMock.mockClear();
  guards.should.mockReset().mockResolvedValue(true);
  guards.acquire.mockReset().mockResolvedValue(true);
  guards.release.mockReset().mockResolvedValue(undefined);
  guards.markFailure.mockReset().mockResolvedValue(undefined);
  guards.clearFailure.mockReset().mockResolvedValue(undefined);
});

async function loadBackground() {
  return import("../../app/lib/background");
}

describe("runInBackground", () => {
  it("dedupes concurrent refreshes for the same key", async () => {
    const { runInBackground } = await loadBackground();
    const task = vi.fn(async () => {});

    runInBackground("key", task);
    runInBackground("key", task);

    expect(callbacks).toHaveLength(1);

    await callbacks[0]();

    expect(task).toHaveBeenCalledTimes(1);
    expect(guards.acquire).toHaveBeenCalledTimes(1);

    runInBackground("key", task);
    await callbacks[1]();

    expect(task).toHaveBeenCalledTimes(2);
  });

  it("logs refresh failures with structured context and records a failure marker", async () => {
    const { runInBackground } = await loadBackground();
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const task = vi.fn(async () => {
      throw Object.assign(new Error("upstream down"), {
        status: 502,
        retryAfterSeconds: 900,
      });
    });

    runInBackground("key", task);
    await callbacks[0]();

    expect(errorSpy).toHaveBeenCalledWith(
      "Background refresh failed.",
      expect.objectContaining({
        key: "key",
        status: 502,
        retryAfterSeconds: 900,
      }),
    );
    expect(guards.markFailure).toHaveBeenCalledWith("key", 900);
    expect(guards.release).toHaveBeenCalledWith("key");
    expect(guards.clearFailure).not.toHaveBeenCalled();

    errorSpy.mockRestore();
  });

  it("uses the default ten minute cooldown without a retry-after", async () => {
    const { runInBackground } = await loadBackground();
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    runInBackground("key", async () => {
      throw new Error("upstream down");
    });
    await callbacks[0]();

    expect(guards.markFailure).toHaveBeenCalledWith("key", undefined);

    errorSpy.mockRestore();
  });

  it("does not refresh while a failure marker is active", async () => {
    const { runInBackground } = await loadBackground();
    guards.should.mockResolvedValue(false);
    const task = vi.fn(async () => {});

    runInBackground("key", task);
    await callbacks[0]();

    expect(task).not.toHaveBeenCalled();
    expect(guards.acquire).not.toHaveBeenCalled();
  });

  it("does not refresh when another instance holds the lock", async () => {
    const { runInBackground } = await loadBackground();
    guards.acquire.mockResolvedValue(false);
    const task = vi.fn(async () => {});

    runInBackground("key", task);
    await callbacks[0]();

    expect(task).not.toHaveBeenCalled();
    expect(guards.release).not.toHaveBeenCalled();
  });

  it("skips the refresh when Redis is unavailable", async () => {
    const { runInBackground } = await loadBackground();
    guards.should.mockResolvedValue(false);
    guards.acquire.mockResolvedValue(false);
    const task = vi.fn(async () => {});

    runInBackground("key", task);
    await callbacks[0]();

    expect(task).not.toHaveBeenCalled();
    expect(guards.markFailure).not.toHaveBeenCalled();
  });

  it("clears the failure marker after a successful refresh", async () => {
    const { runInBackground } = await loadBackground();
    const task = vi.fn(async () => {});

    runInBackground("key", task);
    await callbacks[0]();

    expect(task).toHaveBeenCalledTimes(1);
    expect(guards.clearFailure).toHaveBeenCalledWith("key");
    expect(guards.markFailure).not.toHaveBeenCalled();
    expect(guards.release).toHaveBeenCalledWith("key");
  });
});
