import { after } from "next/server";

const inFlight = new Map<string, Promise<void>>();

/**
 * Refresh a cache entry after the response has been sent.
 *
 * - one in-flight refresh per key per process
 * - never blocks the request
 * - failures are logged and leave the stale entry in place
 */
export function runInBackground(
  key: string,
  task: () => Promise<void>,
): void {
  if (inFlight.has(key)) return;

  const promise = task()
    .catch((error) => {
      console.error("Background refresh failed.", { key, error });
    })
    .finally(() => {
      inFlight.delete(key);
    });

  inFlight.set(key, promise);

  try {
    after(() => promise);
  } catch {
    // Called outside a request scope (tests or scripts): do not block.
    void promise;
  }
}
