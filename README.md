# npmsearch

**A fast, minimal browser for the npm registry.** Dense package data, instant
search, keyboard-first navigation, a streamed README pipeline, and a quiet
terminal-inspired interface.

[![CI](https://github.com/thegeekyb0y/npmsearch/actions/workflows/ci.yml/badge.svg)](https://github.com/thegeekyb0y/npmsearch/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-3da639.svg)](LICENSE)
![Next.js](https://img.shields.io/badge/Next.js-16-000000)
![React](https://img.shields.io/badge/React-19-61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6)

![npmsearch package page](public/readme-package.png)

**[Live app](https://npmsearch121.vercel.app)** ·
**[How it works](https://npmsearch121.vercel.app/how-it-works)** ·
**[Contributing](CONTRIBUTING.md)**

## Why this exists

The npm website is built for the whole ecosystem: publishing, teams, billing,
marketing and accounts. Most of the time I just want to answer a smaller
question:

> What does this package do, how big is it, what does it depend on, and is its
> README useful?

npmsearch is built around that question. It reads the public registry directly,
keeps the interface quiet, and spends its complexity budget on speed:

- the package shell renders from a **small manifest**, not a 31 MB packument
- heavy sections **stream** after the shell
- every slow upstream is cached with **stale-while-revalidate**
- typing never triggers a server render per keystroke
- search results are **virtualized** up to 1,000 rows

## How it differs from the npm website

| | npmjs.com | npmsearch |
| --- | --- | --- |
| Purpose | Publish, manage, discover | Inspect packages fast |
| First paint | Page-level data fetch | Small manifest shell + streamed sections |
| Search | Full page navigation | Instant, abortable, URL-synced |
| Keyboard | Standard links | `/`, `Cmd/Ctrl+K`, arrows, Enter, Escape |
| Data density | Marketing and account chrome | Metadata, versions, deps, README |
| Compatibility | Limited | ESM / CJS / types, node range |
| Install size | Not shown | Estimated across a bounded dependency graph |
| Dependency health | Not shown | Direct deps compared with published latest |
| README | npm renderer | Sanitized, Shiki-highlighted, TOC, copy |
| Open source | — | MIT, documented architecture, contribution templates |

## Features

- **Instant search** — 100 ms debounce, `AbortController`, client cache, URL sync.
- **Virtualized results** — 1,000-result cap without a heavy DOM.
- **Keyboard layer** — `/` focus, `Cmd/Ctrl+K` palette, arrows, Enter, Escape.
- **Package shell** — license, deps, unpacked size, files, node range.
- **Interactive downloads chart** — 30-day trend, pointer crosshair, keyboard
  inspection, weekly/monthly totals.
- **Dependency health** — direct deps, declared range, latest version, outdated
  flags, ESM/CJS/types badges.
- **README pipeline** — registry first, jsDelivr fallback, sanitize, Shiki, TOC,
  copy buttons.
- **Short routes** — `/<pkg>` and `/<pkg>@<version>`, including scoped names.
- **Responsive and accessible** — 360 / 768 / 1280, axe checks, reduced motion.

## Architecture

```mermaid
flowchart LR
  B[Browser] --> S[Next.js RSC shell]
  S --> L["/<pkg>/latest"]
  S --> D[downloads range]
  S -.->|Suspense| R[README pipeline]
  S -.->|Suspense| A[Analytics]
  S -.->|Suspense| H[History]
  R --> F[Full packument]
  A --> M[latest manifests]
  H --> F
  L --> C[(Upstash SWR)]
  D --> C
  F --> C
  M --> C
  R --> J[jsDelivr fallback]
```

```mermaid
sequenceDiagram
  participant U as Browser
  participant N as Next.js
  participant R as npm registry
  participant C as Upstash

  U->>N: GET /package/axios
  N->>R: /axios/latest + downloads
  R-->>N: small manifests
  N-->>U: streamed shell
  N->>R: /axios (full packument)
  R-->>N: README + versions + maintainers
  N-->>U: streamed README + rails
  N->>C: write cache entries
```

### 1. A small shell, then streamed sections

`getPackageOverview()` fetches `/<pkg>/latest` and the downloads range in
parallel. The header, metadata, install block and downloads render immediately.

README, install size, dependencies, versions, maintainers and GitHub stats live
in their own Suspense boundaries. They stream in after the shell. The full
packument is shared between the README and history sections through React
`cache()`.

### 2. Stale-while-revalidate

Every cache value is `{ data, cachedAt }` under a versioned key. A request
serves a fresh entry directly, serves a stale entry immediately and schedules a
background refresh with `after()`, or fetches on a miss. One refresh runs per key
per process. Cache failures are fail-open.

### 3. Search without server churn

Typing updates the URL with `history.replaceState` and calls `/api/search`.
`AbortController` cancels the previous request. A 60-second client cache serves
repeat queries. A failed server render never replaces client results with a
fatal panel.

### 4. A README pipeline that trusts nothing

Registry README → jsDelivr fallback when empty → `rehype-raw` → custom
`rehype-sanitize` → slugged headings and TOC → server Shiki → copy buttons. No
scripts, iframes, event handlers or package HTML reach the DOM unsanitized.

### 5. Bounded analytics

Install size is an estimate from `/<pkg>/latest` manifests: depth 3, max 60
packages, 8 concurrent requests, 2-second budget. Dependency freshness compares
the declared range with the published latest version. Unsupported protocols are
never flagged.

## Performance

| Decision | Budget / result |
| --- | --- |
| Package shell source | `/<pkg>/latest` + downloads, not the full packument |
| Search debounce | 100 ms, leading + trailing |
| Search results | 1,000 cap, window-virtualized |
| README | 256 KB cap, server-highlighted, streamed |
| Install-size crawl | depth 3 · 60 packages · 8 concurrent · 2 s |
| Cache TTLs | search 60 s/1 h · package 5 m/24 h · analytics 1 h/24 h · README 1 d/7 d |
| Home route | static, daily revalidation for the GitHub star count |
| Client search cache | 60 s, 20 entries |

The full engineering story, diagrams and tradeoffs live at
[`/how-it-works`](https://npmsearch121.vercel.app/how-it-works).

[![npmsearch engineering page](public/readme-engineering.png)](https://npmsearch121.vercel.app/how-it-works)

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 App Router, React 19 Server Components |
| Language | TypeScript, strict |
| Styling | Tailwind CSS v4, CSS-first tokens |
| Data | npm registry + downloads API, Zod validation |
| Cache | Upstash Redis, stale-while-revalidate |
| README | react-markdown, rehype, Shiki, github-slugger |
| Motion | `motion` (`motion/react`) |
| Icons | `lucide-react`, Simple Icons for the stack page |
| Tests | Vitest, Playwright, axe |
| Hosting | Vercel |

## Getting started

```bash
pnpm install
cp .env.example .env
pnpm dev
```

Open <http://localhost:3000>.

The app runs without secrets. Upstash and the GitHub token are optional and
degrade gracefully.

### Scripts

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Development server |
| `pnpm build` | Production build |
| `pnpm start` | Serve the production build |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` | Vitest |
| `pnpm test:e2e` | Playwright (install Chromium once) |

### Environment

| Variable | Required | Purpose |
| --- | --- | --- |
| `UPSTASH_REDIS_REST_URL` | production | Shared SWR cache |
| `UPSTASH_REDIS_REST_TOKEN` | production | Shared SWR cache |
| `NEXT_PUBLIC_BASE_URL` | no | Fallback origin for local tooling |
| `GITHUB_TOKEN` | no | Stars/forks/issues on package pages |

Never commit `.env`.

## Project structure

```text
app/
  page.tsx                 landing page
  search/page.tsx          search shell
  package/[name]/          long-form package route
  [...pkg]/                /<pkg> and /<pkg>@<version> aliases
  how-it-works/            engineering page
  api/search/              client search adapter
  components/              UI primitives and islands
  lib/                     registry, cache, analytics, README, format
tests/
  unit/                    Vitest
  e2e/                     Playwright
```

## Keyboard

| Key | Action |
| --- | --- |
| `/` | Focus the global search |
| `Cmd/Ctrl+K` | Open the command palette |
| `ArrowDown` | Move from the input into results |
| `ArrowUp/Down` | Navigate results |
| `Home` / `End` | Jump to the first or last result |
| `Enter` | Open the focused package |
| `Escape` | Close the palette or return to search |

## Contributing

Contributions are welcome. Start with [CONTRIBUTING.md](CONTRIBUTING.md), the
[Code of Conduct](CODE_OF_CONDUCT.md), and the open issues labelled
**good first issue**.

The planned AI package finder is discussed in the
[AI search issue template](.github/ISSUE_TEMPLATE/ai_search.yml). The model will
plan the search; the registry remains the source of truth.

## License

[MIT](LICENSE) © thegeekyb0y
