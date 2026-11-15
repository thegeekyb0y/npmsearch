import { SkeletonBlock } from "@/app/components/skeleton";
import { PageContainer } from "@/app/components/ui";

export default function LoadingMaintainerPage() {
  return (
    <PageContainer className="py-8 lg:py-10">
      <SkeletonBlock className="h-4 w-16" />

      <div className="mt-4 rounded-[var(--radius-md)] border border-border-subtle bg-surface p-5 sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <SkeletonBlock className="h-24 w-24 shrink-0" />
          <div className="min-w-0 flex-1 space-y-3">
            <SkeletonBlock className="h-3 w-28" />
            <SkeletonBlock className="h-12 w-[min(320px,70%)]" />
            <SkeletonBlock className="h-3 w-48" />
          </div>
        </div>
        <SkeletonBlock className="mt-5 h-6 w-full" />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className={`rounded-[var(--radius-sm)] border border-border-subtle bg-surface p-4 ${
              index === 2 ? "col-span-2 sm:col-span-1" : ""
            }`}
          >
            <SkeletonBlock className="h-0.5 w-7" />
            <SkeletonBlock className="mt-3 h-6 w-24" />
            <SkeletonBlock className="mt-2 h-3 w-16" />
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[1.15fr_0.85fr]">
        <SkeletonBlock className="h-64 w-full" />
        <SkeletonBlock className="h-64 w-full" />
      </div>

      <SkeletonBlock className="mt-4 h-32 w-full" />
    </PageContainer>
  );
}
