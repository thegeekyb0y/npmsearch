export function SkeletonBlock({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-[var(--radius-sm)] bg-surface-raised ${className}`.trim()}
    />
  );
}

export function SearchRowSkeleton() {
  return (
    <div className="border-b border-border-subtle py-4 pr-2 pl-3 sm:pl-4">
      <div className="flex items-start justify-between gap-4">
        <div className="w-full max-w-[560px] space-y-2">
          <div className="flex items-center gap-2">
            <SkeletonBlock className="h-4 w-40" />
            <SkeletonBlock className="h-4 w-10" />
          </div>
          <SkeletonBlock className="h-3.5 w-full" />
          <SkeletonBlock className="h-3.5 w-2/3" />
        </div>
        <SkeletonBlock className="h-3.5 w-16 shrink-0" />
      </div>
    </div>
  );
}

export function SearchSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading search results">
      {Array.from({ length: rows }).map((_, index) => (
        <SearchRowSkeleton key={index} />
      ))}
    </div>
  );
}
