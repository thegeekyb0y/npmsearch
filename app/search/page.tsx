import { getBaseUrl } from "../lib/get-base-url";
import type { PackageSummary } from "../lib/types";
import { SearchRow } from "../components/search-row";
import { AppShell, PageContainer, StatusPanel } from "../components/ui";

interface Package {
  name: string;
  version: string;
  description?: string;
  links: {
    npm: string;
    homepage?: string;
    repository?: string;
  };
}

interface SearchResult {
  package: Package;
  score: { final: number };
  weeklyDownloads?: number;
}

interface SearchResponse {
  total?: number;
  results: SearchResult[];
}

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

  let data: SearchResponse = { total: 0, results: [] };

  try {
    const baseUrl = await getBaseUrl();
    const res = await fetch(
      `${baseUrl}/api/search?q=${encodeURIComponent(query)}`,
      { cache: "no-store" },
    );
    if (!res.ok) throw new Error("Failed to fetch search results");
    data = await res.json();

    if (data.results.length > 0) {
      const downloadPromises = data.results.map((item) =>
        fetch(
          `https://api.npmjs.org/downloads/point/last-week/${item.package.name}`,
        )
          .then((downloadRes) =>
            downloadRes.ok ? downloadRes.json() : { downloads: undefined },
          )
          .catch(() => ({ downloads: undefined })),
      );
      const downloadStats = await Promise.all(downloadPromises);
      data.results = data.results.map((item, index) => ({
        ...item,
        weeklyDownloads: downloadStats[index]?.downloads,
      }));
    }
  } catch {
    return (
      <AppShell>
        <PageContainer className="py-8">
          <StatusPanel
            error
            title="Search is unavailable"
            message="We couldn't load registry results right now. Try the same query again in a moment."
          />
        </PageContainer>
      </AppShell>
    );
  }

  const results = data.results ?? [];
  const summaryCount =
    typeof data.total === "number" ? data.total : results.length;
  const normalizedQuery = query.toLowerCase();

  const rows: PackageSummary[] = results.map((item) => ({
    name: item.package.name,
    version: item.package.version,
    description: item.package.description,
    links: item.package.links,
    weeklyDownloads: item.weeklyDownloads,
    exact: item.package.name.toLowerCase() === normalizedQuery,
  }));

  return (
    <AppShell>
      <PageContainer className="py-8">
        <main>
          <header className="flex flex-col gap-2 pb-5">
            <p className="m-0 font-mono text-[11px] uppercase tracking-[0.08em] text-text-label">
              search
            </p>
            <h1 className="m-0 font-mono text-[clamp(20px,4vw,28px)] leading-[1.2] font-semibold tracking-[-0.02em] text-text-primary">
              <span className="text-brand">{summaryCount.toLocaleString("en-US")}</span>{" "}
              packages for &quot;{query}&quot;
            </h1>
            <p className="m-0 text-[12px] leading-5 text-text-secondary">
              Ranked by registry relevance · weekly downloads from npm
            </p>
          </header>

          {rows.length === 0 ? (
            <StatusPanel
              title="No packages found"
              message={`No results matched "${query}". Try a broader term or a different package name.`}
            />
          ) : (
            <div className="border-t border-border-subtle">
              {rows.map((item) => (
                <SearchRow key={item.name} item={item} />
              ))}
            </div>
          )}
        </main>
      </PageContainer>
    </AppShell>
  );
}
