import { SearchRow } from "../components/search-row";
import { AppShell, PageContainer, StatusPanel } from "../components/ui";
import { searchPackages } from "../lib/registry";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim();

  if (!query) {
    return (
      <AppShell>
        <PageContainer className="py-8">
          <StatusPanel
            title="Search the npm registry"
            message="Enter a package name, scope, or keyword to explore results."
          />
        </PageContainer>
      </AppShell>
    );
  }

  let data;

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

  return (
    <AppShell>
      <PageContainer className="py-8">
        <main>
          <header className="flex flex-col gap-2 pb-5">
            <p className="m-0 font-mono text-[11px] uppercase tracking-[0.08em] text-text-label">
              search
            </p>
            <h1 className="m-0 font-mono text-[clamp(20px,4vw,28px)] leading-[1.2] font-semibold tracking-[-0.02em] text-text-primary">
              <span className="text-brand">
                {data.total.toLocaleString("en-US")}
              </span>{" "}
              packages for &quot;{query}&quot;
            </h1>
            <p className="m-0 text-[12px] leading-5 text-text-secondary">
              Ranked by registry relevance · weekly downloads from npm
            </p>
          </header>

          {data.results.length === 0 ? (
            <StatusPanel
              title="No packages found"
              message={`No results matched "${query}". Try a broader term or a different package name.`}
            />
          ) : (
            <div className="border-t border-border-subtle">
              {data.results.map((item) => (
                <SearchRow key={item.name} item={item} />
              ))}
            </div>
          )}
        </main>
      </PageContainer>
    </AppShell>
  );
}
