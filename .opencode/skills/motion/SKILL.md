---
name: Motion
description: Animation rules for npmsearch using motion/react — durations, easing, reduced motion, stagger limits, and what must never animate. Load for any transition, enter/exit, hover, or skeleton work.
---

# Motion

One library: `motion` (`motion/react`). `framer-motion` has been removed; never import it. Add no other animation library.

## Timing
- Micro-interactions (hover, press, color): **100–200ms**.
- Transitions/layout: **≤300ms**.
- Easing: `easeOut` for entrances, `ease`/`easeInOut` for reversible shell moves. Never `linear` except progress.
- The CSS token is `--transition-fast: 150ms ease`; Tailwind transitions use `transition-colors duration-150 ease-out`.

```tsx
// CSS-only interaction (preferred for colors/borders)
className="transition-colors duration-150 ease-out hover:border-border-strong"

// Motion (only when CSS can't do it)
<motion.div animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18, ease: "easeOut" }} />
```

## Reduced motion
The app is wrapped once with `MotionConfig reducedMotion="user"` in `app/components/motion-provider.tsx` (rendered from `app/layout.tsx`). Use local `useReducedMotion()` only when a component needs a different static state. With reduced motion, render the final state immediately — never a shorter animation.

## Animate only transform and opacity
Allowed: `opacity`, `transform` (`x`, `y`, `scale`, `rotate`), and `layout`.
Not allowed: `width`, `height`, `top`, `left`, `margin`, `padding`, `boxShadow`, `filter: blur`, background-color keyframes.
Do not move `top`, `left`, `height` or `width` to fake a layout transition. If an element must move, use `transform` (`translateX/Y`) or a real layout animation, and measure the cost first.

## Stagger
- `staggerChildren` **≤ 0.04**.
- Cap the stagger to the first ~10 items: beyond that, render with no delay.
- Total entrance time should stay under ~400ms.

```tsx
// Do — cap the stagger
const item = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } };
<motion.ul initial="hidden" animate="show" transition={{ staggerChildren: 0.03 }}>
  {items.map((it, i) => (
    <motion.li key={it.name} variants={item}
      transition={{ delay: i < 10 ? 0 : 0 }} />
  ))}
</motion.ul>
```

## Never animate these
- **Virtualized or infinite-scroll rows.** No entrance animation, no layout animation, no opacity fade on mount/unmount. Rows must appear in the same frame they are measured, or scroll position and CLS break.
- **Keyboard-driven navigation.** Arrow-key selection must be instant: no sliding highlight, no spring on the selected row. Change border/background in one frame.
- **Route content on data refresh.** SWR refresh must not re-fade the page.
- **Skeletons → content.** Swap in place; the skeleton must already occupy the final box.

## Layout animation
Use `layout` only when an element genuinely changes position and the user initiated it. The current app has no such case: the header is static and search results are a list. Add `layout` to at most 2–3 nested nodes; each one costs a measurement. Never put `layout` on list items inside a scroller.

## Interaction recipes
- Hover on a result card: border/background color only, 150ms. The existing 2px left accent bar fades via `opacity` (`group-hover:opacity-100`).
- Press: `active:translate-y-px` or a `scale: 0.99` at 100ms; no bounce.
- Copy feedback: text swap with no layout shift (see `CopyInstallButton`), optional `opacity` pulse ≤120ms.
- Dialog/palette: 120–160ms `opacity` + `scale` from 0.98, `easeOut`; exit ≤120ms.
- Pressing `/` to focus search: focus immediately, no animation.

## Do / Don't
```tsx
// Do
<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
  transition={{ duration: 0.16, ease: "easeOut" }} />

// Don't — animating layout properties, no reduced-motion guard, slow
<motion.div initial={{ height: 0 }} animate={{ height: 400 }}
  transition={{ duration: 0.8, ease: "linear" }} />

// Don't — entrance animation on a virtualized row
<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} />
```

## Review checklist
- Import from `motion/react` only.
- Duration within budget; easing is `easeOut`; reduced motion respected.
- Only transform/opacity animate; no `layout` inside scrollers.
- No animation on first paint of infinite rows or on keyboard navigation.
- `pnpm build` passes and the page has no CLS when motion is disabled.
