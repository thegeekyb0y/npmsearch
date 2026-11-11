import { CircleAlert, GitFork, Star, Users } from "lucide-react";
import { formatCompactNumber, formatDate } from "@/app/lib/format";
import { getPackageExtras } from "@/app/lib/package-page";
import { RailSection } from "./rail-section";

export async function PackageHistoryRail({
  packageName,
}: {
  packageName: string;
}) {
  const data = await getPackageExtras(packageName);

  if (!data) return null;

  const github = data.github;
  const hasGithubStats =
    typeof github?.stars === "number" ||
    typeof github?.forks === "number" ||
    typeof github?.issues === "number";

  return (
    <>
      {data.recentVersions.length > 0 ? (
        <RailSection
          title="versions"
          id="versions"
          subtitle={
            data.publishedAt
              ? `Latest published ${formatDate(data.publishedAt)}`
              : "Recent releases."
          }
        >
          <div>
            {data.recentVersions.map((entry) => (
              <div
                key={entry.version}
                className="flex items-start justify-between gap-3 border-b border-border-subtle py-2 last:border-b-0"
              >
                <div className="min-w-0">
                  <p
                    className={`truncate font-mono text-[12px] ${
                      entry.version === data.latestVersion
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
      ) : null}

      {hasGithubStats ? (
        <RailSection
          title="github"
          id="github"
          subtitle="Repository activity."
        >
          <div className="space-y-2">
            {typeof github?.stars === "number" ? (
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 font-mono text-[12px] text-text-secondary">
                  <Star
                    aria-hidden="true"
                    className="h-3.5 w-3.5 text-text-muted"
                    strokeWidth={1.8}
                  />
                  stars
                </span>
                <span className="font-mono text-[12px] text-text-primary">
                  {formatCompactNumber(github.stars)}
                </span>
              </div>
            ) : null}
            {typeof github?.forks === "number" ? (
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 font-mono text-[12px] text-text-secondary">
                  <GitFork
                    aria-hidden="true"
                    className="h-3.5 w-3.5 text-text-muted"
                    strokeWidth={1.8}
                  />
                  forks
                </span>
                <span className="font-mono text-[12px] text-text-primary">
                  {formatCompactNumber(github.forks)}
                </span>
              </div>
            ) : null}
            {typeof github?.issues === "number" ? (
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 font-mono text-[12px] text-text-secondary">
                  <CircleAlert
                    aria-hidden="true"
                    className="h-3.5 w-3.5 text-text-muted"
                    strokeWidth={1.8}
                  />
                  issues
                </span>
                <span className="font-mono text-[12px] text-text-primary">
                  {formatCompactNumber(github.issues)}
                </span>
              </div>
            ) : null}
          </div>
        </RailSection>
      ) : null}

      {data.maintainers.length > 0 ? (
        <RailSection
          title="maintainers"
          id="maintainers"
          subtitle="Registry package owners."
        >
          <div className="space-y-3">
            {data.maintainers.slice(0, 6).map((maintainer) => (
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
    </>
  );
}
