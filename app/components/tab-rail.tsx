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
      className="flex items-center gap-1 border-b border-border-subtle"
    >
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={item.active ? "page" : undefined}
          className={`-mb-px inline-flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-4 font-mono text-[12px] transition-colors duration-150 ease-out ${
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
