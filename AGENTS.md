# AGENTS.md

npmsearch is a fast, minimal npm registry explorer. Read this before changing anything.

## Stack
Next.js 16 App Router · React 19 · TypeScript (strict) · Tailwind CSS v4 CSS-first · Upstash Redis · pnpm.

## Hard constraints
- **No `tailwind.config.*`.** Design tokens live in `app/globals.css` (`:root` + `@theme inline`). Add tokens there, never in a config file.
- **pnpm only.** No npm/yarn/bun, one lockfile. `package-lock.json` is legacy: remove it when `pnpm-lock.yaml` is committed.
- **Server Components by default.** `"use client"` only on interactive leaves (currently `app/components/app-frame.tsx`, `copy-install-button.tsx`, `motion.tsx`). Never on a page unless the whole page is interactive.
- **One animation library: `motion` (`motion/react`).** `framer-motion` is a duplicate and must be removed; add no other animation imports.
- **One icon set: `lucide-react`.** `react-icons` is legacy; remove it, never import it again.
- **Data access in `app/lib/*`** (`registry.ts`, `cache.ts`, ...). Pages call those functions directly.
- **Never fetch our own `/api` from a server component.** `getBaseUrl()` round-trips are legacy; delete usages as you touch them.
- **Always `encodeURIComponent()`** user or package input before putting it in an upstream URL.
- Sanitize README HTML; never render untrusted HTML with `dangerouslySetInnerHTML`.
- Secrets via env only; keep `.env.example` in sync. No new dependencies without asking.

## Code map
- `app/globals.css` — tokens. Utilities: `bg-background|surface|surface-code`, `border-border-subtle|strong`, `text-text-primary|secondary|muted`, `text-brand|bg-brand`, `font-mono`, `rounded-[var(--radius-sm|md)]`.
- `app/components/ui.tsx` — `AppShell`, `PageContainer`, `SectionTitle`, `VersionBadge`, `ExactBadge`, `ExternalLink`, `StatusPanel`, `CopyButton`. Reuse before inventing.
- `app/components/motion.tsx` — `FadeIn`, `StaggerList`, `StaggerItem`.
- `app/components/app-frame.tsx` — global client shell and search bar.
- Pages: `app/page.tsx`, `app/search/page.tsx`, `app/package/[name]/page.tsx` + `loading.tsx`.
- APIs: `app/api/search/route.ts`, `app/api/package/[name]/route.ts`. Lib: `app/lib/get-base-url.ts`.

## Definition of done
- `pnpm lint && pnpm build` pass (add `pnpm typecheck` once the script exists).
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
1. **Registry migration.** Replace `api.npms.io` with `registry.npmjs.org/-/v1/search`, use `downloads.weekly` from each result, delete per-result download fetches. Move logic to `app/lib/registry.ts`. Fixes: unencoded `q` in `app/api/search/route.ts`; N+1 downloads in `app/search/page.tsx`; remove `framer-motion`/`react-icons` duplicates; replace boilerplate `README.md`.
2. **Instant search.** Client input with 100ms leading+trailing debounce, `AbortController`, `router.replace` URL sync.
3. **SWR cache.** Upstash `{ data, cachedAt }`: serve stale immediately, refresh in background with `after()`.
4. **Infinite scroll.** Virtualized list using registry `from=` pagination, plus search skeletons.
5. **Keyboard layer.** `/` focuses search, arrow-key navigation, Enter opens, command palette.
6. **README.** `rehype-raw` + `rehype-sanitize`; rewrite relative image/link URLs to the repository raw base.
7. **Analytics.** 30-day download trend, install size, dependency list with outdated flags, ESM/CJS + types badges.
8. **Short routes.** `/<pkg>` and `/<pkg>@<version>`.
9. **(V2) Accounts.** Better Auth + Prisma + Postgres, collections.

Reference for UX patterns (not code): `docs/npmx-reference.md`.
