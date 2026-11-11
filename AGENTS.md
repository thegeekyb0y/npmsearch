# AGENTS.md

npmsearch is a fast, minimal npm registry explorer. Read this before changing anything.

## Stack
Next.js 16 App Router · React 19 · TypeScript (strict) · Tailwind CSS v4 CSS-first · Upstash Redis · pnpm.

## Hard constraints
- **No `tailwind.config.*`.** Design tokens live in `app/globals.css` (`:root` + `@theme inline`). Add tokens there, never in a config file.
- **pnpm only.** No npm/yarn/bun, one lockfile. `package-lock.json` is legacy: remove it when `pnpm-lock.yaml` is committed.
- **Server Components by default.** `"use client"` only on interactive leaves (currently `app/components/search-box.tsx`, `install-block.tsx`, `motion-provider.tsx`). Never on a page unless the whole page is interactive.
- **One animation library: `motion` (`motion/react`).** `framer-motion` has been removed; never add it back.
- **One icon set: `lucide-react`.** `react-icons` has been removed; never import it.
- **Data access in `app/lib/*`** (`registry.ts`, `cache.ts`, ...). Pages call those functions directly.
- **Never fetch our own `/api` from a server component.** Pages call `app/lib/*` directly; the only HTTP route is for the client search island.
- **Always `encodeURIComponent()`** user or package input before putting it in an upstream URL.
- Sanitize README HTML; never render untrusted HTML with `dangerouslySetInnerHTML`.
- Secrets via env only; keep `.env.example` in sync. No new dependencies without asking.

## Code map
- `app/globals.css` — tokens. Utilities: `bg-background|surface|surface-code`, `border-border-subtle|strong`, `text-text-primary|secondary|muted`, `text-brand|bg-brand`, `font-mono`. Radii: `rounded-[var(--radius-sm)]` or `rounded-[var(--radius-md)]`.
- `app/components/ui.tsx` — `AppShell`, `PageContainer`, `SectionTitle`, `VersionBadge`, `ExactBadge`, `ExternalLink`, `StatusPanel`, `CopyButton`. Reuse before inventing.
- `app/components/motion-provider.tsx` — `MotionConfig reducedMotion="user"`.
- `app/components/site-header.tsx` + `search-box.tsx` — server shell and debounced client search island.
- `app/components/search-results.tsx` + `app/lib/search-events.ts` — client results, aborting fetches, 60s query cache, window virtualization, roving keyboard focus.
- `app/lib/search-pagination.ts` — page offsets, dedupe/merge, 1,000-result cap.
- `app/components/global-shortcuts.tsx` + `command-palette.tsx` — `/`, `Ctrl/Cmd+K`, arrows, Enter, Escape; native dialog palette.
- `app/lib/keyboard.ts`, `keyboard-events.ts`, `recent-searches.ts`, `popular.ts` — shortcut guards and palette data.
- Primitives: `meta-strip`, `tab-rail`, `rail-section`, `search-row`, `install-block`, `skeleton`, `key-hint`.
- Pages: `app/page.tsx`, `app/search/page.tsx`, `app/package/[name]/page.tsx` + `loading.tsx`.
- APIs: `app/api/search/route.ts` (client search only).
- Lib: `app/lib/env.ts` (zod env), `app/lib/redis.ts` (optional client), `app/lib/cache.ts` (versioned, fail-open fresh/hard TTL), `app/lib/background.ts` (`after()` refresh, deduped), `app/lib/registry.ts`, `app/lib/github.ts`, `app/lib/search-params.ts`, `app/lib/rate-limit.ts`, `app/lib/format.ts`.

## Definition of done
- `pnpm lint && pnpm typecheck && pnpm test && pnpm build` pass.
- No new `any`, no `@ts-ignore`, no unused code.
- Every async UI has a skeleton with zero layout shift; `app/package/[name]/loading.tsx` is the reference.
- Works at 360px, 768px and 1280px with no horizontal page scroll.
- Keyboard reachable: visible `:focus-visible`, Tab order, `/` focus, arrows, Enter.

## Skills — load when
- `ui-design` — any visual change, new component/surface, state styling, copy density.
- `motion` — any animation, transition, enter/exit, stagger, skeleton pulse.
- `responsive-ui` — layout, breakpoints, grids, overflow, mobile fixes.
- `swe-practices` — implementation, tests, commits, errors, perf, security, env.
- `data-layer` — registry/downloads fetching, Upstash keys/TTLs, `app/lib/*`.

## Roadmap — one PR-sized commit per phase
0. **Foundation.** Hairline tokens and primitives, stable 56px command bar, server shell with a client search island, `motion/react` only, baseline unit/e2e/CI, README and `.env.example`. *(done)*
1. **Registry migration.** `registry.npmjs.org/-/v1/search`, `downloads.weekly`, direct lib access, GitHub stats, validated routes, error states. *(done)*
2. **Instant search.** 100ms leading+trailing debounce, `AbortController`, URL sync, client query cache. *(done)*
3. **SWR cache.** Upstash `{ data, cachedAt }`, fresh/hard TTLs, stale served immediately, background refresh with `after()`, one in-flight refresh per key. *(done)*
4. **Infinite scroll.** Window-virtualized results, `from=` pagination, dedupe, sentinel + load-more fallback, 1,000-result cap. *(done)*
5. **Keyboard layer.** `/`, `Ctrl/Cmd+K` native-dialog palette, ArrowUp/Down/Home/End through virtualized results, Enter opens, Escape returns to search. *(done)*
6. **README.** `rehype-raw` + `rehype-sanitize`; rewrite relative image/link URLs to the repository raw base.
7. **Analytics.** 30-day download trend, install size, dependency list with outdated flags, ESM/CJS + types badges.
8. **Short routes.** `/<pkg>` and `/<pkg>@<version>`.
9. **(V2) Accounts.** Better Auth + Prisma + Postgres, collections.

Reference for UX patterns (not code): `docs/npmx-reference.md`.
