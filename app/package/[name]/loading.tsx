import { AppShell, PageContainer } from "@/app/components/ui";

function SkeletonBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-[var(--radius-md)] bg-[#171717] ${className}`} />;
}

export default function LoadingPackagePage() {
  return (
    <AppShell>
      <PageContainer className="py-5">
        <main className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-5">
            <section className="rounded-[var(--radius-md)] border border-border-subtle bg-surface px-4 py-4 md:px-5">
              <div className="space-y-4">
                <SkeletonBlock className="h-10 w-56" />
                <SkeletonBlock className="h-5 w-full max-w-[680px]" />
                <div className="flex flex-wrap gap-2">
                  <SkeletonBlock className="h-7 w-20" />
                  <SkeletonBlock className="h-7 w-28" />
                  <SkeletonBlock className="h-7 w-24" />
                </div>
              </div>
            </section>

            <section className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-7">
              {Array.from({ length: 7 }).map((_, index) => (
                <div
                  key={index}
                  className="rounded-[var(--radius-md)] border border-border-subtle bg-surface px-3 py-3"
                >
                  <SkeletonBlock className="h-4 w-20" />
                  <SkeletonBlock className="mt-3 h-4 w-16" />
                </div>
              ))}
            </section>

            <section className="rounded-[var(--radius-md)] border border-[#1a1a1a] bg-surface-code px-4 py-4">
              <SkeletonBlock className="h-5 w-40" />
            </section>

            <section className="rounded-[var(--radius-md)] border border-border-subtle bg-surface px-4 py-4 md:px-5">
              <div className="space-y-4">
                <SkeletonBlock className="h-6 w-28" />
                <SkeletonBlock className="h-5 w-full" />
                <SkeletonBlock className="h-5 w-[92%]" />
                <SkeletonBlock className="h-5 w-[88%]" />
                <SkeletonBlock className="h-40 w-full" />
              </div>
            </section>
          </div>

          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <section
                key={index}
                className="rounded-[var(--radius-md)] border border-border-subtle bg-surface px-4 py-4"
              >
                <SkeletonBlock className="h-5 w-28" />
                <SkeletonBlock className="mt-4 h-16 w-full" />
              </section>
            ))}
          </div>
        </main>
      </PageContainer>
    </AppShell>
  );
}
