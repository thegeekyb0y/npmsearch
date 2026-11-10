import Link from "next/link";
import type { TabItem } from "@/app/lib/types";
import { KeyHint } from "./key-hint";

export function TabRail({
  items,
  label = "Package views",
}: {
  items: TabItem[];
  label?: string;
}) {
  return (
    <nav
      aria-label={label}
      className="flex items-center gap-1 overflow-x-auto border-b border-border-subtle"
    >
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={item.active ? "page" : undefined}
          className={`-mb-px inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 font-mono text-[12px] transition-colors duration-150 ease-out ${
            item.active
              ? "border-brand text-text-primary"
              : "border-transparent text-text-secondary hover:text-text-primary"
          }`}
        >
          {item.label}
          {item.keyHint ? <KeyHint>{item.keyHint}</KeyHint> : null}
        </Link>
      ))}
    </nav>
  );
}
