import { SkeletonBlock } from "@/app/components/skeleton";
import { PageContainer } from "@/app/components/ui";

export default function LoadingPackagePage() {
  return (
    <PageContainer className="py-6">
      <main className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-10">
        <div className="min-w-0 space-y-4" aria-busy="true" aria-label="Loading package">
          <div className="border-b border-border-subtle pb-5">
            <SkeletonBlock className="h-3 w-16" />
            <div className="mt-3 flex items-center gap-3">
              <SkeletonBlock className="h-10 w-[min(320px,70%)]" />
              <SkeletonBlock className="h-6 w-16" />
            </div>
            <SkeletonBlock className="mt-4 h-4 w-full max-w-[680px]" />
            <div className="mt-4 flex flex-wrap gap-3">
              <SkeletonBlock className="h-4 w-40" />
              <SkeletonBlock className="h-4 w-16" />
              <SkeletonBlock className="h-4 w-20" />
            </div>
            <div className="mt-4 flex gap-2">
              <SkeletonBlock className="h-6 w-24" />
              <SkeletonBlock className="h-6 w-16" />
            </div>
          </div>

          <div className="flex gap-4 border-b border-border-subtle py-3">
            <SkeletonBlock className="h-5 w-20" />
            <SkeletonBlock className="h-5 w-16" />
          </div>

          <div className="grid grid-cols-2 gap-4 border-y border-border-subtle py-3 sm:grid-cols-3 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="space-y-2">
                <SkeletonBlock className="h-3 w-16" />
                <SkeletonBlock className="h-4 w-20" />
              </div>
            ))}
          </div>

          <SkeletonBlock className="h-14 w-full" />

          <div className="space-y-4 pt-2">
            <SkeletonBlock className="h-6 w-24" />
            <SkeletonBlock className="h-4 w-full" />
            <SkeletonBlock className="h-4 w-[92%]" />
            <SkeletonBlock className="h-4 w-[88%]" />
            <SkeletonBlock className="h-40 w-full" />
          </div>
        </div>

        <div className="min-w-0 space-y-6" aria-hidden="true">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="border-t border-border-subtle pt-4 first:border-t-0 first:pt-0">
              <SkeletonBlock className="h-3 w-28" />
              <SkeletonBlock className="mt-4 h-6 w-24" />
              <SkeletonBlock className="mt-4 h-14 w-full" />
            </div>
          ))}
        </div>
      </main>
    </PageContainer>
  );
}
