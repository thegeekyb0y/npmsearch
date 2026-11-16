import { describe, expect, it, vi } from "vitest";
import { coalesce } from "../../app/lib/in-flight";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

describe("coalesce", () => {
  it("shares one task across concurrent calls for the same key", async () => {
    const gate = deferred<string>();
    const task = vi.fn(() => gate.promise);

    const results = [
      coalesce("key", task),
      coalesce("key", task),
      coalesce("key", task),
      coalesce("key", task),
    ];

    expect(task).toHaveBeenCalledTimes(1);

    gate.resolve("value");

    await expect(Promise.all(results)).resolves.toEqual([
      "value",
      "value",
      "value",
      "value",
    ]);
  });

  it("runs a new task once the previous one settled", async () => {
    const task = vi.fn(async () => "value");

    await coalesce("key", task);
    await coalesce("key", task);

    expect(task).toHaveBeenCalledTimes(2);
  });

  it("does not memoize failures", async () => {
    const failing = vi.fn(async () => {
      throw new Error("upstream down");
    });

    await expect(coalesce("key", failing)).rejects.toThrow("upstream down");

    const succeeding = vi.fn(async () => "recovered");

    await expect(coalesce("key", succeeding)).resolves.toBe("recovered");
    expect(succeeding).toHaveBeenCalledTimes(1);
  });

  it("keys tasks independently", async () => {
    const first = vi.fn(async () => "first");
    const second = vi.fn(async () => "second");

    await expect(
      Promise.all([coalesce("a", first), coalesce("b", second)]),
    ).resolves.toEqual(["first", "second"]);

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
  });
});
