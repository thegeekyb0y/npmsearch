import { SearchResultsView } from "../components/search-results";
import { AppShell, PageContainer, StatusPanel } from "../components/ui";
import { searchPackages } from "../lib/registry";
import type { SearchResults } from "../lib/types";

const EMPTY_RESULTS: SearchResults = {
  total: 0,
  results: [],
  from: 0,
  size: 20,
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  let data = EMPTY_RESULTS;

  if (query) {
    try {
      data = await searchPackages(query);
    } catch {
      return (
        <AppShell>
          <PageContainer className="py-8">
            <StatusPanel
              error
              title="Search is unavailable"
              message="We couldn't reach the npm registry right now. Try the same query again in a moment."
            />
          </PageContainer>
        </AppShell>
      );
    }
  }

  return (
    <AppShell>
      <PageContainer className="py-8">
        <main>
          <SearchResultsView initialQuery={query} initialData={data} />
        </main>
      </PageContainer>
    </AppShell>
  );
}
