import {
  Github,
  Globe,
  House,
  Package2,
} from "lucide-react";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { DownloadSparkline } from "@/app/components/download-sparkline";
import { InstallBlock } from "@/app/components/install-block";
import { MetaStrip } from "@/app/components/meta-strip";
import { PackageAnalyticsRail } from "@/app/components/package-analytics";
import { PackageHistoryRail } from "@/app/components/package-history";
import { PackageReadme } from "@/app/components/package-readme";
import { RailSection } from "@/app/components/rail-section";
import { SkeletonBlock } from "@/app/components/skeleton";
import { TabRail } from "@/app/components/tab-rail";
import {
  AppShell,
  PageContainer,
  SectionTitle,
  StatusPanel,
  VersionBadge,
} from "@/app/components/ui";
import { detectModuleFormats } from "@/app/lib/analytics";
import { formatBytes, formatRangeLabel } from "@/app/lib/format";
import { getPackageOverview } from "@/app/lib/registry";
import type { MetaItem, TabItem } from "@/app/lib/types";

function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex min-h-6 items-center rounded-[var(--radius-xs)] border border-border-strong px-2 font-mono text-[10px] uppercase tracking-[0.08em] text-text-secondary">
      {children}
    </span>
  );
}

function AnalyticsRailSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading package analytics">
      <div className="border-t border-border-subtle py-4">
        <SkeletonBlock className="h-3 w-24" />
        <SkeletonBlock className="mt-4 h-6 w-24" />
        <SkeletonBlock className="mt-3 h-3 w-40" />
      </div>
      <div className="border-t border-border-subtle py-4">
        <SkeletonBlock className="h-3 w-28" />
        <div className="mt-4 space-y-2">
          <SkeletonBlock className="h-4 w-full" />
          <SkeletonBlock className="h-4 w-5/6" />
          <SkeletonBlock className="h-4 w-4/6" />
        </div>
      </div>
    </div>
  );
}

function ReadmeSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading README"
      className="space-y-3 pt-1"
    >
      <SkeletonBlock className="h-4 w-full" />
      <SkeletonBlock className="h-4 w-[92%]" />
      <SkeletonBlock className="h-4 w-[88%]" />
      <SkeletonBlock className="mt-4 h-40 w-full" />
    </div>
  );
}

function HistoryRailSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading package history">
      <div className="border-t border-border-subtle py-4">
        <SkeletonBlock className="h-3 w-20" />
        <div className="mt-4 space-y-2">
          <SkeletonBlock className="h-4 w-full" />
          <SkeletonBlock className="h-4 w-5/6" />
          <SkeletonBlock className="h-4 w-2/3" />
        </div>
      </div>
    </div>
  );
}

