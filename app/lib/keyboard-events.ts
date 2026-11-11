export const COMMAND_PALETTE_EVENT = "npmsearch:command-palette";
export const FOCUS_RESULTS_EVENT = "npmsearch:focus-results";

export function emitCommandPalette() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(COMMAND_PALETTE_EVENT));
}

export function emitFocusResults() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(FOCUS_RESULTS_EVENT));
}
