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

  client = Redis.fromEnv({
    // `@upstash/redis` defaults to `cache: "no-store"` on its internal fetch,
    // and Next aborts static generation for any page that issues a no-store
    // fetch ("Page changed from static to dynamic at runtime"). `reload` keeps
    // the request uncached without flipping the route to dynamic or letting
    // Next try to store the POST response.
    //
    // Re-verify this on every `@upstash/redis` upgrade: if the default changes,
    // or if `reload` starts being treated as a dynamic fetch, `/package/[name]`
    // and `/[...pkg]` will silently fall back to ƒ. Check them in the build
    // route table and look for the static-to-dynamic error in the logs.
    cache: "reload",
  });

  return client;
}
