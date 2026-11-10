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
| `pnpm test:e2e` | Playwright smoke and accessibility tests |

## Environment

Copy `.env.example` to `.env` and fill in the values:

| Variable | Required | Purpose |
| --- | --- | --- |
| `UPSTASH_REDIS_REST_URL` | yes | Shared response cache |
| `UPSTASH_REDIS_REST_TOKEN` | yes | Shared response cache |
| `NEXT_PUBLIC_BASE_URL` | no | Fallback origin for local tooling |
| `GITHUB_TOKEN` | no | Stars/forks/issues on package pages; the rail hides when absent |

Never commit `.env`. Missing `GITHUB_TOKEN` must never fail a build or a page render.

## Architecture

- `app/lib/*` — registry, downloads, GitHub and cache access. Pages call this directly.
- `app/components/ui.tsx` — shared primitives; `app/components/*` — interactive islands.
- `app/search/page.tsx` — search route.
- `app/package/[name]/page.tsx` — package route and README.
- `app/api/*` — thin HTTP adapters for client-side search.
- `app/globals.css` — the only source of design tokens.

Server Components are the default. `"use client"` is reserved for interactive leaves.

## Design rules

Hairlines over cards, monospace for identifiers and numbers, one accent color, no shadows or gradients. Every async view has a skeleton with zero layout shift. Layouts are verified at 360px, 768px and 1280px.

## Status

Phase 0 (foundation and design system) is in progress. See `AGENTS.md` for the roadmap and the skills in `.opencode/skills/` for implementation rules.
