"use client";

import { Check, Link2 } from "lucide-react";
import { useState } from "react";

export function SectionLink({ id, title }: { id: string; title: string }) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      const url = new URL(window.location.href);
      url.hash = id;
      await navigator.clipboard.writeText(url.toString());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          void copyLink();
        }}
        aria-label={copied ? "Link copied" : `Copy link to ${title}`}
        className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-text-muted transition-colors duration-150 ease-out hover:bg-surface-hover hover:text-text-primary"
      >
        {copied ? (
          <Check
            aria-hidden="true"
            className="h-3.5 w-3.5 text-brand-2"
            strokeWidth={2}
          />
        ) : (
          <Link2
            aria-hidden="true"
            className="h-3.5 w-3.5"
            strokeWidth={1.8}
          />
        )}
      </button>
      <span className="sr-only" aria-live="polite">
        {copied ? `Link to ${title} copied` : ""}
      </span>
    </>
  );
}
