import { CopyInstallButton } from "@/app/components/copy-install-button";
import {
  AppHeader,
  AppShell,
  ExternalLink,
  PageContainer,
  SectionTitle,
  StatusPanel,
  VersionBadge,
} from "@/app/components/ui";

interface NpmPackage {
  name: string;
  description?: string;
  readme?: string;
  license?: string;
  homepage?: string;
  "dist-tags"?: { latest?: string };
  repository?: { url?: string };
}

function normalizeRepositoryUrl(url?: string) {
  if (!url) return undefined;
  return url.replace(/^git\+/, "").replace(/\.git$/, "");
}

export default async function PackagePage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  const decodedName = decodeURIComponent(name);
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/package/${encodeURIComponent(decodedName)}`,
    { cache: "no-store" },
  );

  if (!res.ok) {
    return (
      <AppShell>
        <AppHeader query={decodedName} />
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

  const data: NpmPackage = await res.json();
  const latestVersion = data["dist-tags"]?.latest || "Unknown";
  const installCommand = `npm i ${data.name}`;
  const repositoryUrl = normalizeRepositoryUrl(data.repository?.url);

  return (
    <AppShell>
      <AppHeader query={data.name} />
      <PageContainer className="py-6">
        <main className="flex flex-col gap-6">
          <section className="flex flex-col gap-4">
            <p className="m-0 text-[12px] font-medium uppercase tracking-[0.08em] text-text-secondary">
              Package detail
            </p>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="m-0 wrap-break-word text-[28px] leading-[1.05] font-semibold tracking-[-0.01em] text-text-primary md:text-[40px]">
                    {data.name}
                  </h1>
                  <VersionBadge version={latestVersion} />
                </div>
                {data.description?.trim() ? (
                  <p className="m-0 max-w-[72ch] text-[16px] leading-[1.6] text-text-secondary">
                    {data.description}
                  </p>
                ) : (
                  <p className="m-0 text-[13px] leading-normal text-text-muted">
                    No description provided.
                  </p>
                )}
              </div>
            </div>
          </section>

          <section className="relative flex flex-col gap-4 overflow-hidden rounded-md border border-[#1a1a1a] bg-surface-code p-4 sm:flex-row sm:items-center sm:justify-between">
            <span className="absolute inset-y-0 left-0 w-0.75 bg-brand" />
            <code className="min-w-0 overflow-x-auto pl-3 font-mono text-[14px] whitespace-nowrap text-text-primary">
              {installCommand}
            </code>
            <CopyInstallButton command={installCommand} />
          </section>

          <section className="grid items-start gap-4 md:grid-cols-[minmax(0,1fr)_var(--sidebar-width)] md:gap-6">
            <article className="rounded-md border border-border-subtle bg-surface p-6">
              <SectionTitle
                title="README"
                subtitle="Registry package documentation and installation notes."
              />
              <div className="mt-5 whitespace-pre-wrap wrap-break-word text-[14px] leading-[1.7] text-text-secondary [&_code]:rounded-sm [&_code]:border [&_code]:border-[#1a1a1a] [&_code]:bg-surface-code [&_code]:px-1.25 [&_code]:py-px [&_code]:font-mono [&_code]:text-text-primary [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:border [&_pre]:border-[#1a1a1a] [&_pre]:bg-surface-code [&_pre]:p-4 [&_pre]:font-mono [&_pre]:text-text-primary [&_pre_code]:border-0 [&_pre_code]:bg-transparent [&_pre_code]:p-0">
                {data.readme?.trim() || "No README available."}
              </div>
            </article>

            <aside className="rounded-md border border-border-subtle bg-surface p-5 md:sticky md:top-24">
              <SectionTitle
                title="Package info"
                subtitle="Core metadata and external links."
              />
              <div className="mt-5">
                <div className="flex items-center justify-between gap-3 border-b border-[#1a1a1a] py-3">
                  <span className="text-[13px] leading-normal text-text-muted">
                    Latest version
                  </span>
                  <span className="text-[13px] font-medium text-text-primary">
                    {latestVersion}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 border-b border-[#1a1a1a] py-3">
                  <span className="text-[13px] leading-normal text-text-muted">
                    License
                  </span>
                  <span className="text-[13px] font-medium text-text-primary">
                    {data.license || "Unavailable"}
                  </span>
                </div>
                {data.homepage ? (
                  <div className="flex items-center justify-between gap-3 border-b border-[#1a1a1a] py-3">
                    <span className="text-[13px] leading-normal text-text-muted">
                      Homepage
                    </span>
                    <ExternalLink href={data.homepage}>Open</ExternalLink>
                  </div>
                ) : null}
                {repositoryUrl ? (
                  <div className="flex items-center justify-between gap-3 py-3 last:pb-0">
                    <span className="text-[13px] leading-normal text-text-muted">
                      Repository
                    </span>
                    <ExternalLink href={repositoryUrl}>Open</ExternalLink>
                  </div>
                ) : null}
              </div>
            </aside>
          </section>
        </main>
      </PageContainer>
    </AppShell>
  );
}
