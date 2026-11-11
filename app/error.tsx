"use client";

import { useEffect } from "react";
import { PageContainer, StatusPanel } from "./components/ui";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <PageContainer className="py-10">
      <StatusPanel
        error
        title="Something went wrong"
        message="This view failed to load. You can retry, or go back to the registry search."
      />
      <button
        type="button"
        onClick={reset}
        className="mt-4 inline-flex min-h-11 items-center justify-center rounded-[var(--radius-sm)] border border-border-subtle px-4 font-mono text-[12px] text-text-secondary transition-colors duration-150 ease-out hover:border-border-strong hover:bg-surface-raised hover:text-text-primary"
      >
        try again
      </button>
    </PageContainer>
  );
}
