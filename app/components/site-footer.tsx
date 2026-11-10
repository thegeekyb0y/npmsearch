export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border-subtle">
      <div className="mx-auto flex w-full max-w-[var(--container-max)] flex-col gap-2 px-4 py-6 font-mono text-[11px] text-text-secondary sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <span>data · registry.npmjs.org</span>
        <span>npmsearch — not affiliated with npm, Inc.</span>
      </div>
    </footer>
  );
}
