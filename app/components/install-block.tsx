"use client";

import { Check, ChevronDown, Copy } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";

const MANAGERS = [
  { id: "npm", label: "npm", build: (name: string) => `npm install ${name}` },
  { id: "pnpm", label: "pnpm", build: (name: string) => `pnpm add ${name}` },
  { id: "yarn", label: "yarn", build: (name: string) => `yarn add ${name}` },
  { id: "bun", label: "bun", build: (name: string) => `bun add ${name}` },
] as const;

type ManagerId = (typeof MANAGERS)[number]["id"];

export function InstallBlock({
  packageName,
  version,
}: {
  packageName: string;
  version?: string;
}) {
  const [manager, setManager] = useState<ManagerId>("npm");
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const selectedIndex = Math.max(
    MANAGERS.findIndex((entry) => entry.id === manager),
    0,
  );
  const selected = MANAGERS[selectedIndex];
  const target = version ? `${packageName}@${version}` : packageName;
  const command = selected.build(target);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;

      if (!(target instanceof Node)) return;
      if (menuRef.current?.contains(target)) return;
      if (buttonRef.current?.contains(target)) return;

      setOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function focusOption(index: number) {
    menuRef.current
      ?.querySelectorAll<HTMLButtonElement>('[role="option"]')
      [index]?.focus();
  }

  function openMenu() {
    setOpen(true);
    window.requestAnimationFrame(() => {
      menuRef.current
        ?.querySelectorAll<HTMLButtonElement>('[role="option"]')
        [selectedIndex]?.focus();
    });
  }

  function closeMenu(restoreFocus = false) {
    setOpen(false);
    if (restoreFocus) buttonRef.current?.focus();
  }

  function choose(id: ManagerId) {
    setManager(id);
    closeMenu(true);
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  function handleOptionKeyDown(
    event: ReactKeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        focusOption(Math.min(index + 1, MANAGERS.length - 1));
        break;
      case "ArrowUp":
        event.preventDefault();
        focusOption(Math.max(index - 1, 0));
        break;
      case "Home":
        event.preventDefault();
        focusOption(0);
        break;
      case "End":
        event.preventDefault();
        focusOption(MANAGERS.length - 1);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        choose(MANAGERS[index].id);
        break;
      case "Escape":
        event.preventDefault();
        closeMenu(true);
        break;
      case "Tab":
        closeMenu();
        break;
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
        <button
          ref={buttonRef}
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls="package-manager-menu"
          onClick={() => (open ? closeMenu() : openMenu())}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              openMenu();
            }
          }}
          className={`inline-flex min-h-11 items-center gap-1.5 rounded-[var(--radius-sm)] border bg-transparent py-1 pr-2 pl-2 font-mono text-[12px] transition-colors duration-150 ease-out ${
            open
              ? "border-brand text-text-primary"
              : "border-border-subtle text-text-secondary hover:border-border-strong hover:text-text-primary"
          }`}
        >
          {selected.label}
          <ChevronDown
            aria-hidden="true"
            className={`h-3.5 w-3.5 text-text-muted transition-transform duration-150 ease-out ${
              open ? "rotate-180" : ""
            }`}
            strokeWidth={1.8}
          />
        </button>

        {open ? (
          <div
            ref={menuRef}
            id="package-manager-menu"
            role="listbox"
            aria-label="Package manager"
            className="absolute top-full right-0 z-50 mt-1 w-32 rounded-[var(--radius-sm)] border border-border-strong bg-surface-raised p-1"
          >
            {MANAGERS.map((entry, index) => {
              const isSelected = entry.id === manager;

              return (
                <button
                  key={entry.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  tabIndex={-1}
                  onClick={() => choose(entry.id)}
                  onKeyDown={(event) => handleOptionKeyDown(event, index)}
                  className={`flex min-h-9 w-full items-center justify-between rounded-[var(--radius-xs)] px-2 text-left font-mono text-[12px] outline-none transition-colors duration-150 ease-out hover:bg-surface-hover hover:text-text-primary focus-visible:bg-[var(--accent-soft-bg)] focus-visible:text-brand ${
                    isSelected ? "text-text-primary" : "text-text-secondary"
                  }`}
                >
                  {entry.label}
                  {isSelected ? (
                    <Check
                      aria-hidden="true"
                      className="h-3 w-3 text-brand"
                      strokeWidth={1.8}
                    />
                  ) : null}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
