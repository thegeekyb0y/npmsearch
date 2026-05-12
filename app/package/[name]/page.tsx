import {
  ArrowDownToLine,
  Boxes,
  CalendarDays,
  ExternalLinkIcon,
  Globe,
  Package2,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  Workflow,
} from "lucide-react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { CopyInstallButton } from "@/app/components/copy-install-button";
import { DownloadSparkline } from "@/app/components/download-sparkline";
import { FadeIn } from "@/app/components/motion";
import {
  AppShell,
  ExternalLink,
  PageContainer,
  SectionTitle,
  StatusPanel,
  VersionBadge,
} from "@/app/components/ui";
import { getBaseUrl } from "@/app/lib/get-base-url";

type Maintainer = { name: string; email?: string };
type DownloadPoint = { day?: string; downloads: number };
type LatestVersionInfo = {
  license?: string;
  dependencies?: Record<string, string>;
  dist?: { unpackedSize?: number };
  engines?: { node?: string };
  keywords?: string[];
};
type RecentVersion = {
  version: string;
  publishedAt: string;
  tag?: string;
};

interface NpmPackagePageData {
  name?: string;
  description?: string;
  readme?: string;
  license?: string;
  homepage?: string;
  keywords?: string[];
  maintainers?: Maintainer[];
  repository?: { url?: string };
  "dist-tags"?: { latest?: string };
  latestVersionInfo?: LatestVersionInfo;
  recentVersions?: RecentVersion[];
  _meta?: {
    weeklyDownloads?: number;
    stars?: number;
    forks?: number;
    issues?: number;
    dependents?: number;
    score?: number;
    downloadTrend?: DownloadPoint[];
    downloadRange?: { start?: string; end?: string };
    publishedAt?: string;
  };
}

function normalizeRepositoryUrl(url?: string) {
  if (!url) return undefined;
  return url.replace(/^git\+/, "").replace(/\.git$/, "");
}

function formatDate(value?: string) {
  if (!value) return "Unknown";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatRangeLabel(start?: string, end?: string) {
  if (!start || !end) return "Last 7 days";
  return `${formatDate(start)} to ${formatDate(end)}`;
}

function formatBytes(value?: number) {
  if (!value) return "Unknown";
  if (value >= 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  if (value >= 1024) return `${(value / 1024).toFixed(1)} kB`;
  return `${value} B`;
}

function formatCompactNumber(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) return "Unknown";
  return new Intl.NumberFormat("en-US", { notation: "compact" }).format(value);
}

function MetricTile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof ShieldCheck;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[var(--radius-md)] border border-border-subtle bg-surface px-3 py-3 transition-colors duration-150 ease-out hover:border-border-strong">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-text-muted" strokeWidth={1.8} />
        <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted">
          {label}
        </span>
      </div>
      <p className="mt-2 truncate text-[14px] font-medium text-text-primary">{value}</p>
    </div>
  );
}

