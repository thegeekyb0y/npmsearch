---
name: UI Design
description: Visual system for npmsearch — tokens, type scale, spacing, borders, and the component state matrix. Load for any visual change, new component, or styling review.
---

# UI Design

Restrained dark UI. npmx is the restraint reference: dense, quiet, information first. No branding or code copying.

## Tokens — use what exists
All tokens live in `app/globals.css`. Never hardcode a hex that a token covers.

| Purpose | Token | Value |
| --- | --- | --- |
| Page | `--background` | `#0b0d10` |
| Card/panel | `--surface` | `#12151a` |
| Code/input | `--surface-code` | `#0e1116` |
| Raised | `--surface-raised` | `#171b21` |
| Hairline | `--border-subtle` | `#232831` |
| Emphasis border | `--border-strong` | `#343b46` |
| Primary text | `--text-primary` | `#f0f2f5` |
| Secondary text | `--text-secondary` | `#aab2bf` |
| Muted/meta | `--text-muted` | `#5f6875` |
| Accent | `--accent` | `#ff7a1a` |
| Accent hover | `--accent-hover` | `#e56a0c` |
| Secondary accent | `--accent-2` | `#5eead4` |
| Radius | `--radius-sm` 4px, `--radius-md` 6px | |
| Container | `--container-max` 1200px | |

Tailwind utilities come from `@theme inline`: `bg-background`, `bg-surface`, `bg-surface-code`, `bg-surface-raised`, `bg-surface-overlay`, `border-border-subtle`, `border-border-strong`, `text-text-primary`, `text-text-secondary`, `text-text-muted`, `text-brand`, `bg-brand`, `hover:bg-brand-hover`, `text-brand-2`, `text-success`, `text-destructive`, `font-sans`, `font-mono`.
Use `text-brand-2` for secondary metrics (weekly downloads), and `text-brand` for actions, active states, and the small workflow numbers. Keep the page mostly neutral; color is an accent, not a background.
Soft accent values are not utilities: use `bg-[var(--accent-soft-bg)]` and `border-[var(--accent-soft-border)]` (see `ExactBadge` in `app/components/ui.tsx`).

## Type scale
Only these sizes: `12` meta/labels, `13` secondary UI, `14` body/base, `16` input on home, `18` section heading, `24` numeric highlight, `32` home wordmark, `22–34` package/page titles.
- Headings: `font-semibold tracking-[-0.01em]` (titles `-0.02em`).
- Labels: `text-[11px]` or `text-[12px]`, `uppercase tracking-[0.08em] text-text-muted`.
- Prose: `leading-7` at 14px, max `72ch`.
- Numbers and versions: `font-mono` and `tabular-nums` when aligned in columns.

## Spacing — 4px grid
Use `--space-1..6` (4/8/12/16/20/24) via Tailwind `1/2/3/4/5/6`. Gaps: `gap-2` inside a control, `gap-3` between related lines, `gap-4` between cards, `gap-6` between sections. Card padding `p-4` mobile, `p-5` at `md`.

## Borders over shadows
Depth = 1px `border-border-subtle` + `bg-surface`. Hover upgrades to `border-border-strong` (optionally `bg-[#141414]`). No `shadow-*` except a focus ring. No gradients except the existing `DownloadSparkline` fill. No glow, no glassmorphism, no emoji in UI chrome.

## Density
- One idea per row; two lines max before truncation.
- Package result = name + version + one-line description + 3 links + downloads. Nothing more.
- Use `min-w-0` + `break-words`/`truncate` so long scoped names never widen the layout.
- Metadata is secondary: `text-text-muted`, never competing with the package name.

## State matrix — every interactive component
Implement all eight before calling it done:

| State | Treatment |
| --- | --- |
| default | `border-border-subtle`, `bg-surface`, `text-text-primary` |
| hover | `border-border-strong`, optional `bg-[#141414]`; 150ms |
| focus-visible | global 1px accent outline + 2px offset; do not remove |
| active | `bg-[#181818]` or `translate-y-px`; no bounce |
| disabled | `opacity-50 cursor-not-allowed`, no hover change, `aria-disabled` |
| loading | skeleton matching final box, or spinner at `h-4 w-4` + `aria-busy` |
| empty | `StatusPanel` with a next action, never a blank box |
| error | `StatusPanel error` + retry affordance; `role="alert"` |

Copy is part of the state: button label changes (`Copy` → `Copied`, see `CopyInstallButton`), and it must not change width — reserve space or use `min-w-*`.

## Accessibility
- Body text on `--background`: `text-text-secondary` is the floor for readable copy. `text-text-muted` (#525252) is ~2.8:1 — meta only, never essential text, never a link label alone.
- Accent `#f56e0f` on `#0a0a0a` is ~5.6:1: fine for text at 14px+; do not use it for long paragraphs.
- Never rely on color alone for exact match/error — pair with a label (`ExactBadge`).
- Interactive elements need an accessible name; icon-only buttons need `aria-label`.

## Do / Don't
```tsx
// Do — reuse the primitives
<StatusPanel title="No packages found" message="Try a broader term." />
<div className="rounded-[var(--radius-md)] border border-border-subtle bg-surface p-4">
  <SectionTitle title="Weekly downloads" subtitle="Across all versions." />
</div>

// Don't — invented palette, shadow, gradient, emoji
<div className="rounded-xl bg-gradient-to-br from-zinc-900 to-black shadow-2xl">
  🔥 <span style={{ color: "#ff8800" }}>Downloads</span>
</div>
```

- Reuse `PageContainer` for width and gutters; don't re-implement `max-w-[1080px] px-4`.
- Prefer `VersionBadge`, `ExactBadge`, `ExternalLink`, `CopyButton`; add a primitive to `app/components/ui.tsx` only when it is used twice.
- When a design decision is unclear, choose the quieter option: less contrast, fewer borders, fewer words.
