import type { ReactNode } from "react";

const containerClass = "mx-auto w-full max-w-[var(--container-max)] px-4 sm:px-6";
const ghostButtonClass =
  "inline-flex min-h-11 items-center justify-center rounded-[var(--radius-sm)] border border-border-subtle bg-transparent px-3 font-mono text-[12px] text-text-secondary transition-colors duration-150 ease-out hover:border-border-strong hover:bg-surface-raised hover:text-text-primary";

export function AppShell({ children }: { children: ReactNode }) {
  return <div className="bg-background text-text-primary">{children}</div>;
}

export function PageContainer({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`${containerClass} ${className}`.trim()}>{children}</div>;
}

export function SectionTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <h2 className="m-0 text-[16px] leading-[1.3] font-semibold tracking-[-0.01em] text-text-primary">
        {title}
      </h2>
      {subtitle ? (
        <p className="m-0 text-[12px] leading-5 text-text-secondary">{subtitle}</p>
      ) : null}
    </div>
  );
}

export function VersionBadge({ version }: { version: string }) {
  return (
    <span className="inline-flex min-h-6 items-center rounded-[var(--radius-sm)] border border-border-strong bg-transparent px-2 font-mono text-[11px] leading-none text-text-secondary">
      v{version}
    </span>
  );
}

export function ExactBadge() {
  return (
    <span className="inline-flex min-h-5 items-center rounded-[var(--radius-xs)] border border-[var(--accent-soft-border)] bg-[var(--accent-soft-bg)] px-1.5 font-mono text-[9px] leading-none uppercase tracking-[0.08em] text-brand">
      exact
    </span>
  );
}

export function ExternalLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="inline-flex items-center gap-1 font-mono text-[12px] text-text-secondary transition-colors duration-150 ease-out hover:text-text-primary"
    >
      {children}
      <span aria-hidden="true" className="text-[10px] text-text-muted">
        &#8599;
      </span>
    </a>
  );
}

export function StatusPanel({
  title,
  message,
  error = false,
}: {
  title: string;
  message: string;
  error?: boolean;
}) {
  return (
    <section
      role={error ? "alert" : "status"}
      className="border-y border-border-subtle py-10"
    >
      <h1
        className={`m-0 text-[18px] leading-[1.2] font-semibold tracking-[-0.01em] ${error ? "text-destructive" : "text-text-primary"}`}
      >
        {title}
      </h1>
      <p
        className={`mt-3 max-w-[68ch] text-[14px] leading-6 ${error ? "text-destructive" : "text-text-secondary"}`}
      >
        {message}
      </p>
    </section>
  );
}

export function CopyButton({
  copied,
  onClick,
}: {
  copied: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className={ghostButtonClass}>
      {copied ? "copied" : "copy"}
    </button>
  );
}
