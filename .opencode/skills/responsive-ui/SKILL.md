---
name: Responsive UI
description: Mobile-first layout rules for npmsearch — Tailwind v4 breakpoints, container queries, clamp type, 44px targets, overflow and dvh handling. Load for layouts, grids, and viewport bug fixes.
---

# Responsive UI

Mobile-first. Write the 360px layout as the default, then add `sm:`/`md:`/`lg:`/`xl:` overrides. Never write desktop-first `max-*` unless there is no alternative.

## Breakpoints (Tailwind v4 defaults, no config)
| Prefix | Min width | Use in this repo |
| --- | --- | --- |
| — | 0 | 360px phone: single column |
| `sm:` | 640px | search form goes horizontal; larger buttons |
| `md:` | 768px | card padding `md:p-5`, typography steps up |
| `lg:` | 1024px | package page becomes `[content 300px sidebar]` |
| `xl:` | 1280px | 7-metric row, sidebar 320px |

Existing patterns to keep: `grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_320px]` and `grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-7` in `app/package/[name]/page.tsx`.

Use `minmax(0,1fr)`, never bare `1fr`, for text columns — otherwise long package names force horizontal scroll.

## Container queries
Tailwind v4 supports them natively: mark a parent `@container` and size children with `@sm:`, `@md:`, `@lg:` (container width, not viewport).
Use container queries for reusable cards (`MetricTile`, result card) that appear at multiple widths; use viewport breakpoints for page structure.

```tsx
<div className="@container">
  <div className="flex flex-col @md:flex-row @md:items-center gap-3">…</div>
</div>
```

Arbitrary values are allowed when the design needs them: `@min-[420px]:grid-cols-2`.

## Fluid type and space
Use `clamp()` for page-level headings instead of a chain of breakpoints:

```tsx
<h1 className="text-[clamp(24px,5vw,34px)] leading-none font-semibold tracking-[-0.02em]">
```

Rules: min = mobile size, max = desktop size, slope between `4vw` and `6vw`. Do not use `clamp()` for body copy (14px) or metadata (11–13px) — keep those fixed. Do not introduce sizes outside the tokens in `ui-design`.

## Touch targets
- Minimum **44×44px**. The shared primitives already use `min-h-11` (=44px); keep it.
- Icon-only controls need `min-h-11 min-w-11` and padding, not just a small icon.
- Space adjacent targets by ≥8px (`gap-2`).
- Never attach critical actions to `hover:` only; provide focus and touch equivalents.

## Horizontal overflow
- The page must never scroll sideways at 360px.
- Code, tables, long commands scroll **inside** their own box: `overflow-x-auto` on the wrapper, `min-w-0` on the flex/grid child. See the README table wrapper and `installCommand` in `app/package/[name]/page.tsx`.
- Long names, URLs and emails: `break-words`/`truncate` plus `min-w-0`.
- Fixed widths need a mobile fallback: `w-full sm:w-[320px]`.

## Viewport units and safe areas
- Prefer `min-h-dvh` over `min-h-screen` for full-height shells (mobile browser chrome). Use `100dvh` in any new full-height container.
- Respect notches for fixed/sticky elements:
  `pt-[max(16px,env(safe-area-inset-top))]`, `pb-[env(safe-area-inset-bottom)]`.
- The header is sticky at 56px (`--header-height`, `app/components/site-header.tsx`). Content flows after it, so do not add a manual top offset. Any header height change goes through the token.
- Avoid `100vw` for full-bleed elements: it includes the scrollbar. Use `w-full` or `calc(100% - 32px)`.

## Verification — required before done
Check 360, 768, 1280 in devtools:
1. No horizontal scrollbar (`document.documentElement.scrollWidth <= clientWidth`).
2. No text clipped by a fixed-height container; titles wrap.
3. Tap targets ≥44px at 360px.
4. Sidebar stacks below content under `lg`.
5. Sticky/fixed header does not overlap content at any width.
6. Skeletons match the responsive layout (`app/package/[name]/loading.tsx` has its own breakpoints).
7. Keyboard focus is visible and not clipped by `overflow-hidden`.

## Do / Don't
```tsx
// Do — fluid, stacking, scroll contained
<main className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
  <div className="min-w-0 overflow-x-auto">…</div>
</main>

// Don't — fixed desktop grid, page-level overflow, tiny target
<div className="grid grid-cols-[1fr_300px] w-[1200px]">
  <button className="p-0.5 text-[10px]">copy</button>
</div>
```

- Mobile first: base classes are the 360px design.
- Reuse `PageContainer` (`max-w-[var(--container-max)] px-4`) for gutters; increase padding at `sm:` if needed rather than adding wrappers.
- If a layout needs JS to be responsive, it is the wrong layout.
