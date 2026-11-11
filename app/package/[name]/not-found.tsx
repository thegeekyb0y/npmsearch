import Link from "next/link";
import { PageContainer, StatusPanel } from "@/app/components/ui";

export default function PackageNotFound() {
  return (
    <PageContainer className="py-10">
      <StatusPanel
        title="Package not found"
        message="This package is not in the npm registry, or its name changed. Check the spelling and try again."
      />
      <Link
        href="/search?q=react"
        className="mt-4 inline-flex min-h-11 items-center justify-center rounded-[var(--radius-sm)] border border-border-subtle px-4 font-mono text-[12px] text-text-secondary transition-colors duration-150 ease-out hover:border-border-strong hover:bg-surface-raised hover:text-text-primary"
      >
        browse packages
      </Link>
    </PageContainer>
  );
}
