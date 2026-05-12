import Link from "next/link";
import type { ReactNode } from "react";

const containerClass = "mx-auto w-full max-w-[var(--container-max)] px-4";
const inputClass =
  "min-h-11 w-full rounded-[var(--radius-md)] border border-border-subtle bg-surface-code px-4 text-text-primary placeholder:text-text-muted transition-colors duration-150 ease-out hover:border-border-strong hover:bg-[#101010] focus:outline-none focus:ring-0 focus:border-brand";
const primaryButtonClass =
  "inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-brand bg-brand px-4 text-[14px] font-medium text-white transition-colors duration-150 ease-out hover:border-brand-hover hover:bg-brand-hover";
const ghostButtonClass =
  "inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-border-subtle bg-transparent px-4 text-[14px] font-medium text-text-primary transition-colors duration-150 ease-out hover:border-border-strong hover:bg-surface";

export function AppShell({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-background text-text-primary">{children}</div>;
}

export function PageContainer({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`${containerClass} ${className}`.trim()}>{children}</div>;
}

export function AppHeader({ query }: { query?: string }) {
  return (
    <header className="sticky top-0 z-20 border-b border-border-subtle bg-[rgb(10_10_10/0.96)]">
      <PageContainer>
        <div className="flex min-h-[72px] flex-wrap items-center gap-4 py-4">
          <BrandLink />
          <div className="min-w-0 flex-1">
            <SearchForm query={query} compact />
          </div>
        </div>
      </PageContainer>
    </header>
  );
}

export function BrandLink() {
  return <Link href="/" className="inline-flex items-center gap-2 whitespace-nowrap text-[14px] font-medium tracking-[-0.01em] text-text-primary transition-colors duration-150 ease-out hover:text-brand"><span className="text-brand">npm</span><span>Search</span></Link>;
}

export function SearchForm({ query, action = "/search", submitLabel = "Search", placeholder = "Search packages", compact = false }: { query?: string; action?: string; submitLabel?: string; placeholder?: string; compact?: boolean }) {
  return <form action={action} method="GET" className="flex flex-wrap gap-2 sm:flex-nowrap"><input type="text" name="q" defaultValue={query} autoComplete="off" autoFocus={!compact} placeholder={placeholder} className={`${inputClass} ${compact ? "min-w-[180px]" : "min-w-[220px]"}`} /><button type="submit" className={primaryButtonClass}>{submitLabel}</button></form>;
}

export function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return <div className="flex flex-col gap-2"><h2 className="m-0 text-[18px] leading-[1.2] font-semibold tracking-[-0.01em] text-text-primary">{title}</h2>{subtitle ? <p className="m-0 text-[13px] leading-[1.5] text-text-muted">{subtitle}</p> : null}</div>;
}

export function VersionBadge({ version }: { version: string }) {
  return <span className="inline-flex min-h-6 items-center rounded-full border border-border-strong bg-[#1a1a1a] px-[10px] text-[12px] leading-none font-medium text-text-secondary">v{version}</span>;
}

export function ExactBadge() {
  return <span className="inline-flex min-h-6 items-center rounded-full border border-[var(--accent-soft-border)] bg-[var(--accent-soft-bg)] px-[10px] text-[12px] leading-none font-medium text-brand">Exact Match</span>;
}

export function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-[13px] font-medium text-text-secondary transition-colors duration-150 ease-out hover:text-text-primary">{children}<span aria-hidden="true">↗</span></a>;
}

export function StatusPanel({ title, message, error = false }: { title: string; message: string; error?: boolean }) {
  return <div className="rounded-[var(--radius-md)] border border-border-subtle bg-surface p-6"><h1 className={`m-0 text-[18px] leading-[1.2] font-semibold tracking-[-0.01em] ${error ? "text-destructive" : "text-text-primary"}`}>{title}</h1><p className={`mt-3 text-[16px] leading-[1.6] ${error ? "text-destructive" : "text-text-secondary"}`}>{message}</p></div>;
}

export function CopyButton({ copied, onClick }: { copied: boolean; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={ghostButtonClass}>{copied ? "Copied" : "Copy"}</button>;
}
