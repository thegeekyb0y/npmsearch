import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import { MaintainerReach } from "@/app/components/profile/maintainer-reach";
import { PackageConstellation } from "@/app/components/profile/package-constellation";
import { ProfileSigil } from "@/app/components/profile/profile-sigil";
import { SkeletonBlock } from "@/app/components/skeleton";
import { AppShell, PageContainer, StatusPanel } from "@/app/components/ui";
import { formatCompactNumber } from "@/app/lib/format";
import {
  getProfilePalette,
  getProfileSeed,
  getSignalBars,
  type ProfilePalette,
} from "@/app/lib/profile-art";
import {
  getMaintainerProfile,
  isValidMaintainerName,
  normalizeMaintainerName,
  type MaintainerProfile,
} from "@/app/lib/profiles";
import type { PackageSummary } from "@/app/lib/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ name: string }>;
}): Promise<Metadata> {
  const { name } = await params;
  const normalized = normalizeMaintainerName(name);
  const valid = isValidMaintainerName(normalized);

  return {
    title: valid ? `@${normalized}` : "Maintainer not found",
    description: valid
      ? `Packages maintained by @${normalized} on npm.`
      : "This maintainer handle is not valid.",
    alternates: valid ? { canonical: `/maintainer/${normalized}` } : undefined,
    robots: valid ? undefined : { index: false, follow: false },
  };
}

function Stat({
  label,
  value,
  accent,
  className = "",
}: {
  label: string;
  value: string;
  accent: string;
  className?: string;
}) {
  return (
    <div
      className={`min-w-0 rounded-[var(--radius-sm)] border border-border-subtle bg-surface p-4 ${className}`}
    >
      <span
        aria-hidden="true"
        className="block h-0.5 w-7 rounded-full"
        style={{ backgroundColor: accent }}
      />
      <p className="mt-3 mb-0 truncate font-mono text-[22px] leading-none font-semibold tracking-[-0.02em] text-text-primary">
        {value}
      </p>
      <p className="mt-1.5 mb-0 font-mono text-[9px] uppercase tracking-[0.1em] text-text-muted">
        {label}
      </p>
    </div>
  );
}

function SectionTag({ label, note }: { label: string; note?: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-text-label">
        {label}
      </span>
      {note ? (
        <span className="font-mono text-[9px] text-text-muted">{note}</span>
      ) : null}
    </div>
  );
}

function TelemetryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border-subtle py-1.5 last:border-b-0">
      <dt className="font-mono text-[10px] uppercase tracking-[0.08em] text-text-muted">
        {label}
      </dt>
      <dd className="min-w-0 truncate text-right font-mono text-[11px] text-text-secondary">
        {value}
      </dd>
    </div>
  );
}

function SpecimenCard({
  item,
  index,
  accent,
}: {
  item: PackageSummary;
  index: number;
  accent: string;
}) {
  return (
    <Link
      href={`/package/${encodeURIComponent(item.name)}`}
      data-preview-title={item.name}
      data-preview-subtitle={item.description?.trim() || "npm package"}
      data-preview-meta={`v${item.version} · ${
        typeof item.weeklyDownloads === "number"
          ? `${formatCompactNumber(item.weeklyDownloads)} / wk`
          : "downloads unknown"
      }`}
      className="group flex min-w-0 flex-col justify-between rounded-[var(--radius-sm)] border border-border-subtle bg-surface p-4 transition-colors duration-150 ease-out hover:border-border-strong hover:bg-surface-raised"
      style={{ borderTopColor: accent, borderTopWidth: 2 }}
    >
      <div className="min-w-0">
        <div className="flex items-center justify-between gap-3">
          <span
            className="font-mono text-[9px] tracking-[0.1em]"
            style={{ color: accent }}
          >
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="font-mono text-[9px] tracking-[0.08em] text-text-muted">
            v{item.version}
          </span>
        </div>
        <p className="mt-2 mb-0 truncate font-mono text-[14px] font-semibold text-text-primary transition-colors duration-150 ease-out group-hover:text-brand">
          {item.name}
        </p>
        <p className="mt-1 mb-0 line-clamp-2 text-[11px] leading-5 text-text-secondary">
          {item.description?.trim() || "No description provided."}
        </p>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3 font-mono text-[10px]">
        <span className="text-brand-2">
          {typeof item.weeklyDownloads === "number"
            ? `${formatCompactNumber(item.weeklyDownloads)} / wk`
            : "—"}
        </span>
        <span className="text-text-muted opacity-0 transition-opacity duration-150 ease-out group-hover:opacity-100">
          open →
        </span>
      </div>
    </Link>
  );
}

function ChartSkeleton() {
  return (
    <div className="mt-4 space-y-2" aria-busy="true" aria-label="Loading reach">
      <SkeletonBlock className="h-6 w-40" />
      <SkeletonBlock className="h-24 w-full" />
    </div>
  );
}

