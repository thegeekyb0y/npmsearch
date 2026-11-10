import { SearchSkeleton, SkeletonBlock } from "../components/skeleton";
import { PageContainer } from "../components/ui";

export default function LoadingSearchPage() {
  return (
    <PageContainer className="py-8">
      <div className="pb-5" aria-busy="true" aria-label="Loading search results">
        <SkeletonBlock className="h-3 w-16" />
        <SkeletonBlock className="mt-3 h-7 w-[min(480px,80%)]" />
        <SkeletonBlock className="mt-3 h-3 w-64" />
      </div>
      <SearchSkeleton rows={8} />
    </PageContainer>
  );
}
