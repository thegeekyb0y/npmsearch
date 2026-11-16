import { after } from "next/server";
import {
  REFRESH_FAILURE_TTL_SECONDS,
  cacheAcquireRefreshLock,
  cacheClearRefreshFailure,
  cacheMarkRefreshFailure,
  cacheReleaseRefreshLock,
  cacheShouldRefresh,
} from "./cache";

const inFlight = new Map<string, Promise<void>>();

/**
 * Extracts a `retry-after` hint from a refresh failure without importing the
 * registry module (which imports this one).
 */
function failureTtlSeconds(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined;

  const value = (error as { retryAfterSeconds?: unknown }).retryAfterSeconds;

  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;

  return Math.max(REFRESH_FAILURE_TTL_SECONDS, Math.ceil(value));
}

async function guardedRefresh(
  key: string,
  task: () => Promise<unknown>,
) {
  const startedAt = Date.now();

  // A recent failure suppresses retries for this key.
  if (!(await cacheShouldRefresh(key))) {
    return;
  }

  // One refresh per key across instances.
  if (!(await cacheAcquireRefreshLock(key))) {
    return;
  }

  try {
    await task();
    await cacheClearRefreshFailure(key);
  } catch (error) {
    const ttl = failureTtlSeconds(error);

    await cacheMarkRefreshFailure(key, ttl);

    console.error("Background refresh failed.", {
      key,
      durationMs: Date.now() - startedAt,
      status: (error as { status?: number }).status,
      contentType: (error as { contentType?: string | null }).contentType,
      retryAfterSeconds: (error as { retryAfterSeconds?: number })
        .retryAfterSeconds,
      error,
    });

    throw error;
  } finally {
    await cacheReleaseRefreshLock(key);
  }
}

/**
 * Refresh a cache entry after the response has been sent.
 *
 * - one in-flight refresh per key per process
 * - one refresh per key across instances (`SET NX EX 30`)
 * - 10 minute cooldown after a failure, longer for `retry-after`
 * - skipped entirely while Redis is failing, so the registry is not hammered
 * - never blocks the request
 */
export function runInBackground(
  key: string,
  task: () => Promise<unknown>,
): void {
  if (inFlight.has(key)) return;

  const promise = guardedRefresh(key, task)
    .catch(() => {
      // Already logged in `guardedRefresh`; keep the response path clean.
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
