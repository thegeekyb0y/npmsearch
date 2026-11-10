"use client";

import { Check, ChevronDown, Copy } from "lucide-react";
import { useState } from "react";

const MANAGERS = [
  { id: "npm", label: "npm", build: (name: string) => `npm install ${name}` },
  { id: "pnpm", label: "pnpm", build: (name: string) => `pnpm add ${name}` },
  { id: "yarn", label: "yarn", build: (name: string) => `yarn add ${name}` },
  { id: "bun", label: "bun", build: (name: string) => `bun add ${name}` },
] as const;

type ManagerId = (typeof MANAGERS)[number]["id"];

export function InstallBlock({ packageName }: { packageName: string }) {
  const [manager, setManager] = useState<ManagerId>("npm");
  const [copied, setCopied] = useState(false);
  const selected = MANAGERS.find((entry) => entry.id === manager) ?? MANAGERS[0];
  const command = selected.build(packageName);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-border-subtle bg-surface-code py-2 pr-2 pl-4">
      <span aria-hidden="true" className="shrink-0 font-mono text-[13px] text-brand">
        $
      </span>
      <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap font-mono text-[13px] text-text-primary">
        {command}
      </code>

      <span className="sr-only" aria-live="polite">
        {copied ? "Copied install command" : ""}
      </span>
      <button
        type="button"
        onClick={handleCopy}
        aria-label={copied ? "Copied install command" : "Copy install command"}
        className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-text-secondary transition-colors duration-150 ease-out hover:bg-surface-raised hover:text-text-primary"
      >
        {copied ? (
          <Check className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
        ) : (
          <Copy className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
        )}
      </button>

      <div className="relative shrink-0">
        <select
          aria-label="Package manager"
          value={manager}
          onChange={(event) => setManager(event.target.value as ManagerId)}
          className="min-h-11 appearance-none rounded-[var(--radius-sm)] border border-border-subtle bg-transparent py-1 pr-7 pl-2 font-mono text-[12px] text-text-secondary transition-colors duration-150 ease-out hover:border-border-strong hover:text-text-primary focus:border-brand focus:outline-none"
        >
          {MANAGERS.map((entry) => (
            <option key={entry.id} value={entry.id} className="bg-surface text-text-primary">
              {entry.label}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted"
          strokeWidth={1.8}
        />
      </div>
    </div>
  );
}
