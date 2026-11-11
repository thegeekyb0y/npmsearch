"use client";

import { useEffect, useState } from "react";
import { COMMAND_PALETTE_EVENT } from "../lib/keyboard-events";
import { focusGlobalSearch, isEditableTarget } from "../lib/keyboard";
import { CommandPalette } from "./command-palette";

export function GlobalShortcuts() {
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.repeat) return;

      const modifier = event.metaKey || event.ctrlKey;

      if (modifier && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((open) => !open);
        return;
      }

      if (
        event.key === "/" &&
        !modifier &&
        !event.altKey &&
        !isEditableTarget(event.target)
      ) {
        event.preventDefault();
        focusGlobalSearch();
      }
    }

    function handleOpenPalette() {
      setPaletteOpen(true);
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener(COMMAND_PALETTE_EVENT, handleOpenPalette);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener(COMMAND_PALETTE_EVENT, handleOpenPalette);
    };
  }, []);

  return (
    <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
  );
}
