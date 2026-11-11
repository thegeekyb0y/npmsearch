---
name: Data Layer
description: npm registry and downloads fetching plus Upstash caching conventions for npmsearch — endpoints, cache keys, TTLs, stale-while-revalidate and failure behavior. Load when touching app/lib, routes, or caching.
---

# Data Layer

All registry access lives in `app/lib/*` (start with `app/lib/registry.ts`). Pages call those functions directly. Routes in `app/api/*` are thin adapters: parse input, call the lib, return JSON. Server components must never call our own `/api` or `getBaseUrl()`.

## Upstream endpoints
| Need | URL |
| --- | --- |
| Search | `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(q)}&size=20&from=0` |
| Package doc | `https://registry.npmjs.org/${encodeURIComponent(name)}` |
| Weekly downloads | `https://api.npmjs.org/downloads/point/last-week/${encodeURIComponent(name)}` |
| 30-day trend | `https://api.npmjs.org/downloads/range/last-month/${encodeURIComponent(name)}` |

- Search objects already contain `downloads.weekly` — use it. **Never** fetch downloads per result.
- `downloads.weekly` may be missing: render "Downloads unavailable", don't guess.
- Scoped packages: encode the whole name (`%40scope%2Fname`) for path params; `encodeURIComponent` is correct for both registry and downloads endpoints.
- Always send `Accept: application/json` and a `User-Agent` identifying npmsearch where the API allows it.
- Independent upstream calls go in one `Promise.all`; per-dependency lookups use bounded concurrency (≤5).

## Normalization
Normalize once, at the entry point of `app/lib/registry.ts`, then pass the normalized value everywhere (keys, URLs, echo in responses).

```ts
export function normalizeQuery(q: string) {
  return q.trim().replace(/\s+/g, " ").toLowerCase().slice(0, 200);
}
export function normalizePackageName(name: string) {
  return decodeURIComponent(name).trim().toLowerCase(); // keep @scope/name
}
```

Validate npm package names (`^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$`) before hitting upstream; reject with 400 rather than proxying garbage.
Clamp pagination: `size` 1–50 (default 20), `from` integer ≥ 0, max 1000.

## Cache keys
Format: **`${version}:${kind}:${normalized-input}`**

```ts
const CACHE_VERSION = "v1";
const searchKey = `${CACHE_VERSION}:search:${normalizeQuery(q)}`;
const packageKey = `${CACHE_VERSION}:package:${normalizePackageName(name)}`;
const downloadsKey = `${CACHE_VERSION}:downloads:${normalizePackageName(name)}`;
```

- Bump `CACHE_VERSION` whenever the stored shape changes — never migrate old entries in place.
- Do not embed user casing or whitespace variants: `React` and `react` must share one key.
- One key per logical view; page/`size`/`from` belong in the key only when they change the payload (`v1:search:${q}:${from}` if results differ by page).

## TTLs and SWR
| Kind | Fresh for | Hard TTL |
| --- | --- | --- |
| search | 60s | 1h |
| package | 5m | 24h |
| downloads | 5m | 24h |
| github | 24h | 7d |

Store `{ data, cachedAt }`, never a bare payload. `cacheSet` always writes the **hard** TTL; freshness is checked in the caller with `isFresh`/`isExpired`.

```ts
const key = searchCacheKey(q);
const entry = await cacheGetEntry<SearchResults>(key); // never throws

if (entry && !isExpired(entry, CACHE_HARD_TTL.search)) {
  if (!isFresh(entry, CACHE_FRESH_TTL.search)) {
    runInBackground(key, () => refreshSearch(q, key)); // after(), deduped
  }
  return entry.data; // serve stale immediately
}

return refreshSearch(q, key); // cold miss: must await
```

`runInBackground` lives in `app/lib/background.ts`: it uses `after()` from `next/server`, allows one in-flight refresh per key per process, and logs failures without throwing.

Rules:
- The request path must never await a background refresh. Only `after()` it.
- Cache read/write failures are non-fatal: log at `warn`/`error`, continue to upstream. Upstash being down must not 500 the page.
- Cache misses on a cold start are allowed to be slower; still no waterfalls.

## Errors and negative caching
- 404 from the registry is a real answer: return `null` and let the page call `notFound()`. Do not cache it as success.
- Do not cache 5xx, timeouts, or validation failures. If you need a stampede guard, cache a negative marker for ≤10s only.
- Set an AbortSignal timeout (e.g. 8s) on every upstream fetch; surface a typed `UpstreamError`.
- Never log tokens or full env; log the query and status code only.

## Redis conventions
- `Redis.fromEnv()` once in `app/lib/cache.ts`, not per route.
- Values are objects; `@upstash/redis` serializes JSON. Never double-encode/decode manually.
- Wrap helpers: `cacheGet`, `cacheSet`, `cacheDelete` — the only place that touches Redis.
- Batch reads with `mget` where multiple keys are always needed.

## Client fetches
- Instant search uses `AbortController`; abort the previous request on every keystroke.
- Debounce 100ms (leading + trailing), keep the input responsive with `useTransition`.
- URL is the source of truth: `router.replace(`/search?q=${encodeURIComponent(q)}`)`.
- Never fetch on the server from the client's own API route to "share" logic — call `app/lib/registry.ts` directly from the server component.

## Do / Don't
```ts
// Do — one key, normalized, versioned
await cacheSet(`v1:package:${name.toLowerCase()}`, { data, cachedAt: Date.now() }, 300);

// Don't — raw input, bare payload, long failure cache
await redis.set(`package:${rawName}`, JSON.stringify(data), { ex: 86400 });
```
