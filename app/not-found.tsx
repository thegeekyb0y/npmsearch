import Link from "next/link";
import { PageContainer, StatusPanel } from "./components/ui";

export default function NotFound() {
  return (
    <PageContainer className="py-10">
      <StatusPanel
        title="Page not found"
        message="The page you asked for does not exist. Head back to the registry search."
      />
      <Link
        href="/"
        className="mt-4 inline-flex min-h-11 items-center justify-center rounded-[var(--radius-sm)] border border-border-subtle px-4 font-mono text-[12px] text-text-secondary transition-colors duration-150 ease-out hover:border-border-strong hover:bg-surface-raised hover:text-text-primary"
      >
        back to search
      </Link>
    </PageContainer>
  );
}
