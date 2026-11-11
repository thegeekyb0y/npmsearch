"use client";

import { Clock3, Home, Package, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { POPULAR_PACKAGES } from "../lib/popular";
import { readRecentSearches, rememberSearch } from "../lib/recent-searches";
import { KeyHint } from "./key-hint";

type CommandItem = {
  id: string;
  label: string;
  hint: string;
  href: string;
  kind: "search" | "recent" | "package" | "route";
};

function iconFor(kind: CommandItem["kind"]) {
  switch (kind) {
    case "search":
      return Search;
    case "recent":
      return Clock3;
    case "package":
      return Package;
    default:
      return Home;
  }
}

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [previousOpen, setPreviousOpen] = useState(open);

  if (open !== previousOpen) {
    setPreviousOpen(open);
    if (open) {
      setQuery("");
      setActiveIndex(0);
    }
  }

  const recent = open ? readRecentSearches() : [];
  const normalized = query.trim().toLowerCase();
  const searchItem: CommandItem[] = query.trim()
    ? [
        {
          id: "search",
          label: `Search for "${query.trim()}"`,
          hint: "registry",
          href: `/search?q=${encodeURIComponent(query.trim())}`,
          kind: "search",
        },
      ]
    : [];

  const source: CommandItem[] = [
    ...recent.map((value) => ({
      id: `recent-${value}`,
      label: value,
      hint: "recent",
      href: `/search?q=${encodeURIComponent(value)}`,
      kind: "recent" as const,
    })),
    ...POPULAR_PACKAGES.map((name) => ({
      id: `package-${name}`,
      label: name,
      hint: "package",
      href: `/package/${name}`,
      kind: "package" as const,
    })),
    { id: "route-home", label: "Home", hint: "page", href: "/", kind: "route" },
    {
      id: "route-search",
      label: "Search",
      hint: "page",
      href: "/search",
      kind: "route",
    },
  ];

  const filtered = normalized
    ? source.filter((item) => item.label.toLowerCase().includes(normalized))
    : source;

  const items = [...searchItem, ...filtered].slice(0, 10);
  const safeActive = Math.min(activeIndex, Math.max(items.length - 1, 0));

  useEffect(() => {
    if (!open) return;

    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;

    previousFocusRef.current = document.activeElement as HTMLElement | null;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus());

    return () => {
      window.cancelAnimationFrame(frame);
      document.body.style.overflow = "";
      if (dialog.open) dialog.close();
    };
  }, [open]);

  useEffect(() => {
    const item = document.getElementById(`command-item-${safeActive}`);
    item?.scrollIntoView({ block: "nearest" });
  }, [safeActive, query, open]);

  useEffect(() => {
    if (open) {
      wasOpenRef.current = true;
      return;
    }

    if (!wasOpenRef.current) return;

    wasOpenRef.current = false;
    previousFocusRef.current?.focus();
  }, [open]);

  function close() {
    onOpenChange(false);
  }

  function select(item: CommandItem | undefined) {
    if (!item) return;

    if (item.kind === "search" || item.kind === "recent") {
      rememberSearch(
        item.kind === "search"
          ? query.trim()
          : item.label,
      );
    }

    close();
    router.push(item.href);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex(Math.min(safeActive + 1, items.length - 1));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex(Math.max(safeActive - 1, 0));
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      select(items[safeActive]);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      close();
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="command-palette-title"
      onClose={close}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
      className="m-auto w-[min(620px,calc(100vw-32px))] max-h-[min(70dvh,560px)] rounded-[var(--radius-md)] border border-border-strong bg-surface p-0 text-text-primary backdrop:bg-[rgb(0_0_0/0.65)]"
    >
      {open ? (
        <div className="flex flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-border-subtle px-4 py-3">
            <h2
              id="command-palette-title"
              className="m-0 font-mono text-[11px] uppercase tracking-[0.08em] text-text-label"
            >
              jump to
            </h2>
            <KeyHint>esc</KeyHint>
          </div>

          <div className="border-b border-border-subtle p-3">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={handleKeyDown}
              role="combobox"
              aria-expanded="true"
              aria-controls="command-palette-list"
              aria-activedescendant={
                items.length > 0 ? `command-item-${safeActive}` : undefined
              }
              aria-label="Search commands and packages"
              placeholder="jump to a package, search, or page…"
              autoComplete="off"
              spellCheck={false}
              className="min-h-11 w-full rounded-[var(--radius-sm)] border border-border-subtle bg-surface-code px-3 text-[14px] text-text-primary transition-colors duration-150 ease-out placeholder:text-text-secondary hover:border-border-strong focus:border-brand"
            />
          </div>

          <div
            id="command-palette-list"
            role="listbox"
            aria-label="Command results"
            className="max-h-[min(42dvh,340px)] overflow-y-auto p-2"
          >
            {items.length === 0 ? (
              <p className="m-0 px-2 py-4 text-[12px] text-text-secondary">
                No matches.
              </p>
            ) : (
              items.map((item, index) => {
                const Icon = iconFor(item.kind);
                return (
                  <button
                    key={item.id}
                    id={`command-item-${index}`}
                    type="button"
                    role="option"
                    aria-selected={index === safeActive}
                    tabIndex={-1}
                    onMouseEnter={() => setActiveIndex(index)}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      select(item);
                    }}
                    className={`flex min-h-11 w-full items-center gap-3 rounded-[var(--radius-sm)] px-2 text-left transition-colors duration-150 ease-out ${
                      index === safeActive
                        ? "bg-surface-raised text-text-primary"
                        : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                    }`}
                  >
                    <Icon
                      aria-hidden="true"
                      className="h-4 w-4 shrink-0 text-text-muted"
                      strokeWidth={1.8}
                    />
                    <span className="min-w-0 flex-1 truncate font-mono text-[12px]">
                      {item.label}
                    </span>
                    <span className="shrink-0 font-mono text-[9px] uppercase tracking-[0.08em] text-text-secondary">
                      {item.hint}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-border-subtle px-4 py-2.5 font-mono text-[10px] text-text-secondary">
            <span className="inline-flex items-center gap-2">
              <KeyHint>↑</KeyHint>
              <KeyHint>↓</KeyHint>
              navigate
            </span>
            <span className="inline-flex items-center gap-2">
              <KeyHint>↵</KeyHint>
              open
            </span>
          </div>
        </div>
      ) : null}
    </dialog>
  );
}
