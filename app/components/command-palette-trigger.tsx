"use client";

import { Command } from "lucide-react";
import { emitCommandPalette } from "../lib/keyboard-events";
import { KeyHint } from "./key-hint";

export function CommandPaletteTrigger() {
  return (
    <button
      type="button"
      onClick={emitCommandPalette}
      aria-label="Open command palette"
      className="inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-sm)] border border-border-subtle px-2 font-mono text-[11px] text-text-secondary transition-colors duration-150 ease-out hover:border-border-strong hover:text-text-primary"
    >
      <Command className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden="true" />
      <span className="hidden lg:inline">jump to…</span>
      <KeyHint className="hidden sm:inline-flex">Ctrl K</KeyHint>
    </button>
  );
}
