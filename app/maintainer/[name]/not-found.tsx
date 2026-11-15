import Link from "next/link";
import { PageContainer, StatusPanel } from "@/app/components/ui";

export default function MaintainerNotFound() {
  return (
    <PageContainer className="py-10">
      <StatusPanel
        title="Maintainer not found"
        message="That handle is not a valid npm maintainer name. Check the spelling, or search for the packages instead."
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
