# Contributing to npmsearch

Thanks for being here. npmsearch is a small, opinionated codebase: a fast
registry explorer built with Next.js, React Server Components and strict
TypeScript. The best contributions are focused, measured and kind.

## Ways to contribute

- Report a bug with a reproduction.
- Fix a bug and add a regression test.
- Improve performance with before/after numbers.
- Improve accessibility or responsive behaviour.
- Propose a feature — especially the planned AI package finder.
- Improve documentation, diagrams or examples.
- Review a pull request.

If you are new to the project, look for issues labelled **good first issue** or
**help wanted**. Comment on the issue before starting so we do not duplicate
work.

## Setup

Requirements:

- Node.js 22+
- pnpm 11 (`corepack enable` or install it globally)
- Git

```bash
git clone https://github.com/thegeekyb0y/npmsearch.git
cd npmsearch
pnpm install
cp .env.example .env
pnpm dev
```

Open <http://localhost:3000>.

This repository uses **pnpm only**. Do not add `package-lock.json`, `yarn.lock`
or `bun.lockb`.

## Environment

Everything works locally without secrets. The Upstash cache and GitHub stats are
optional; the app degrades gracefully when they are absent.

| Variable | Required | Purpose |
| --- | --- | --- |
| `UPSTASH_REDIS_REST_URL` | production | Shared stale-while-revalidate cache |
| `UPSTASH_REDIS_REST_TOKEN` | production | Shared stale-while-revalidate cache |
| `NEXT_PUBLIC_BASE_URL` | no | Fallback origin for local tooling |
| `GITHUB_TOKEN` | no | Stars/forks/issues on package pages |

Never commit `.env` or real tokens.

## Scripts

```bash
pnpm dev          # development server
pnpm build        # production build
pnpm start        # serve the production build
pnpm lint         # ESLint
pnpm typecheck    # TypeScript, no emit
pnpm test         # Vitest unit tests
pnpm test:e2e     # Playwright (chromium + mobile)
```

Install the Playwright browser once:

```bash
pnpm exec playwright install chromium
```

## Definition of done

Before opening a pull request, run:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

For UI changes, also run the relevant Playwright specs and verify 360px, 768px
and 1280px with no horizontal page scroll.

## Architecture rules

Read [`AGENTS.md`](AGENTS.md) before changing the codebase. The short version:

- **Server Components by default.** `"use client"` only for interactive leaves.
- **Data access lives in `app/lib/*`.** Pages call those functions directly.
  Never fetch our own `/api` from a server component.
- **No Tailwind config.** Design tokens live in `app/globals.css`.
- **One animation library:** `motion` (`motion/react`).
- **One icon set:** `lucide-react`.
- **Sanitize package content.** README HTML is untrusted.
- **Validate upstream data** with Zod; pages consume app-owned types.
- **No new dependencies without discussion.** Prefer the platform and the
  existing primitives.

The `.opencode/skills/` directory documents the design, motion, data-layer,
responsive and engineering rules in more detail.

## Finding work

1. Pick an issue, or open one describing the problem and the expected behaviour.
2. Small fixes do not need a proposal; architectural changes do.
3. For the AI package-finder idea, use the **AI search** issue template so cost,
   privacy and provider choices are discussed up front.

## Code standards

- Strict TypeScript. No `any`, no `@ts-ignore`, no unused code.
- Prefer small, pure functions in `app/lib/*` with unit tests.
- Keep client bundles lean; import icons individually.
- Use `encodeURIComponent()` for every dynamic upstream path or query value.
- Error states use `StatusPanel`; empty states are not errors.
- Every async UI has a skeleton that matches the final box (zero CLS).
- Keyboard reachable: visible focus, logical Tab order, Escape behaviour.

## Tests

- **Vitest** for lib logic, parsing, cache keys, schemas and fallbacks.
- **Playwright** for user flows, keyboard navigation, accessibility (axe) and
  responsive checks.
- Add a regression test with every bug fix.
- Mock network calls in unit tests; do not depend on the live registry.
- E2E tests may hit the registry. If a test is flaky, fix the timing rather than
  adding arbitrary sleeps.

## Commits

Use Conventional Commits:

```text
feat(search): keep client results on server failure
fix(readme): fall back to the published README
perf(package): stream the analytics rail
test(chart): cover keyboard inspection
docs: add the engineering page
```

Keep commits focused. Do not reformat files you did not change.

## Pull requests

- Describe the problem, the change and the tradeoff.
- Include before/after numbers for performance work.
- Include screenshots or a short recording for UI work.
- Link the issue.
- Keep the diff reviewable; split unrelated work.
- The PR template contains the final checklist.

## Code of conduct

By participating, you agree to the [Code of Conduct](CODE_OF_CONDUCT.md).
Be direct about code, generous with people.

## Security

Please do not open a public issue for a vulnerability. See
[SECURITY.md](SECURITY.md).

## License

By contributing, you agree that your contributions are licensed under the
[MIT License](LICENSE).
