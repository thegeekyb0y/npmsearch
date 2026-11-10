---
name: Software Engineering Practices
description: Engineering standards for npmsearch — strict TypeScript, boundary validation, error states, tests, commits, performance, security, and env handling. Load before implementing, testing, or committing.
---

# SWE Practices

## TypeScript
- `strict: true` is on; keep it. No `any`, no `as unknown as`, no `@ts-ignore`. If a type is truly unknown, narrow it.
- Types for upstream payloads are **local and minimal** (see `RegistryPackageData` in `app/api/package/[name]/route.ts`). Declare only the fields you read.
- Prefer `type` for object shapes, `interface` for public props. Export types from `app/lib/*` when a page needs them.
- `noUncheckedIndexedAccess` is not on, so guard array access manually (`results[0]?.name`).

## Validate at the boundary
Every external response (registry, downloads API, Redis, user input) is untrusted. Validate with `zod` (add in phase 1) inside `app/lib/registry.ts`; pages consume already-validated types.

```ts
const SearchResponse = z.object({
  objects: z.array(z.object({
    package: z.object({ name: z.string(), version: z.string(), description: z.string().optional() }),
    downloads: z.object({ weekly: z.number() }).optional(),
  })).default([]),
  total: z.number().default(0),
});
```

- Never trust `res.ok` alone; validate shape after `res.json()`.
- Failure policy: search degrades to an empty result set + message; package page returns `notFound()`.
- Do not silently `catch {}`. Log with context and return a typed fallback.

## Errors and empty states
- Route-level `app/error.tsx` (client) for unexpected failures, `app/not-found.tsx` for missing packages, `app/package/[name]/not-found.tsx` if a scoped state is needed.
- Use the existing `StatusPanel` (`error` prop) for in-page failures instead of raw text.
- Empty ≠ error: "No packages found" is a `StatusPanel` with a suggested next action.
- `loading.tsx` for every async route; its skeleton must have the same box sizes as the real content (zero CLS).
- No `console.log` in committed code; `console.error` only in server catch blocks.

## Commits and diffs
- Conventional Commits: `feat:`, `fix:`, `refactor:`, `perf:`, `docs:`, `chore:`, `test:`.
- One roadmap phase per PR/commit (see `AGENTS.md`). Do not mix formatting, dependency cleanup and behavior in one commit.
- Keep diffs reviewable: ~400 lines of logic is the upper bound; split otherwise.
- No premature abstraction. Extract to `app/lib/*` or `app/components/ui.tsx` on the second real use, not the first.
- Do not reformat files you didn't change. Don't rename unrelated symbols.

## Tests
- **Vitest** for `app/lib/*`: cache key normalization, response mapping, URL building, error fallbacks. Mock `fetch` and Redis; no network in tests.
- **Playwright** for the three critical flows: search → open result, package page renders README, keyboard `/` → arrows → Enter.
- Add a test with every bug fix (regression first). Tests live beside the code or in `tests/`, matching existing convention once introduced.
- Accessibility: run `axe` on search and package pages in Playwright; zero serious violations before merge.

## Performance budget
- LCP < 2.0s on desktop, < 2.5s on mobile; **CLS = 0**; no long task > 200ms from our code.
- No request waterfalls: independent fetches go through `Promise.all` (already used in the package route).
- Do not fetch per result (the current N+1 downloads bug in `app/search/page.tsx`).
- Server Components by default; ship client JS only for interaction.
- Prefer streaming/Suspense + skeletons over blocking the route.
- Deduplicate requests with `React.cache` per request and Upstash across requests.
- Keep bundles lean: import icons individually from `lucide-react` (tree-shaken), never whole libraries.

## Security
- `encodeURIComponent()` every dynamic path/query segment sent upstream.
- Sanitize README HTML (`rehype-sanitize`, phase 6); never `dangerouslySetInnerHTML` with package content.
- Validate and clamp query params: `q` length ≤ 200, page size ≤ 50, `from` numeric.
- Rate-limit public routes (Upstash `@upstash/ratelimit` when added); return 429 with `Retry-After`.
- No secrets in client components; only `NEXT_PUBLIC_*` may reach the browser.
- External links: `target="_blank" rel="noreferrer"` (see `ExternalLink`).
- Validate env at startup in `app/lib/env.ts` with zod; fail fast with a readable message.

## Env
- `.env` is gitignored. Commit `.env.example` with every required key:
  `UPSTASH_REDIS_REST_URL=`, `UPSTASH_REDIS_REST_TOKEN=`, `NEXT_PUBLIC_BASE_URL=`.
- Adding a variable means updating `.env.example` in the same commit.

## Before finishing — always
```powershell
pnpm lint
pnpm build
# pnpm typecheck once added; pnpm test once Vitest lands
```
Report what passed. If something is skipped, say why. Never commit with failing lint or build.
