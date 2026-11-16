/**
 * Coalesce concurrent cache misses for one key into a single upstream fetch.
 *
 * The entry is removed as soon as the promise settles, so failures are not
 * memoized and the next request retries normally.
 */
const inFlight = new Map<string, Promise<unknown>>();

export function coalesce<T>(key: string, task: () => Promise<T>): Promise<T> {
  const existing = inFlight.get(key);

  if (existing) return existing as Promise<T>;

  const promise = task().finally(() => {
    inFlight.delete(key);
  });

  inFlight.set(key, promise);

  return promise;
}
