import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

export function ShowMore({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <details className="group/more border-t border-border-subtle">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1.5 font-mono text-[11px] text-text-secondary transition-colors duration-150 ease-out hover:text-text-primary [&::-webkit-details-marker]:hidden">
        <ChevronRight
          aria-hidden="true"
          className="h-3 w-3 shrink-0 transition-transform duration-200 ease-out group-open/more:rotate-90"
          strokeWidth={2}
        />
        <span className="truncate">{label}</span>
      </summary>
      <div>{children}</div>
    </details>
  );
}
