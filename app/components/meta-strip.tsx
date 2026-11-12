import type { MetaItem } from "@/app/lib/types";

export function MetaStrip({ items }: { items: MetaItem[] }) {
  return (
    <dl className="grid grid-cols-2 border-y border-border-subtle sm:grid-cols-3 lg:grid-cols-5">
      {items.map((item) => (
        <div
          key={item.label}
          className="min-w-0 py-4 pr-3 last:col-span-2 sm:px-5 sm:first:pl-0 sm:last:col-span-1 lg:border-l lg:border-border-subtle lg:first:border-l-0"
          title={item.hint}
        >
          <dt className="truncate font-mono text-[10px] uppercase tracking-[0.08em] text-text-label">
            {item.label}
          </dt>
          <dd className="mt-1.5 truncate font-mono text-[14px] text-text-primary">
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
