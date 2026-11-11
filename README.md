# npmsearch

A fast, minimal browser for the npm registry. Dense package metadata, keyboard-first search, README rendering, and a quiet terminal-inspired interface.

Built with Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, and Upstash Redis.

## Getting started

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000.

This repository uses **pnpm only**. Do not commit a second lockfile.

## Scripts

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start the dev server |
| `pnpm build` | Production build |
| `pnpm start` | Serve the production build |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` | Vitest unit tests |
| `pnpm test:e2e` | Playwright smoke, responsive, keyboard and axe tests (run `pnpm exec playwright install chromium` once) |

## Environment

Copy `.env.example` to `.env` and fill in the values:

| Variable | Required | Purpose |
| --- | --- | --- |
| `UPSTASH_REDIS_REST_URL` | production | Shared response cache; blank runs uncached locally |
| `UPSTASH_REDIS_REST_TOKEN` | production | Shared response cache; blank runs uncached locally |
| `NEXT_PUBLIC_BASE_URL` | no | Fallback origin for local tooling |
| `GITHUB_TOKEN` | no | Stars/forks/issues on package pages; the rail hides when absent |

Never commit `.env`. Missing `GITHUB_TOKEN` must never fail a build or a page render.

## Architecture

- `app/lib/*` — registry, downloads, GitHub, cache and README rendering. Pages call this directly.
- `app/components/ui.tsx` — shared primitives; `app/components/search-results.tsx` — client results with aborting fetches and a 60s query cache.
- `app/search/page.tsx` — search route.
- `app/package/[name]/page.tsx` — package route and README.
- `app/api/search/route.ts` — validated HTTP adapter for client-side instant search.
- `app/globals.css` — the only source of design tokens.

Server Components are the default. `"use client"` is reserved for interactive leaves.

## Keyboard

- `/` focuses the global search.
- `Ctrl/Cmd+K` opens the command palette.
- `ArrowDown` from the search input moves into the results.
- `ArrowUp`/`ArrowDown` navigate, `Home`/`End` jump, `Enter` opens a package.
- `Escape` closes the palette or returns focus to the search input.

## Design rules

Hairlines over cards, monospace for identifiers and numbers, one accent color, no shadows or gradients. Every async view has a skeleton with zero layout shift. Layouts are verified at 360px, 768px and 1280px.

## Status

Phases 0–8 are complete: stable 56px shell, hairline primitives, official registry search, weekly downloads without N+1 requests, optional GitHub stats, error states, instant debounced search, stale-while-revalidate caching, virtualized infinite scroll, the keyboard layer with command palette, the sanitized Shiki README pipeline with TOC and copy buttons, package analytics with a 30-day download trend, estimated install size, dependency freshness and ESM/CJS/types badges, and short `/<pkg>` / `/<pkg>@<version>` routes. Phase 9 (accounts and collections) is the V2 milestone left. See `AGENTS.md` for the roadmap and `.opencode/skills/` for implementation rules.
