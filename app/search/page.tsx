import { SearchResultsView } from "../components/search-results";
import { AppShell, PageContainer } from "../components/ui";
import { searchPackages } from "../lib/registry";
import type { SearchResults } from "../lib/types";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  let data: SearchResults | undefined;

  if (query) {
    try {
      data = await searchPackages(query);
    } catch {
      // The client retries the query; a server hiccup must not replace results
      // with a terminal error panel.
      data = undefined;
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
