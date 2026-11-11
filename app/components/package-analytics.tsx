import Link from "next/link";
import { getPackageAnalytics } from "@/app/lib/analytics";
import { formatBytes } from "@/app/lib/format";
import type { LatestVersionInfo } from "@/app/lib/types";
import { RailSection } from "./rail-section";

export async function PackageAnalyticsRail({
  packageName,
  latest,
}: {
  packageName: string;
  latest?: LatestVersionInfo;
}) {
  const analytics = await getPackageAnalytics(packageName, latest);

  if (!analytics) return null;

  const install = analytics.installSize;

  return (
    <>
      {install ? (
        <RailSection
          title="install size"
          id="install-size"
          subtitle={`Estimated unpacked size across ${install.packages} packages.`}
        >
          <p className="m-0 font-mono text-[24px] leading-none font-semibold tracking-[-0.02em] text-brand-2">
            {formatBytes(install.bytes)}
            {install.truncated ? "+" : ""}
          </p>
          <p className="mt-1.5 mb-0 font-mono text-[11px] text-text-secondary">
            Includes dependencies.
          </p>
        </RailSection>
      ) : null}

      {analytics.dependencies.length > 0 ? (
        <RailSection
          title="dependencies"
          id="dependencies"
          subtitle={
            analytics.outdatedCount > 0
              ? `${analytics.dependencies.length} direct · ${analytics.outdatedCount} outdated`
              : `${analytics.dependencies.length} direct dependencies.`
          }
        >
          <div>
            {analytics.dependencies.slice(0, 20).map((dependency) => (
              <div
                key={dependency.name}
                className="flex items-start justify-between gap-3 border-b border-border-subtle py-2 last:border-b-0"
              >
                <div className="min-w-0">
                  <Link
                    href={`/package/${encodeURIComponent(dependency.name)}`}
                    data-preview-title={dependency.name}
                    data-preview-subtitle={
                      dependency.latest
                        ? `${dependency.range} → ${dependency.latest}`
                        : dependency.range
                    }
                    data-preview-meta={
                      dependency.outdated ? "outdated" : undefined
                    }
                    className="block truncate font-mono text-[12px] text-text-primary transition-colors duration-150 ease-out hover:text-brand"
                  >
                    {dependency.name}
                  </Link>
                  <p className="mt-0.5 mb-0 truncate font-mono text-[10px] text-text-secondary">
                    {dependency.range}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  {dependency.outdated && dependency.latest ? (
                    <span className="inline-flex items-center rounded-[var(--radius-xs)] border border-[var(--accent-soft-border)] bg-[var(--accent-soft-bg)] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.08em] text-brand">
                      outdated
                    </span>
                  ) : null}
                  {dependency.latest ? (
                    <p className="mt-0.5 mb-0 font-mono text-[10px] text-text-secondary">
                      {dependency.latest}
                    </p>
                  ) : null}
                </div>
              </div>
            ))}
            {analytics.dependencies.length > 20 ? (
              <p className="mt-2 mb-0 font-mono text-[10px] text-text-secondary">
                +{analytics.dependencies.length - 20} more
              </p>
            ) : null}
          </div>
        </RailSection>
      ) : null}
    </>
  );
}
