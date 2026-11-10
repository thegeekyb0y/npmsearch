export function KeyHint({
  children,
  className = "",
}: {
  children: string;
  className?: string;
}) {
  return (
    <kbd
      className={`inline-flex h-4 min-w-4 items-center justify-center rounded-[var(--radius-xs)] border border-border-strong bg-surface-code px-1 font-mono text-[10px] leading-none font-normal text-text-secondary ${className}`.trim()}
    >
      {children}
    </kbd>
  );
}
