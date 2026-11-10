# npmx.dev — UX reference (patterns only)

Source: https://npmx.dev and https://github.com/npmx-dev/npmx.dev (MIT). Do not copy code, assets or branding. Port interaction patterns into our tokens and React components.

## What they do well

**Search**
- Instant search with a visible on/off state in settings; results update as you type and the URL stays shareable (`/search?q=vue`).
- Result count up front ("Found 474,961 packages"), plus sort control (relevance, downloads/wk, /day, /mo, /yr, last published, name) and card/table view toggle.
- Each result is one dense row: name (exact-match badge), one-line description, version, publish date, weekly downloads. Nothing else competes.
- Topic/keyword chips with `+4` overflow rather than a wall of tags.
- Infinite scroll for additional pages; settings can hide platform-specific packages (`@esbuild/linux-x64`).

**Package page**
- Header: name, copy-name, version + `latest` tag, provenance badge.
- Secondary tabs: main / docs / code / changelog / timeline / stats — all URL-addressable.
- At-a-glance metadata directly under the header: repo, stars, forks, type badge (ESM/CJS/dual), license, dependency count, install size, published date.
- Install block with a package-manager switcher (npm/pnpm/yarn/bun/deno/...) and a copy control.
- Compatibility block (Node engines) and a versions list where the current version is highlighted and tags (`latest`, `rc`, `3x`) are visible.
- Dependencies: collapsed by default with "show all 66 deps", version ranges resolving to real installed versions, and outdated markers.
- README: proxied images/badges, copy-code buttons, GFM tables, and a table of contents; docs/code/changelog are sibling views instead of one giant page.
- Right rail: weekly downloads with sparkline, compatibility, versions, keywords, maintainers — same information architecture we already sketched in `app/package/[name]/page.tsx`.

**Keyboard and shell**
- Global search focus, command palette (`Ctrl+K`), arrow-key result navigation, Enter to open; shortcuts can be disabled in settings.
- Persistent top bar; the home page morphs the search into place (we already do this in `app/components/app-frame.tsx`).
- Every view is a URL: shareable and back/forward-safe.

**Restraint**
- Dark-first, near-black surfaces, hairline borders, one accent color, no shadows or glows, no decorative gradients, no emoji in chrome.
- Numeric metadata is monospace/tabular; prose is secondary gray.
- Quiet motion: ~150ms hover color/border changes, no entrance animations on result lists.

**Settings that change behavior, not decoration**
- Relative dates, include `@types` in install command, hide platform binaries, disable looping graph pulse, ligatures, auto-scroll to requested version, instant search, keyboard shortcuts, data source.

## Gaps we should not inherit yet
- Search backend (Algolia), i18n, code viewer, diffs, timelines, comparison, org pages, package admin. Out of scope for our roadmap.
- Their `~username` and `@org` routes assume npm user APIs; defer until after phase 9.

## Mapping to our roadmap
| npmx pattern | Our phase | Where |
| --- | --- | --- |
| Registry search with rich result objects | 1 | `app/lib/registry.ts` |
| Instant search + URL sync | 2 | `app/components/app-frame.tsx` |
| Fast repeat searches | 3 | `app/lib/cache.ts` |
| Infinite scroll, dense rows | 4 | `app/search/page.tsx` |
| `/`, arrows, Enter, palette | 5 | `app/components/app-frame.tsx` |
| README polish, proxied relative assets | 6 | `app/package/[name]/page.tsx` |
| Trend, install size, deps, format/types badges | 7 | package page |
| `/<pkg>`, `/<pkg>@<version>` | 8 | new route |
| Collections / saved packages | 9 | auth + Prisma |

## Deliberate differences
- We stay single-column and server-rendered where possible; npmx is a Nuxt SPA with a heavier client.
- We will not add sorting/view toggles until the result set is virtualized (phase 4), to avoid state explosion.
- We keep Geist and our orange accent; their palette and logo are off-limits.