function ProfileBodySkeleton() {
  return (
    <div className="mt-4 space-y-3" aria-busy="true" aria-label="Loading maintainer">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className={`rounded-[var(--radius-sm)] border border-border-subtle bg-surface p-4 ${
              index === 2 ? "col-span-2 sm:col-span-1" : ""
            }`}
          >
            <SkeletonBlock className="h-0.5 w-7" />
            <SkeletonBlock className="mt-3 h-6 w-24" />
            <SkeletonBlock className="mt-2 h-3 w-16" />
          </div>
        ))}
      </div>
      <div className="grid gap-3 lg:grid-cols-[1.15fr_0.85fr]">
        <SkeletonBlock className="h-64 w-full" />
        <SkeletonBlock className="h-64 w-full" />
      </div>
      <SkeletonBlock className="h-32 w-full" />
    </div>
  );
}

async function MaintainerBody({
  name,
  seed,
  palette,
}: {
  name: string;
  seed: string;
  palette: ProfilePalette;
}) {
  let profile: MaintainerProfile | null = null;

  try {
    profile = await getMaintainerProfile(name);
  } catch {
    profile = null;
  }

  if (!profile) {
    return (
      <div className="mt-4">
        <StatusPanel
          error
          title="Maintainer is unavailable"
          message="We couldn't reach the npm registry right now. Try again in a moment."
        />
      </div>
    );
  }

  if (profile.total === 0) {
    return (
      <div className="mt-4">
        <StatusPanel
          title="No packages found"
          message={`@${name} has no packages indexed by the registry search. The npm profile may still exist.`}
        />
        <a
          href={`https://www.npmjs.com/~${encodeURIComponent(name)}`}
          target="_blank"
          rel="noreferrer noopener"
          className="mt-4 inline-flex min-h-11 items-center gap-1 font-mono text-[11px] text-text-secondary transition-colors duration-150 ease-out hover:text-text-primary"
        >
          Open the npm profile
          <ArrowUpRight aria-hidden="true" className="h-3 w-3" />
        </a>
      </div>
    );
  }

  const top = profile.topPackage;
  const trendPackages = profile.packages.slice(0, 5);
  const mapped = Math.min(profile.packages.length, 12);
  const leaderWeekly = top?.weeklyDownloads ?? 0;
  const leaders = profile.packages.slice(0, 4).map((item) => ({
    name: item.name,
    weekly: item.weeklyDownloads ?? 0,
    ratio:
      leaderWeekly > 0
        ? ((item.weeklyDownloads ?? 0) / leaderWeekly) * 100
        : 0,
  }));

  return (
    <>
      <section
        aria-label="Maintainer telemetry"
        className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3"
      >
        <Stat
          label="packages"
          value={profile.total.toLocaleString("en-US")}
          accent={palette.a}
        />
        <Stat
          label="weekly · top 50"
          value={formatCompactNumber(profile.weeklyDownloads)}
          accent={palette.b}
        />
        <Stat
          label="top package"
          value={top?.name ?? "—"}
          accent="var(--text-primary)"
          className="col-span-2 sm:col-span-1"
        />
      </section>

      <div className="mt-4 grid gap-3 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="min-w-0 rounded-[var(--radius-sm)] border border-border-subtle bg-surface p-4">
          <SectionTag label="signal" note={`${mapped} packages mapped`} />
          <div className="mt-3">
            <PackageConstellation
              name={name}
              packages={profile.packages}
              palette={palette}
            />
          </div>
        </section>

        <section className="min-w-0 rounded-[var(--radius-sm)] border border-border-subtle bg-surface p-4">
          <SectionTag label="telemetry" note="top 50 snapshot" />
          <dl className="mt-3 space-y-0">
            <TelemetryRow label="handle" value={`@${name}`} />
            <TelemetryRow label="seed" value={seed} />
            <TelemetryRow
              label="packages"
              value={profile.total.toLocaleString("en-US")}
            />
            <TelemetryRow
              label="weekly"
              value={`${formatCompactNumber(profile.weeklyDownloads)} / wk`}
            />
            <TelemetryRow label="top" value={top?.name ?? "—"} />
          </dl>
          {top ? (
            <p className="mt-4 mb-0 text-[11px] leading-5 text-text-secondary">
              The brightest node is{" "}
              <Link
                href={`/package/${encodeURIComponent(top.name)}`}
                className="font-mono text-text-primary underline decoration-border-strong underline-offset-4 hover:text-brand"
              >
                {top.name}
              </Link>
              . Node size is its weekly download count, not a quality score.
            </p>
          ) : null}

          {leaders.length > 0 ? (
            <div className="mt-5">
              <div className="flex items-baseline justify-between gap-2 font-mono text-[9px] uppercase tracking-[0.1em] text-text-muted">
                <span>top packages</span>
                <span>weekly</span>
              </div>
              <ul className="mt-2.5 mb-0 list-none space-y-2.5 p-0">
                {leaders.map((item, index) => (
                  <li key={item.name}>
                    <div className="flex items-baseline justify-between gap-3 font-mono text-[10px]">
                      <Link
                        href={`/package/${encodeURIComponent(item.name)}`}
                        className="min-w-0 truncate text-text-secondary transition-colors duration-150 ease-out hover:text-text-primary"
                      >
                        {item.name}
                      </Link>
                      <span className="shrink-0 tabular-nums text-text-muted">
                        {formatCompactNumber(item.weekly)}
                      </span>
                    </div>
                    <div
                      aria-hidden="true"
                      className="mt-1 h-[3px] overflow-hidden rounded-full bg-surface-code"
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.max(item.ratio, 2)}%`,
                          backgroundColor:
                            index === 0 ? palette.a : palette.b,
                          opacity: index === 0 ? 1 : 0.6 - (index - 1) * 0.12,
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      </div>

      <section className="mt-4 rounded-[var(--radius-sm)] border border-border-subtle bg-surface p-4">
        <SectionTag label="reach" note="top 5 packages · last 30 days" />
        <div className="mt-3">
          <Suspense fallback={<ChartSkeleton />}>
            <MaintainerReach
              name={name}
              packages={trendPackages}
              accent={palette.a}
            />
          </Suspense>
        </div>
      </section>

      <section className="mt-8">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border-subtle pb-3">
          <div>
            <p className="m-0 font-mono text-[10px] uppercase tracking-[0.1em] text-text-label">
              specimens
            </p>
            <h2 className="mt-1 mb-0 text-[18px] font-semibold tracking-[-0.01em] text-text-primary">
              Packages
            </h2>
          </div>
          <p className="m-0 font-mono text-[10px] text-text-muted">
            showing {profile.packages.length} of{" "}
            {profile.total.toLocaleString("en-US")}
          </p>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {profile.packages.map((item, index) => (
            <SpecimenCard
              key={item.name}
              item={item}
              index={index}
              accent={index % 3 === 0 ? palette.b : palette.a}
            />
          ))}
        </div>

        <Link
          href={`/search?q=${encodeURIComponent(`maintainer:${name}`)}`}
          className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-sm)] border border-border-subtle px-4 font-mono text-[11px] text-text-secondary transition-colors duration-150 ease-out hover:border-border-strong hover:text-text-primary"
        >
          See all {profile.total.toLocaleString("en-US")} packages
          <ChevronRight aria-hidden="true" className="h-3.5 w-3.5" />
        </Link>
      </section>
    </>
  );
}

export default async function MaintainerPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  const normalized = normalizeMaintainerName(name);

  if (!isValidMaintainerName(normalized)) notFound();

  const palette = getProfilePalette(normalized);
  const seed = getProfileSeed(normalized);
  const bars = getSignalBars(normalized);

  return (
    <AppShell>
      <PageContainer className="py-8 lg:py-10">
        <Link
          href="/search"
          className="inline-flex min-h-11 items-center gap-1 font-mono text-[11px] text-text-secondary transition-colors duration-150 ease-out hover:text-text-primary"
        >
          <ChevronLeft aria-hidden="true" className="h-3.5 w-3.5" />
          search
        </Link>

        <header className="relative mt-4 overflow-hidden rounded-[var(--radius-md)] border border-border-subtle bg-surface p-5 sm:p-7">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background: `radial-gradient(circle at 12% 18%, ${palette.a}16, transparent 55%)`,
            }}
          />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="h-24 w-24 shrink-0 overflow-hidden rounded-[var(--radius-sm)] border border-border-strong">
              <ProfileSigil name={normalized} palette={palette} />
            </div>

            <div className="min-w-0 flex-1">
              <p className="m-0 font-mono text-[10px] uppercase tracking-[0.12em] text-text-label">
                maintainer signal
              </p>
              <h1 className="mt-1 mb-0 break-words font-mono text-[clamp(34px,8vw,72px)] leading-[0.95] font-semibold tracking-[-0.04em] text-text-primary">
                <span style={{ color: palette.a }}>@</span>
                {normalized}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[11px] text-text-secondary">
                <span>seed {seed}</span>
                <span aria-hidden="true" className="text-border-strong">
                  /
                </span>
                <span>npm maintainer</span>
                <a
                  href={`https://www.npmjs.com/~${encodeURIComponent(normalized)}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1 text-text-secondary transition-colors duration-150 ease-out hover:text-text-primary"
                >
                  npm profile
                  <ArrowUpRight aria-hidden="true" className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>

          <div
            aria-hidden="true"
            className="relative mt-5 flex h-6 items-end gap-[3px]"
          >
            {bars.map((height, index) => (
              <span
                key={index}
                className="min-w-0 flex-1 rounded-[1px]"
                style={{
                  height: `${height}px`,
                  backgroundColor: index % 3 === 0 ? palette.b : palette.a,
                  opacity: 0.25 + (height / 24) * 0.55,
                }}
              />
            ))}
          </div>
        </header>

        <Suspense fallback={<ProfileBodySkeleton />}>
          <MaintainerBody name={normalized} seed={seed} palette={palette} />
        </Suspense>
      </PageContainer>
    </AppShell>
  );
}
