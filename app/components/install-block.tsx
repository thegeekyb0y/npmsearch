"use client";

import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronDown, Copy } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { createPortal } from "react-dom";

const MANAGERS = [
  {
    id: "npm",
    label: "npm",
    monogram: "n",
    tone: "bg-[#cb3837] text-white",
    build: (name: string) => `npm install ${name}`,
  },
  {
    id: "pnpm",
    label: "pnpm",
    monogram: "p",
    tone: "bg-[#f9ad00] text-[#1a1a1a]",
    build: (name: string) => `pnpm add ${name}`,
  },
  {
    id: "yarn",
    label: "yarn",
    monogram: "y",
    tone: "bg-[#2c8ebb] text-white",
    build: (name: string) => `yarn add ${name}`,
  },
  {
    id: "bun",
    label: "bun",
    monogram: "b",
    tone: "bg-[#f3e9d8] text-[#1a1a1a]",
    build: (name: string) => `bun add ${name}`,
  },
] as const;

type ManagerId = (typeof MANAGERS)[number]["id"];

const MENU_HEIGHT = 4 * 36 + 8;
const LISTBOX_ID = "package-manager-menu";

type MenuPosition = {
  top: number;
  left: number;
  width: number;
  placement: "top" | "bottom";
};

function ManagerIcon({ manager }: { manager: (typeof MANAGERS)[number] }) {
  return (
    <span
      aria-hidden="true"
      className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[2px] text-[9px] leading-none font-semibold uppercase ${manager.tone}`}
    >
      {manager.monogram}
    </span>
  );
}

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
  const [highlighted, setHighlighted] = useState(0);
  const [position, setPosition] = useState<MenuPosition | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);

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

    function handleScroll() {
      setOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleScroll);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleScroll);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const frame = window.requestAnimationFrame(() => {
      menuRef.current?.focus();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  function openMenu() {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;

    const width = Math.max(rect.width, 132);
    const fitsBelow = rect.bottom + MENU_HEIGHT + 12 < window.innerHeight;
    const placement = fitsBelow ? "bottom" : "top";

    setPosition({
      top:
        placement === "top"
          ? rect.top - MENU_HEIGHT - 4
          : rect.bottom + 4,
      left: Math.min(
        Math.max(rect.right - width, 8),
        window.innerWidth - width - 8,
      ),
      width,
      placement,
    });
    setHighlighted(selectedIndex);
    setOpen(true);
  }

  function closeMenu(focusTrigger = false) {
    setOpen(false);
    if (focusTrigger) buttonRef.current?.focus();
  }

  function choose(id: ManagerId) {
    setManager(id);
    closeMenu(true);
  }

  function handleTriggerKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>) {
    if (open) return;

    if (
      event.key === "ArrowDown" ||
      event.key === "ArrowUp" ||
      event.key === "Enter" ||
      event.key === " "
    ) {
      event.preventDefault();
      openMenu();
    }
  }

  function handleMenuKeyDown(event: ReactKeyboardEvent<HTMLUListElement>) {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setHighlighted((index) => (index + 1) % MANAGERS.length);
        break;
      case "ArrowUp":
        event.preventDefault();
        setHighlighted(
          (index) => (index - 1 + MANAGERS.length) % MANAGERS.length,
        );
        break;
      case "Home":
        event.preventDefault();
        setHighlighted(0);
        break;
      case "End":
        event.preventDefault();
        setHighlighted(MANAGERS.length - 1);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        choose(MANAGERS[highlighted].id);
        break;
      case "Escape":
        event.preventDefault();
        closeMenu(true);
        break;
      case "Tab":
        event.preventDefault();
        closeMenu(true);
        break;
    }
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

  return (
    <div className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-border-subtle bg-surface-code py-2 pr-2 pl-4">
      <span
        aria-hidden="true"
        className="shrink-0 font-mono text-[13px] text-brand"
      >
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

      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? LISTBOX_ID : undefined}
        onClick={() => (open ? closeMenu() : openMenu())}
        onKeyDown={handleTriggerKeyDown}
        className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-[var(--radius-sm)] border bg-transparent py-1 pr-2 pl-2 font-mono text-[12px] transition-colors duration-150 ease-out ${
          open
            ? "border-brand text-text-primary"
            : "border-border-subtle text-text-secondary hover:border-border-strong hover:text-text-primary"
        }`}
      >
        <ManagerIcon manager={selected} />
        {selected.label}
        <ChevronDown
          aria-hidden="true"
          className={`h-3.5 w-3.5 text-text-muted transition-transform duration-150 ease-out ${
            open ? "rotate-180" : ""
          }`}
          strokeWidth={1.8}
        />
      </button>

      {typeof document !== "undefined"
        ? createPortal(
            <AnimatePresence>
              {open && position ? (
                <motion.ul
                  key="package-manager-menu"
                  ref={menuRef}
                  id={LISTBOX_ID}
                  role="listbox"
                  aria-label="Package manager"
                  tabIndex={-1}
                  aria-activedescendant={`${LISTBOX_ID}-${MANAGERS[highlighted].id}`}
                  onKeyDown={handleMenuKeyDown}
                  initial={{
                    opacity: 0,
                    scale: 0.98,
                    y: position.placement === "top" ? 4 : -4,
                  }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.14, ease: "easeOut" }}
                  style={{
                    position: "fixed",
                    top: position.top,
                    left: position.left,
                    width: position.width,
                    zIndex: 70,
                    transformOrigin:
                      position.placement === "top"
                        ? "bottom right"
                        : "top right",
                  }}
                  className="overflow-hidden rounded-[var(--radius-sm)] border border-border-strong bg-surface-raised p-1 outline-none"
                >
                  {MANAGERS.map((entry, index) => {
                    const isSelected = entry.id === manager;
                    const isHighlighted = index === highlighted;

                    return (
                      <li
                        key={entry.id}
                        id={`${LISTBOX_ID}-${entry.id}`}
                        role="option"
                        aria-selected={isSelected}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => choose(entry.id)}
                        onMouseEnter={() => setHighlighted(index)}
                        className={`flex min-h-9 cursor-pointer items-center gap-2 rounded-[var(--radius-xs)] px-2 font-mono text-[12px] transition-colors duration-150 ease-out ${
                          isSelected ? "text-text-primary" : "text-text-secondary"
                        } ${
                          isHighlighted
                            ? "bg-surface-hover text-text-primary"
                            : ""
                        }`}
                      >
                        <ManagerIcon manager={entry} />
                        <span>{entry.label}</span>
                        {isSelected ? (
                          <Check
                            aria-hidden="true"
                            className="ms-auto h-3 w-3 text-brand"
                            strokeWidth={2}
                          />
                        ) : null}
                      </li>
                    );
                  })}
                </motion.ul>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </div>
  );
}
