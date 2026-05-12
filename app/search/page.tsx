import Link from "next/link";
import { getBaseUrl } from "../lib/get-base-url";
import {
  AppShell,
  ExactBadge,
  ExternalLink,
  PageContainer,
  StatusPanel,
  VersionBadge,
} from "../components/ui";
import { FadeIn, StaggerItem, StaggerList } from "../components/motion";

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

function formatDownloads(num?: number) {
  if (typeof num !== "number" || Number.isNaN(num)) return "Downloads unavailable";
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M / wk`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K / wk`;
  return `${num} / wk`;
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
        <PageContainer className="py-6">
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
        <PageContainer className="py-6">
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

  return (
    <AppShell>
      <PageContainer className="py-6">
        <main className="flex flex-col gap-6">
          <FadeIn className="flex flex-col gap-2">
            <p className="m-0 text-[12px] font-medium uppercase tracking-[0.08em] text-text-secondary">
              Search results
            </p>
            <h1 className="m-0 text-[18px] leading-[1.2] font-semibold tracking-[-0.01em] text-text-primary">
              {summaryCount.toLocaleString("en-US")} packages for &quot;{query}
              &quot;
            </h1>
            <p className="m-0 text-[13px] leading-[1.5] text-text-muted">
              Ranked from the npm ecosystem with version and weekly download context.
            </p>
          </FadeIn>

          {results.length === 0 ? (
            <StatusPanel
              title="No packages found"
              message={`No results matched "${query}". Try a broader term or a different package name.`}
            />
          ) : (
            <StaggerList className="grid gap-4 md:gap-5">
              {results.map((item) => {
                const isExactMatch =
                  item.package.name.toLowerCase() === query.toLowerCase();

                return (
                  <StaggerItem key={item.package.name}>
                    <article className="group relative flex flex-col gap-4 overflow-hidden rounded-[var(--radius-md)] border border-border-subtle bg-surface p-5 transition-colors duration-150 ease-out hover:border-border-strong hover:bg-[#141414]">
                      <span className="absolute inset-y-0 left-0 w-[2px] bg-brand opacity-0 transition-opacity duration-150 ease-out group-hover:opacity-100" />
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 space-y-3">
                          <div className="flex flex-wrap items-center gap-3">
                            <Link
                              href={`/package/${item.package.name}`}
                              className="min-w-0 break-words text-[22px] leading-none font-semibold tracking-[-0.01em] text-text-primary transition-colors duration-150 ease-out hover:text-brand"
                            >
                              {item.package.name}
                            </Link>
                            {isExactMatch ? <ExactBadge /> : null}
                          </div>
                          <p className="m-0 text-[14px] leading-[1.6] text-text-secondary">
                            {item.package.description?.trim() ||
                              "No description provided."}
                          </p>
                        </div>
                        <VersionBadge version={item.package.version} />
                      </div>

                      <hr className="m-0 border-0 border-t border-[#1a1a1a]" />

                      <div className="flex flex-wrap items-center justify-between gap-4 pt-4">
                        <div className="flex flex-wrap items-center gap-4">
                          <ExternalLink href={item.package.links.npm}>npm</ExternalLink>
                          {item.package.links.homepage ? (
                            <ExternalLink href={item.package.links.homepage}>
                              homepage
                            </ExternalLink>
                          ) : null}
                          {item.package.links.repository ? (
                            <ExternalLink href={item.package.links.repository}>
                              repository
                            </ExternalLink>
                          ) : null}
                        </div>
                        <div className="inline-flex items-center gap-2 font-mono text-[13px] text-text-secondary">
                          <span className="text-brand">&#8595;</span>
                          <span>{formatDownloads(item.weeklyDownloads)}</span>
                        </div>
                      </div>
                    </article>
                  </StaggerItem>
                );
              })}
            </StaggerList>
          )}
        </main>
      </PageContainer>
    </AppShell>
  );
}
