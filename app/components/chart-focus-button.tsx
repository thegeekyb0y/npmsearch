"use client";

import { ChartLine } from "lucide-react";

export function ChartFocusButton() {
  return (
    <button
      type="button"
      aria-label="Inspect download trend"
      title="Inspect download trend"
      onClick={(event) => {
        event.stopPropagation();
        document.getElementById("download-chart")?.focus();
      }}
      className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-text-muted transition-colors duration-150 ease-out hover:bg-surface-hover hover:text-text-primary"
    >
      <ChartLine aria-hidden="true" className="h-4 w-4" strokeWidth={1.8} />
    </button>
  );
}
