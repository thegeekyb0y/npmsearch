import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { SectionLink } from "./section-link";

export function RailSection({
  title,
  id,
  subtitle,
  action,
  children,
}: {
  title: string;
  id?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className="border-t border-border-subtle py-5 first:border-t-0 first:pt-0"
    >
      <details open className="group relative">
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 pr-24 font-mono text-[11px] uppercase tracking-[0.08em] text-text-label transition-colors duration-150 ease-out hover:text-text-primary [&::-webkit-details-marker]:hidden">
          <ChevronRight
            aria-hidden="true"
            className="h-3.5 w-3.5 shrink-0 text-text-secondary transition-transform duration-200 ease-out group-open:rotate-90"
            strokeWidth={2}
          />
          <span className="truncate">{title}</span>
        </summary>
        <div className="absolute top-0 right-0 flex items-center gap-1">
          {id ? <SectionLink id={id} title={title} /> : null}
          {action}
        </div>
        {subtitle ? (
          <p className="mt-0.5 mb-0 ml-6 text-[11px] leading-5 text-text-secondary">
            {subtitle}
          </p>
        ) : null}
        <div className="mt-3 ml-6">{children}</div>
      </details>
    </section>
  );
}
