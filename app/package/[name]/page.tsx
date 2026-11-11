import {
  CircleAlert,
  ExternalLinkIcon,
  GitFork,
  Github,
  Globe,
  House,
  Package2,
  Star,
  Users,
} from "lucide-react";
import { notFound } from "next/navigation";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { DownloadSparkline } from "@/app/components/download-sparkline";
import { InstallBlock } from "@/app/components/install-block";
import { MetaStrip } from "@/app/components/meta-strip";
import { RailSection } from "@/app/components/rail-section";
import { TabRail } from "@/app/components/tab-rail";
import {
  AppShell,
  PageContainer,
  SectionTitle,
  StatusPanel,
  VersionBadge,
} from "@/app/components/ui";
import {
  formatBytes,
  formatCompactNumber,
  formatDate,
  formatRangeLabel,
} from "@/app/lib/format";
import { getPackage } from "@/app/lib/registry";
import type { MetaItem, TabItem } from "@/app/lib/types";

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
  thead: ({ children }) => <thead className="bg-surface-raised text-text-primary">{children}</thead>,
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
        <div className="my-6 overflow-hidden rounded-[var(--radius-md)] border border-border-subtle bg-surface-code">
          <div className="flex items-center justify-between border-b border-border-subtle px-4 py-2 text-[11px] uppercase tracking-[0.08em] text-text-secondary">
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
              background: "#0d0d0d",
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
      <code className="rounded-[var(--radius-sm)] border border-border-subtle bg-surface-raised px-[5px] py-px font-mono text-[13px] text-text-primary">
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

  let data;

  try {
    data = await getPackage(decodedName);
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
  const github = data.github;

  const metaItems: MetaItem[] = [
    { label: "license", value: license },
    { label: "deps", value: String(depsCount) },
    {
      label: "size",
      value: formatBytes(latestInfo?.dist?.unpackedSize),
      hint: "Unpacked package size. Install size includes dependencies.",
    },
    { label: "node", value: nodeRange ?? "any" },
    { label: "published", value: formatDate(data.publishedAt) },
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
                  {typeof github?.stars === "number" ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Star
                        aria-hidden="true"
                        className="h-3.5 w-3.5 text-text-muted"
                        strokeWidth={1.8}
                      />
                      {formatCompactNumber(github?.stars)}
                    </span>
                  ) : null}
                  {typeof github?.forks === "number" ? (
                    <span className="inline-flex items-center gap-1.5">
                      <GitFork
                        aria-hidden="true"
                        className="h-3.5 w-3.5 text-text-muted"
                        strokeWidth={1.8}
                      />
                      {formatCompactNumber(github?.forks)}
                    </span>
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
                  {typeof github?.issues === "number" ? (
                    <span className="inline-flex items-center gap-1.5">
                      <CircleAlert
                        aria-hidden="true"
                        className="h-3.5 w-3.5 text-text-muted"
                        strokeWidth={1.8}
                      />
                      {formatCompactNumber(github?.issues)} issues
                    </span>
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
                  <span className="inline-flex min-h-6 items-center rounded-[var(--radius-xs)] border border-border-strong px-2 font-mono text-[10px] uppercase tracking-[0.08em] text-text-secondary">
                    {nodeRange ? `node ${nodeRange}` : "node any"}
                  </span>
                  <span className="inline-flex min-h-6 items-center rounded-[var(--radius-xs)] border border-border-strong px-2 font-mono text-[10px] uppercase tracking-[0.08em] text-text-secondary">
                    {depsCount} deps
                  </span>
                  {repositoryUrl ? (
                    <span className="inline-flex min-h-6 items-center rounded-[var(--radius-xs)] border border-border-strong px-2 font-mono text-[10px] uppercase tracking-[0.08em] text-text-secondary">
                      open source
                    </span>
                  ) : null}
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

                {data.readmeTruncated ? (
                  <p className="mb-4 text-[11px] text-text-secondary">
                    README truncated to 256 KB.
                  </p>
                ) : null}

                <div className="min-w-0 overflow-hidden">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                    {data.readme?.trim() || "No README available."}
                  </ReactMarkdown>
                </div>
              </section>
            </div>
          </div>

          <div className="min-w-0">
            <RailSection
              title="weekly downloads"
              id="downloads"
              subtitle="Across all versions."
            >
              <p className="m-0 font-mono text-[11px] text-text-secondary">
                {formatRangeLabel(
                  data.downloadRange?.start,
                  data.downloadRange?.end,
                )}
              </p>
              <p className="mt-2 mb-0 font-mono text-[24px] leading-none font-semibold tracking-[-0.02em] text-text-primary">
                {typeof data.weeklyDownloads === "number"
                  ? data.weeklyDownloads.toLocaleString("en-US")
                  : "Unknown"}
              </p>
              <DownloadSparkline
                points={data.downloadTrend ?? []}
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
            </RailSection>

            <RailSection title="versions" id="versions" subtitle="Recent releases.">
              <div>
                {(data.recentVersions ?? []).map((entry) => (
                  <div
                    key={entry.version}
                    className="flex items-start justify-between gap-3 border-b border-border-subtle py-2 last:border-b-0"
                  >
                    <div className="min-w-0">
                      <p
                        className={`truncate font-mono text-[12px] ${
                          entry.version === latestVersion
                            ? "text-text-primary"
                            : "text-text-secondary"
                        }`}
                      >
                        {entry.version}
                      </p>
                      {entry.tag ? (
                        <p className="mt-0.5 mb-0 font-mono text-[9px] uppercase tracking-[0.08em] text-brand">
                          {entry.tag}
                        </p>
                      ) : null}
                    </div>
                    <span className="shrink-0 font-mono text-[10px] text-text-secondary">
                      {formatDate(entry.publishedAt)}
                    </span>
                  </div>
                ))}
              </div>
            </RailSection>

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

            {(data.maintainers ?? []).length > 0 ? (
              <RailSection
                title="maintainers"
                id="maintainers"
                subtitle="Registry package owners."
              >
                <div className="space-y-3">
                  {(data.maintainers ?? []).slice(0, 6).map((maintainer) => (
                    <div
                      key={`${maintainer.name}-${maintainer.email ?? ""}`}
                      className="flex min-w-0 items-center gap-3"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-border-strong text-text-secondary">
                        <Users
                          aria-hidden="true"
                          className="h-3.5 w-3.5"
                          strokeWidth={1.8}
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-mono text-[12px] text-text-primary">
                          {maintainer.name}
                        </p>
                        {maintainer.email ? (
                          <p className="truncate text-[11px] text-text-secondary">
                            {maintainer.email}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </RailSection>
            ) : null}
          </div>
        </main>
      </PageContainer>
    </AppShell>
  );
}
