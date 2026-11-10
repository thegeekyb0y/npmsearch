import Link from "next/link";
import type { PackageSummary } from "@/app/lib/types";
import { ExactBadge } from "./ui";

function formatDate(value?: string) {
  if (!value) return undefined;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function SearchRow({ item }: { item: PackageSummary }) {
  const publishedAt = formatDate(item.publishedAt);

  return (
    <Link
      href={`/package/${item.name}`}
      className="group relative block border-b border-border-subtle transition-colors duration-150 ease-out hover:bg-surface-hover focus-visible:bg-surface-hover"
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-[2px] bg-brand opacity-0 transition-opacity duration-150 ease-out group-hover:opacity-100 group-focus-visible:opacity-100"
      />
      <div className="flex items-start justify-between gap-4 py-4 pr-2 pl-3 sm:pl-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <h2 className="truncate font-mono text-[15px] leading-6 font-semibold tracking-[-0.01em] text-text-primary transition-colors duration-150 ease-out group-hover:text-brand">
              {item.name}
            </h2>
            {item.exact ? <ExactBadge /> : null}
            <span className="font-mono text-[11px] text-text-muted">v{item.version}</span>
          </div>
          <p className="mt-1 line-clamp-2 max-w-[74ch] text-[13px] leading-6 text-text-secondary">
            {item.description?.trim() || "No description provided."}
          </p>
        </div>
        <div className="shrink-0 text-right font-mono text-[11px] leading-5 text-text-muted">
          {publishedAt ? <div className="hidden sm:block">{publishedAt}</div> : null}
          <div className="text-text-secondary">
            {typeof item.weeklyDownloads === "number"
              ? `${new Intl.NumberFormat("en-US", { notation: "compact" }).format(item.weeklyDownloads)} / wk`
              : "—"}
          </div>
        </div>
      </div>
    </Link>
  );
}
