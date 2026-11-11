import { Ratelimit } from "@upstash/ratelimit";
import { getRedis } from "./redis";

const REQUEST_TIMEOUT_MS = 500;
const FAILURE_COOLDOWN_MS = 30_000;
const SEARCH_LIMIT = {
  tokens: 30,
  window: "10 s" as const,
};

let searchLimiter: Ratelimit | null | undefined;
let unavailableUntil = 0;
let warned = false;

function markUnavailable(error: unknown) {
  unavailableUntil = Date.now() + FAILURE_COOLDOWN_MS;
  if (warned) return;
  warned = true;
  console.warn("Rate limiting unavailable; allowing requests.", error);
}

function isAvailable(): boolean {
  return Date.now() >= unavailableUntil;
}

function getSearchLimiter(): Ratelimit | null {
  if (searchLimiter !== undefined) return searchLimiter;

  try {
    const redis = getRedis();
    searchLimiter = redis
      ? new Ratelimit({
          redis,
          limiter: Ratelimit.slidingWindow(
            SEARCH_LIMIT.tokens,
            SEARCH_LIMIT.window,
          ),
          prefix: "ratelimit:search",
        })
      : null;
  } catch (error) {
    markUnavailable(error);
    searchLimiter = null;
  }

  return searchLimiter;
}

async function withTimeout<T>(operation: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("Rate limit operation timed out")),
          REQUEST_TIMEOUT_MS,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

export async function checkRateLimit(
  identifier: string,
): Promise<RateLimitResult> {
  if (!isAvailable()) {
    return { allowed: true };
  }

  const limiter = getSearchLimiter();

  if (!limiter) {
    return { allowed: true };
  }

  try {
    const result = await withTimeout(limiter.limit(identifier));

    if (result.success) {
      return { allowed: true };
    }

    return {
      allowed: false,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((result.reset - Date.now()) / 1000),
      ),
    };
  } catch (error) {
    markUnavailable(error);
    return { allowed: true };
  }
}
