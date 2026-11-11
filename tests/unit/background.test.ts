import { beforeEach, describe, expect, it, vi } from "vitest";

const { afterMock, callbacks } = vi.hoisted(() => ({
  callbacks: [] as Array<() => Promise<void>>,
  afterMock: vi.fn((callback: () => Promise<void>) => {
    callbacks.push(callback);
  }),
}));

vi.mock("next/server", () => ({
  after: afterMock,
}));

beforeEach(() => {
  vi.resetModules();
  callbacks.length = 0;
  afterMock.mockClear();
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

    expect(task).toHaveBeenCalledTimes(1);
    expect(callbacks).toHaveLength(1);

    await callbacks[0]();

    runInBackground("key", task);
    expect(task).toHaveBeenCalledTimes(2);
  });

  it("logs refresh failures without throwing", async () => {
    const { runInBackground } = await loadBackground();
    const warn = vi.spyOn(console, "error").mockImplementation(() => {});
    const task = vi.fn(async () => {
      throw new Error("upstream down");
    });

    runInBackground("key", task);
    await callbacks[0]();

    expect(warn).toHaveBeenCalledWith(
      "Background refresh failed.",
      expect.objectContaining({ key: "key" }),
    );
  });
});
