import type { ReactNode } from "react";

export function RailSection({
  title,
  id,
  subtitle,
  children,
}: {
  title: string;
  id?: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="border-t border-border-subtle py-4 first:border-t-0 first:pt-0">
      <details open className="group">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
          <span className="flex min-w-0 items-center gap-2 font-mono text-[11px] uppercase tracking-[0.08em] text-text-label">
            <span
              aria-hidden="true"
              className="inline-block text-[10px] text-text-muted transition-transform duration-150 ease-out group-open:rotate-90"
            >
              &#9656;
            </span>
            <span className="truncate">{title}</span>
          </span>
          {id ? (
            <a
              href={`#${id}`}
              aria-label={`Link to ${title}`}
              className="shrink-0 font-mono text-[11px] text-text-muted transition-colors duration-150 ease-out hover:text-text-primary"
            >
              #
            </a>
          ) : null}
        </summary>
        {subtitle ? (
          <p className="mt-1 ml-4 text-[12px] leading-5 text-text-muted">{subtitle}</p>
        ) : null}
        <div className="mt-3">{children}</div>
      </details>
    </section>
  );
}
