"use client";

import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

type PreviewState = {
  title: string;
  subtitle?: string;
  meta?: string;
  left: number;
  top: number;
  placement: "top" | "bottom";
};

const SHOW_DELAY_MS = 220;
const FOCUS_DELAY_MS = 120;
const MAX_WIDTH = 280;
const MARGIN = 8;

function findTarget(event: Event): HTMLElement | null {
  const element = event.target;
  if (!(element instanceof Element)) return null;
  return element.closest<HTMLElement>("[data-preview-title]");
}

export function LinkPreview() {
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const timerRef = useRef<number | null>(null);
  const targetRef = useRef<HTMLElement | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const hide = useCallback(() => {
    clearTimer();
    targetRef.current = null;
    setPreview(null);
  }, [clearTimer]);

  const show = useCallback((target: HTMLElement) => {
    const title = target.dataset.previewTitle;
    if (!title) return;

    const rect = target.getBoundingClientRect();
    const width = Math.min(MAX_WIDTH, window.innerWidth - MARGIN * 2);
    const placement = rect.top > 96 ? "top" : "bottom";

    setPreview({
      title,
      subtitle: target.dataset.previewSubtitle,
      meta: target.dataset.previewMeta,
      left: Math.min(
        Math.max(rect.left, MARGIN),
        window.innerWidth - width - MARGIN,
      ),
      top: placement === "top" ? rect.top - MARGIN : rect.bottom + MARGIN,
      placement,
    });
  }, []);

  useEffect(() => {
    function onPointerOver(event: PointerEvent) {
      if (event.pointerType === "touch") return;

      const target = findTarget(event);
      if (!target || target === targetRef.current) return;

      clearTimer();
      targetRef.current = target;
      timerRef.current = window.setTimeout(() => {
        if (targetRef.current === target && target.isConnected) {
          show(target);
        }
      }, SHOW_DELAY_MS);
    }

    function onPointerOut(event: PointerEvent) {
      const target = findTarget(event);
      if (!target) return;

      const related = event.relatedTarget;
      if (related instanceof Node && target.contains(related)) return;
      if (targetRef.current === target) hide();
    }

    function onFocusIn(event: FocusEvent) {
      const target = findTarget(event);
      if (!target) return;

      hide();
      targetRef.current = target;
      timerRef.current = window.setTimeout(() => {
        if (targetRef.current === target) show(target);
      }, FOCUS_DELAY_MS);
    }

    function onFocusOut() {
      hide();
    }

    function onScroll() {
      hide();
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") hide();
    }

    document.addEventListener("pointerover", onPointerOver);
    document.addEventListener("pointerout", onPointerOut);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);

    return () => {
      clearTimer();
      document.removeEventListener("pointerover", onPointerOver);
      document.removeEventListener("pointerout", onPointerOut);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [clearTimer, hide, show]);

  return (
    <AnimatePresence>
      {preview ? (
        <motion.div
          data-link-preview=""
          aria-hidden="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.14, ease: "easeOut" }}
          className="pointer-events-none fixed z-[70] rounded-[var(--radius-sm)] border border-border-strong bg-surface-raised px-3 py-2"
          style={{
            left: preview.left,
            top: preview.top,
            width: Math.min(
              MAX_WIDTH,
              typeof window === "undefined"
                ? MAX_WIDTH
                : window.innerWidth - MARGIN * 2,
            ),
            transform:
              preview.placement === "top" ? "translateY(-100%)" : undefined,
          }}
        >
          <p className="m-0 font-mono text-[12px] leading-5 font-semibold tracking-[-0.01em] text-text-primary">
            {preview.title}
          </p>
          {preview.subtitle ? (
            <p className="mt-0.5 mb-0 line-clamp-2 text-[11px] leading-4 text-text-secondary">
              {preview.subtitle}
            </p>
          ) : null}
          {preview.meta ? (
            <p className="mt-1 mb-0 font-mono text-[9px] uppercase tracking-[0.08em] text-text-muted">
              {preview.meta}
            </p>
          ) : null}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