export default async function PackagePage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  const decodedName = decodeURIComponent(name);

  let data;

  try {
    data = await getPackageOverview(decodedName);
  } catch {
    return (
      <AppShell>
        <PageContainer className="py-6">
          <StatusPanel
            error
            title="Package is unavailable"
            message="We couldn't load this package from the registry right now. Try again in a moment."
          />
        </PageContainer>
      </AppShell>
    );
  }

  if (!data) {
    return notFound();
  }

  const packageName = data.name;
  const latestVersion = data.latestVersion;
  const repositoryUrl = data.repository?.url;
  const repositoryLabel = repositoryUrl
    ?.replace(/^https?:\/\/[^/]+\//, "")
    .replace(/\/$/, "");
  const latestInfo = data.latestVersionInfo;
  const depsCount = Object.keys(latestInfo?.dependencies ?? {}).length;
  const nodeRange = latestInfo?.engines?.node;
  const license = latestInfo?.license ?? data.license ?? "Unknown";
  const formats = latestInfo ? detectModuleFormats(latestInfo) : undefined;

  const metaItems: MetaItem[] = [
    { label: "license", value: license },
    {
      label: "deps",
      value: String(depsCount),
      hint: "Direct dependencies from the latest version.",
    },
    {
      label: "unpacked",
      value: formatBytes(latestInfo?.dist?.unpackedSize),
      hint: "Published package size. Install size includes dependencies.",
    },
    {
      label: "files",
      value:
        typeof latestInfo?.dist?.files === "number"
          ? latestInfo.dist.files.toLocaleString("en-US")
          : "Unknown",
      hint: "Files in the published package.",
    },
    { label: "node", value: nodeRange ?? "any" },
  ];

  const tabs: TabItem[] = [
    { href: "#overview", label: "overview", active: true },
    { href: "#readme", label: "readme" },
  ];

  return (
    <AppShell>
      <PageContainer className="py-6">
        <main className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-10">
          <div className="min-w-0 space-y-4">
            <div className="space-y-4">
              <section id="overview" className="min-w-0 border-b border-border-subtle pb-5">
                <p className="m-0 font-mono text-[11px] uppercase tracking-[0.08em] text-text-label">
                  package
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <h1 className="min-w-0 break-words font-mono text-[clamp(30px,5vw,44px)] leading-none font-semibold tracking-[-0.03em] text-text-primary">
                    {packageName}
                  </h1>
                  <VersionBadge version={latestVersion} />
                </div>

                <p className="mt-3 mb-0 max-w-[72ch] text-[14px] leading-7 text-text-secondary">
                  {data.description?.trim() || "No description provided."}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[12px] text-text-secondary">
                  {repositoryUrl ? (
                    <a
                      href={repositoryUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      data-preview-title={repositoryLabel || "repository"}
                      data-preview-subtitle={repositoryUrl}
                      data-preview-meta="repository"
                      className="inline-flex min-h-11 min-w-0 items-center gap-1.5 transition-colors duration-150 ease-out hover:text-text-primary"
                    >
                      <Github
                        aria-hidden="true"
                        className="h-3.5 w-3.5 shrink-0 text-text-muted"
                        strokeWidth={1.8}
                      />
                      <span className="max-w-[220px] truncate">
                        {repositoryLabel || "repository"}
                      </span>
                    </a>
                  ) : null}
                  {data.homepage ? (
                    <a
                      href={data.homepage}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex min-h-11 items-center gap-1.5 transition-colors duration-150 ease-out hover:text-text-primary"
                    >
                      <House
                        aria-hidden="true"
                        className="h-3.5 w-3.5 text-text-muted"
                        strokeWidth={1.8}
                      />
                      homepage
                    </a>
                  ) : null}
                  <a
                    href={`https://www.npmjs.com/package/${encodeURIComponent(packageName)}`}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-1.5 transition-colors duration-150 ease-out hover:text-text-primary"
                  >
                    <Package2
                      aria-hidden="true"
                      className="h-3.5 w-3.5 text-text-muted"
                      strokeWidth={1.8}
                    />
                    npm
                  </a>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Chip>{nodeRange ? `node ${nodeRange}` : "node any"}</Chip>
                  <Chip>{depsCount} deps</Chip>
                  {formats?.esm ? <Chip>esm</Chip> : null}
                  {formats?.cjs ? <Chip>cjs</Chip> : null}
                  {formats?.types ? <Chip>types</Chip> : null}
                  {repositoryUrl ? <Chip>open source</Chip> : null}
                </div>
              </section>

              <TabRail items={tabs} />

              <MetaStrip items={metaItems} />

              <div className="py-5">
                <InstallBlock packageName={packageName} />
              </div>

              <section id="readme" className="min-w-0 pt-2">
                <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-border-subtle pb-3">
                  <SectionTitle
                    title="README"
                    subtitle="GitHub-flavored package documentation."
                  />
                  <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-text-secondary">
                    markdown
                  </span>
                </div>

                <Suspense fallback={<ReadmeSkeleton />}>
                  <PackageReadme
                    packageName={packageName}
                    repositoryUrl={repositoryUrl}
                  />
                </Suspense>
              </section>
            </div>
          </div>

          <div className="min-w-0">
            <RailSection
              title="downloads"
              id="downloads"
              subtitle={
                data.downloadTrend.length > 0
                  ? `Across all versions, last ${data.downloadTrend.length} days.`
                  : "Across all versions."
              }
            >
              <p className="m-0 font-mono text-[11px] text-text-secondary">
                {formatRangeLabel(
                  data.downloadRange?.start,
                  data.downloadRange?.end,
                )}
              </p>
              <div className="mt-2 flex items-baseline gap-2">
                <p className="m-0 font-mono text-[24px] leading-none font-semibold tracking-[-0.02em] text-brand-2">
                  {typeof data.weeklyDownloads === "number"
                    ? data.weeklyDownloads.toLocaleString("en-US")
                    : "Unknown"}
                </p>
                <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-text-secondary">
                  weekly
                </span>
              </div>
              {typeof data.monthlyDownloads === "number" ? (
                <p className="mt-1.5 mb-0 font-mono text-[11px] text-text-secondary">
                  {data.monthlyDownloads.toLocaleString("en-US")} in 30 days
                </p>
              ) : null}
              <DownloadSparkline
                points={data.downloadTrend ?? []}
                label={`${data.downloadTrend.length || 30}-day download trend`}
                className="mt-3 h-14 w-full text-brand"
              />
            </RailSection>

            <RailSection
              title="compatibility"
              id="compatibility"
              subtitle="Runtime metadata."
            >
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex min-w-0 items-center gap-2 font-mono text-[12px] text-text-secondary">
                  <Globe
                    aria-hidden="true"
                    className="h-3.5 w-3.5 shrink-0 text-text-muted"
                    strokeWidth={1.8}
                  />
                  node
                </span>
                <span className="min-w-0 break-words text-right font-mono text-[12px] text-text-primary">
                  {nodeRange || "any"}
                </span>
              </div>
              {formats ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {formats.esm ? <Chip>esm</Chip> : null}
                  {formats.cjs ? <Chip>cjs</Chip> : null}
                  {formats.types ? <Chip>types</Chip> : null}
                </div>
              ) : null}
            </RailSection>

            <Suspense fallback={<AnalyticsRailSkeleton />}>
              <PackageAnalyticsRail
                packageName={packageName}
                latest={latestInfo}
              />
            </Suspense>

            {(latestInfo?.keywords ?? data.keywords ?? []).length > 0 ? (
              <RailSection title="keywords" id="keywords" subtitle="Tagged topics.">
                <div className="flex flex-wrap gap-1.5">
                  {(latestInfo?.keywords ?? data.keywords ?? [])
                    .slice(0, 12)
                    .map((keyword) => (
                      <span
                        key={keyword}
                        className="inline-flex items-center rounded-[var(--radius-xs)] border border-border-strong px-1.5 py-0.5 font-mono text-[10px] text-text-secondary"
                      >
                        {keyword}
                      </span>
                    ))}
                </div>
              </RailSection>
            ) : null}

            <Suspense fallback={<HistoryRailSkeleton />}>
              <PackageHistoryRail packageName={packageName} />
            </Suspense>
          </div>
        </main>
      </PageContainer>
    </AppShell>
  );
}
