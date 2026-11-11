import { Redis } from "@upstash/redis";
import { hasRedisEnv } from "./env";

let client: Redis | null | undefined;
let warned = false;

/**
 * Redis is optional in local development.
 * A missing URL/token disables caching instead of failing every request.
 */
export function getRedis(): Redis | null {
  if (client !== undefined) return client;

  if (!hasRedisEnv()) {
    if (!warned && process.env.NODE_ENV !== "test") {
      warned = true;
      console.warn(
        "Upstash Redis is not configured; running without cache.",
      );
    }
    client = null;
    return client;
  }

  client = Redis.fromEnv();
  return client;
}