const markdownComponents: Components = {
  h1: ({ children }) => (
    <h1 className="mt-8 mb-4 text-[28px] font-semibold tracking-[-0.02em] text-text-primary first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mt-8 mb-3 border-b border-border-subtle pb-3 text-[22px] font-semibold tracking-[-0.02em] text-text-primary">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-7 mb-3 text-[17px] font-semibold tracking-[-0.01em] text-text-primary">
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p className="my-4 text-[14px] leading-7 text-text-secondary">{children}</p>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 font-medium text-text-primary underline decoration-border-strong underline-offset-4 transition-colors duration-150 ease-out hover:text-brand"
    >
      {children}
      <ExternalLinkIcon className="h-3.5 w-3.5" strokeWidth={1.8} />
    </a>
  ),
  ul: ({ children }) => (
    <ul className="my-4 list-disc space-y-2 pl-6 text-[14px] leading-7 text-text-secondary">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="my-4 list-decimal space-y-2 pl-6 text-[14px] leading-7 text-text-secondary">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="pl-1">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="my-6 border-l-2 border-brand pl-4 text-[14px] leading-7 text-text-secondary">
      {children}
    </blockquote>
  ),
  table: ({ children }) => (
    <div className="my-6 overflow-x-auto rounded-[var(--radius-md)] border border-border-subtle">
      <table className="min-w-full border-collapse text-left text-[13px]">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-[#131313] text-text-primary">{children}</thead>,
  th: ({ children }) => (
    <th className="border-b border-border-subtle px-3 py-2.5 font-medium">{children}</th>
  ),
  td: ({ children }) => (
    <td className="border-b border-border-subtle px-3 py-2.5 align-top text-text-secondary">
      {children}
    </td>
  ),
  hr: () => <hr className="my-8 border-0 border-t border-border-subtle" />,
  code({ className, children }) {
    const match = /language-(\w+)/.exec(className ?? "");
    const code = String(children).replace(/\n$/, "");

    if (match) {
      return (
        <div className="my-6 overflow-hidden rounded-[var(--radius-md)] border border-border-subtle bg-[#101010]">
          <div className="flex items-center justify-between border-b border-border-subtle px-4 py-2 text-[11px] uppercase tracking-[0.08em] text-text-muted">
            <span>{match[1]}</span>
            <span>code</span>
          </div>
          <SyntaxHighlighter
            PreTag="div"
            language={match[1]}
            style={oneDark}
            customStyle={{
              margin: 0,
              padding: "14px",
              background: "#101010",
              fontSize: "13px",
              lineHeight: 1.65,
            }}
            codeTagProps={{
              style: {
                fontFamily: "var(--font-geist-mono)",
              },
            }}
          >
            {code}
          </SyntaxHighlighter>
        </div>
      );
    }

    return (
      <code className="rounded-[var(--radius-sm)] border border-border-subtle bg-[#151515] px-[5px] py-px font-mono text-[13px] text-text-primary">
        {children}
      </code>
    );
  },
};

export default async function PackagePage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  const decodedName = decodeURIComponent(name);
  const baseUrl = await getBaseUrl();
  const res = await fetch(
    `${baseUrl}/api/package/${encodeURIComponent(decodedName)}`,
    { cache: "no-store" },
  );

  if (!res.ok) {
    return (
      <AppShell>
        <PageContainer className="py-6">
          <StatusPanel
            error
            title="Package not found"
            message={`We couldn't find "${decodedName}" in the registry.`}
          />
        </PageContainer>
      </AppShell>
    );
  }

  const data: NpmPackagePageData = await res.json();
  const latestVersion = data["dist-tags"]?.latest || "Unknown";
  const installCommand = `npm i ${data.name}`;
  const repositoryUrl = normalizeRepositoryUrl(data.repository?.url);
  const packageMeta = data._meta ?? {};
  const latestInfo = data.latestVersionInfo;
  const depsCount = Object.keys(latestInfo?.dependencies ?? {}).length;
  const featureBadges = [
    latestInfo?.engines?.node ? "Node" : null,
    depsCount ? "Dependencies" : null,
    repositoryUrl ? "Open Source" : null,
  ].filter(Boolean) as string[];

  return (
    <AppShell>
      <PageContainer className="py-4">
        <main className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0 space-y-4">
            <FadeIn className="space-y-4">
              <section className="rounded-[var(--radius-md)] border border-border-subtle bg-surface px-4 py-4 md:px-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <h1 className="min-w-0 break-words text-[30px] leading-none font-semibold tracking-[-0.02em] text-text-primary md:text-[34px]">
                        {data.name}
                      </h1>
                      <VersionBadge version={latestVersion} />
                    </div>

                    <p className="m-0 max-w-[72ch] text-[15px] leading-7 text-text-secondary">
                      {data.description?.trim() || "No description provided."}
                    </p>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-text-secondary">
                      {repositoryUrl ? (
                        <ExternalLink href={repositoryUrl}>repository</ExternalLink>
                      ) : null}
                      {data.homepage ? <ExternalLink href={data.homepage}>homepage</ExternalLink> : null}
                      <ExternalLink
                        href={`https://www.npmjs.com/package/${encodeURIComponent(data.name ?? decodedName)}`}
                      >
                        npm
                      </ExternalLink>
                      {packageMeta.issues ? (
                        <span className="inline-flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-text-muted" strokeWidth={1.8} />
                          {formatCompactNumber(packageMeta.issues)} issues
                        </span>
                      ) : null}
                    </div>

                    {featureBadges.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {featureBadges.map((badge) => (
                          <span
                            key={badge}
                            className="inline-flex min-h-7 items-center rounded-[var(--radius-md)] border border-border-strong bg-[#151515] px-2.5 text-[10px] font-medium uppercase tracking-[0.08em] text-text-secondary"
                          >
                            {badge}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {repositoryUrl ? (
                      <a
                        href={repositoryUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-10 items-center justify-center rounded-[var(--radius-md)] border border-border-subtle bg-transparent px-3 text-[12px] font-medium text-text-primary transition-colors duration-150 ease-out hover:border-border-strong hover:bg-[#151515]"
                      >
                        repository
                      </a>
                    ) : null}
                    <a
                      href={`https://www.npmjs.com/package/${encodeURIComponent(data.name ?? decodedName)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-10 items-center justify-center rounded-[var(--radius-md)] border border-border-subtle bg-transparent px-3 text-[12px] font-medium text-text-primary transition-colors duration-150 ease-out hover:border-border-strong hover:bg-[#151515]"
                    >
                      npm
                    </a>
                  </div>
                </div>
              </section>

              <section className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-7">
                <MetricTile
                  icon={ArrowDownToLine}
                  label="Downloads"
                  value={formatCompactNumber(packageMeta.weeklyDownloads)}
                />
                <MetricTile
                  icon={Star}
                  label="Stars"
                  value={formatCompactNumber(packageMeta.stars)}
                />
                <MetricTile
                  icon={Boxes}
                  label="Dependents"
                  value={formatCompactNumber(packageMeta.dependents)}
                />
                <MetricTile
                  icon={Workflow}
                  label="Deps"
                  value={String(depsCount)}
                />
                <MetricTile
                  icon={Package2}
                  label="Size"
                  value={formatBytes(latestInfo?.dist?.unpackedSize)}
                />
                <MetricTile
                  icon={ShieldCheck}
                  label="License"
                  value={latestInfo?.license ?? data.license ?? "Unknown"}
                />
                <MetricTile
                  icon={CalendarDays}
                  label="Published"
                  value={formatDate(packageMeta.publishedAt)}
                />
              </section>

              <section className="rounded-[var(--radius-md)] border border-[#1a1a1a] bg-surface-code px-4 py-3.5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-1.5">
                    <p className="m-0 text-[10px] font-medium uppercase tracking-[0.08em] text-text-muted">
                      Install
                    </p>
                    <code className="block min-w-0 overflow-x-auto font-mono text-[14px] text-text-primary">
                      {installCommand}
                    </code>
                  </div>
                  <CopyInstallButton command={installCommand} />
                </div>
              </section>

              <section
                id="readme"
                className="min-w-0 rounded-[var(--radius-md)] border border-border-subtle bg-surface px-4 py-4 md:px-5"
              >
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle pb-3">
                  <SectionTitle
                    title="README"
                    subtitle="GitHub-flavored package documentation."
                  />
                  <div className="inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-border-subtle px-3 py-2 text-[11px] text-text-secondary">
                    <Package2 className="h-4 w-4 text-text-muted" strokeWidth={1.8} />
                    <span>formatted markdown</span>
                  </div>
                </div>

                <div className="min-w-0 overflow-hidden">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                    {data.readme?.trim() || "No README available."}
                  </ReactMarkdown>
                </div>
              </section>
            </FadeIn>
          </div>

          <FadeIn className="min-w-0 space-y-4" delay={0.08}>
            <aside className="rounded-[var(--radius-md)] border border-border-subtle bg-surface px-4 py-4">
              <SectionTitle title="Weekly downloads" subtitle="Across all versions." />
              <div className="mt-4 space-y-3">
                <p className="text-[11px] text-text-muted">
                  {formatRangeLabel(
                    packageMeta.downloadRange?.start,
                    packageMeta.downloadRange?.end,
                  )}
                </p>
                <div className="space-y-3">
                  <p className="text-[24px] leading-none font-semibold tracking-[-0.02em] text-text-primary">
                    {typeof packageMeta.weeklyDownloads === "number"
                      ? packageMeta.weeklyDownloads.toLocaleString("en-US")
                      : "Unknown"}
                  </p>
                  <DownloadSparkline
                    points={packageMeta.downloadTrend ?? []}
                    className="h-14 w-full text-brand"
                  />
                </div>
              </div>
            </aside>

            <aside className="rounded-[var(--radius-md)] border border-border-subtle bg-surface px-4 py-4">
              <SectionTitle title="Compatibility" subtitle="Runtime metadata." />
              <div className="mt-4 flex items-center justify-between gap-3">
                <span className="inline-flex min-w-0 items-center gap-2 text-[13px] leading-[1.5] text-text-muted">
                  <Globe className="h-4 w-4 shrink-0" strokeWidth={1.8} />
                  Node.js
                </span>
                <span className="min-w-0 break-words text-right text-[13px] font-medium text-text-primary">
                  {latestInfo?.engines?.node || "Not specified"}
                </span>
              </div>
            </aside>

            <aside className="rounded-[var(--radius-md)] border border-border-subtle bg-surface px-4 py-4">
              <SectionTitle title="Versions" subtitle="Recent releases." />
              <div className="mt-4 space-y-2">
                {(data.recentVersions ?? []).map((entry) => (
                  <div
                    key={entry.version}
                    className={`rounded-[var(--radius-md)] border px-3 py-2.5 transition-colors duration-150 ease-out ${
                      entry.version === latestVersion
                        ? "border-border-strong bg-[#151515]"
                        : "border-transparent hover:border-border-subtle hover:bg-[#121212]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium text-text-primary">
                          {entry.version}
                        </p>
                        {entry.tag ? (
                          <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.08em] text-brand">
                            {entry.tag}
                          </p>
                        ) : null}
                      </div>
                      <span className="shrink-0 text-[11px] text-text-muted">
                        {formatDate(entry.publishedAt)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </aside>

            {(latestInfo?.keywords ?? data.keywords ?? []).length > 0 ? (
              <aside className="rounded-[var(--radius-md)] border border-border-subtle bg-surface px-4 py-4">
                <SectionTitle title="Keywords" subtitle="Tagged topics." />
                <div className="mt-4 flex flex-wrap gap-2">
                  {(latestInfo?.keywords ?? data.keywords ?? []).slice(0, 12).map((keyword) => (
                    <span
                      key={keyword}
                      className="inline-flex items-center rounded-[var(--radius-md)] border border-border-strong bg-[#151515] px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.04em] text-text-secondary"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              </aside>
            ) : null}

            {(data.maintainers ?? []).length > 0 ? (
              <aside className="rounded-[var(--radius-md)] border border-border-subtle bg-surface px-4 py-4">
                <SectionTitle title="Maintainers" subtitle="Registry package owners." />
                <div className="mt-4 space-y-3">
                  {(data.maintainers ?? []).slice(0, 6).map((maintainer) => (
                    <div
                      key={`${maintainer.name}-${maintainer.email ?? ""}`}
                      className="flex min-w-0 items-center gap-3"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border-strong bg-[#151515] text-text-primary">
                        <Users className="h-4 w-4" strokeWidth={1.8} />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium text-text-primary">
                          {maintainer.name}
                        </p>
                        {maintainer.email ? (
                          <p className="truncate text-[11px] text-text-muted">
                            {maintainer.email}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </aside>
            ) : null}
          </FadeIn>
        </main>
      </PageContainer>
    </AppShell>
  );
}
