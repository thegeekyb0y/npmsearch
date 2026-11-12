import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ArrowUpRight, Github } from "lucide-react";
import {
  Flow,
  TONE_TEXT,
  type Tone,
} from "@/app/components/engineering/flow";
import { TechStack } from "@/app/components/engineering/tech-stack";
import { AppShell, PageContainer } from "@/app/components/ui";
import { GITHUB_REPO_URL } from "@/app/lib/site";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "The engineering decisions behind npmsearch: a small manifest shell, streamed sections, stale-while-revalidate caching, client search and a server-rendered README pipeline.",
};

function Metric({
  value,
  label,
  tone,
}: {
  value: string;
  label: string;
  tone: Tone;
}) {
  return (
    <div className="min-w-0 border-t border-border-subtle pt-3">
      <p
        className={`m-0 font-mono text-[clamp(22px,3vw,30px)] leading-none font-semibold tracking-[-0.02em] ${TONE_TEXT[tone]}`}
      >
        {value}
      </p>
      <p className="mt-2 mb-0 font-mono text-[10px] leading-4 uppercase tracking-[0.08em] text-text-muted">
        {label}
      </p>
    </div>
  );
}

function SectionCard({
  number,
  title,
  tone,
  lead,
  className = "",
  children,
}: {
  number: string;
  title: string;
  tone: Tone;
  lead: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={`rounded-[var(--radius-md)] border border-border-subtle bg-surface p-5 transition-colors duration-150 ease-out hover:border-border-strong ${className}`}
    >
      <div className="flex items-baseline gap-2">
        <span className={`font-mono text-[10px] ${TONE_TEXT[tone]}`}>
          {number}
        </span>
        <h2 className="m-0 text-[16px] font-semibold tracking-[-0.01em] text-text-primary">
          {title}
        </h2>
      </div>
      <p className="mt-2 mb-0 text-[12px] leading-5 text-text-secondary">
        {lead}
      </p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Points({ items }: { items: string[] }) {
  return (
    <ul className="mt-3 mb-0 list-none space-y-1.5 p-0 font-mono text-[10px] leading-4 text-text-secondary">
      {items.map((item) => (
        <li key={item} className="flex gap-2">
          <span aria-hidden="true" className="text-text-muted">
            ·
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

const TTL_ROWS = [
  ["search", "60s / 1h"],
  ["package", "5m / 24h"],
  ["analytics", "1h / 24h"],
  ["readme", "1d / 7d"],
];

const TRADEOFFS = [
  [
    "Small manifest shell",
    "Full packument shell",
    "First paint stays small even when the packument is 31 MB.",
  ],
  [
    "Upstash stale-while-revalidate",
    "Postgres cache",
    "Read-heavy, TTL-shaped data; no schema or migrations for cache entries.",
  ],
  [
    "Client search while typing",
    "Server render per keystroke",
    "No RSC churn, no aborted server requests, one fetch path.",
  ],
  [
    "Custom SVG downloads chart",
    "Charting library",
    "Thirty points do not justify a runtime; keyboard and pointer are ours.",
  ],
  [
    "Native <details> disclosures",
    "Client accordions",
    "Zero JavaScript; works before hydration and in the HTML source.",
  ],
  [
    "jsDelivr README fallback",
    "Extracting the tarball",
    "One small request instead of a tar parser and a multi-megabyte download.",
  ],
];

export default function HowItWorksPage() {
  return (
    <AppShell>
      <PageContainer className="py-10 lg:py-14">
        <header className="max-w-[820px]">
          <p className="m-0 font-mono text-[11px] uppercase tracking-[0.08em] text-text-label">
            engineering
          </p>
          <h1 className="mt-3 mb-0 text-[clamp(32px,5vw,48px)] leading-[1.05] font-semibold tracking-[-0.03em] text-text-primary">
            Fast is a design decision<span className="text-brand">.</span>
          </h1>
          <p className="mt-4 mb-0 max-w-[68ch] text-[15px] leading-7 text-text-secondary">
            npmsearch renders a small manifest first, streams the heavy parts,
            and caches every slow upstream. No request waterfalls, no 31 MB
            first paint. This page is the map.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[11px]">
            <a href="#request" className="link-underline text-text-secondary transition-colors duration-150 ease-out hover:text-text-primary">
              how it works
            </a>
            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1 text-text-secondary transition-colors duration-150 ease-out hover:text-text-primary"
            >
              read the source
              <ArrowUpRight aria-hidden="true" className="h-3 w-3" />
            </a>
          </div>
        </header>

        <section
          aria-label="Performance numbers"
          className="mt-10 grid grid-cols-2 gap-x-6 gap-y-6 lg:grid-cols-4"
        >
          <Metric value="31 MB" label="packument kept off first paint" tone="blue" />
          <Metric value="100 ms" label="search debounce" tone="teal" />
          <Metric value="1,000" label="results, virtualized" tone="violet" />
          <Metric value="30 days" label="download history" tone="green" />
        </section>

        <div id="request" className="mt-12 grid gap-3 lg:grid-cols-2">
          <SectionCard
            number="01"
            title="The shell"
            tone="orange"
            lead="The first paint never waits for the README. The shell is built from a single small manifest plus downloads."
            className="lg:col-span-2"
          >
            <Flow
              steps={[
                { label: "request", detail: "browser", tone: "blue" },
                { label: "RSC shell", detail: "next.js", tone: "orange" },
                {
                  label: "/pkg/latest",
                  detail: "+ downloads, parallel",
                  tone: "teal",
                },
                {
                  label: "streamed",
                  detail: "README · analytics · history",
                  tone: "violet",
                },
              ]}
              caption="Heavy sections suspend independently; the shell never blocks on the full packument."
            />
            <Points
              items={[
                "The latest manifest is a few kilobytes, not a 31 MB document.",
                "Metadata and downloads fetch in parallel; no waterfall.",
                "Skeletons reserve the final boxes, so streamed sections do not shift the layout.",
              ]}
            />
          </SectionCard>

          <SectionCard
            number="02"
            title="The cache"
            tone="violet"
            lead="Stale data is served immediately. Refresh happens after the response, not during it."
          >
            <Flow
              steps={[
                { label: "request", detail: "route or API", tone: "blue" },
                { label: "Upstash", detail: "versioned key", tone: "violet" },
                { label: "serve", detail: "fresh / stale", tone: "green" },
                { label: "after()", detail: "one refresh", tone: "orange" },
              ]}
            />
            <div className="mt-4 space-y-1 border-t border-border-subtle pt-3 font-mono text-[10px]">
              {TTL_ROWS.map(([kind, ttl]) => (
                <div key={kind} className="flex items-center justify-between gap-4">
                  <span className="text-text-muted">{kind}</span>
                  <span className="text-text-secondary">{ttl}</span>
                </div>
              ))}
            </div>
            <Points
              items={[
                "Fresh and hard TTLs; stale entries still render.",
                "One in-flight refresh per key, deduped with after().",
                "Cache failures are fail-open: the page falls back to upstream.",
              ]}
            />
          </SectionCard>

          <SectionCard
            number="03"
            title="Search"
            tone="teal"
            lead="The input is the source of truth. Typing updates the URL without re-rendering the server page."
          >
            <Flow
              steps={[
                { label: "keystroke", detail: "input", tone: "orange" },
                { label: "100 ms", detail: "leading + trailing", tone: "teal" },
                { label: "/api/search", detail: "abort previous", tone: "blue" },
                { label: "virtual rows", detail: "1,000 cap", tone: "violet" },
              ]}
            />
            <Points
              items={[
                "AbortController cancels the previous request.",
                "history.replaceState keeps the URL shareable without RSC churn.",
                "A 60-second client cache serves repeat queries instantly.",
              ]}
            />
          </SectionCard>

          <SectionCard
            number="04"
            title="README"
            tone="blue"
            lead="Registry first. If it is empty, fetch the published README, then sanitize and highlight on the server."
          >
            <Flow
              steps={[
                { label: "registry", detail: "readme field", tone: "blue" },
                { label: "jsDelivr", detail: "fallback", tone: "violet" },
                { label: "sanitize", detail: "rehype schema", tone: "orange" },
                { label: "Shiki", detail: "server only", tone: "teal" },
                { label: "TOC + copy", detail: "reader tools", tone: "green" },
              ]}
            />
            <Points
              items={[
                "Scripts, iframes and event handlers never reach the DOM.",
                "Relative images and links resolve against the GitHub repository.",
                "Common grammars are preloaded; rare ones are lazy.",
              ]}
            />
          </SectionCard>

          <SectionCard
            number="05"
            title="Analytics"
            tone="green"
            lead="Install size and outdated dependencies are estimates computed from registry manifests, with hard bounds."
          >
            <Flow
              steps={[
                { label: "direct deps", detail: "latest manifests", tone: "teal" },
                { label: "bounded BFS", detail: "depth 3 · 60 pkgs · 2s", tone: "green" },
                { label: "size + status", detail: "ESM · CJS · types", tone: "violet" },
              ]}
            />
            <Points
              items={[
                "8 concurrent requests; time and package budgets stop fan-out.",
                "A dependency is outdated when the latest release leaves its range.",
                "Estimates are labelled; truncated results end with a +.",
              ]}
            />
          </SectionCard>

          <SectionCard
            number="06"
            title="Routes"
            tone="orange"
            lead="The canonical route is long-form. The short routes are aliases, including scoped and pinned versions."
          >
            <Flow
              steps={[
                { label: "/package/axios", detail: "canonical", tone: "blue" },
                { label: "/axios", detail: "short alias", tone: "teal" },
                { label: "/axios@1.21.1", detail: "pinned", tone: "violet" },
              ]}
            />
            <Points
              items={[
                "Scoped names work: /@types/node and /@types/node@22.",
                "Reserved top-level paths are rejected before the registry.",
                "The home page stays static; only package pages are dynamic.",
              ]}
            />
          </SectionCard>

          <SectionCard
            number="07"
            title="Interface"
            tone="violet"
            lead="One dark palette, one motion library, and a hard 44px target. The UI is quiet so the data is loud."
          >
            <div className="flex flex-wrap gap-2">
              {[
                ["teal", "downloads"],
                ["blue", "CJS"],
                ["green", "types"],
                ["violet", "open source"],
                ["orange", "actions"],
              ].map(([tone, label]) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1.5 rounded-[var(--radius-xs)] border border-border-subtle px-2 py-1 font-mono text-[9px] uppercase tracking-[0.08em] text-text-secondary"
                >
                  <span
                    aria-hidden="true"
                    className={`h-1.5 w-1.5 rounded-full ${
                      tone === "teal"
                        ? "bg-brand-2"
                        : tone === "blue"
                          ? "bg-accent-blue"
                          : tone === "green"
                            ? "bg-accent-green"
                            : tone === "violet"
                              ? "bg-accent-violet"
                              : "bg-brand"
                    }`}
                  />
                  {label}
                </span>
              ))}
            </div>
            <Points
              items={[
                "Motion is limited to opacity and transform; no layout animation.",
                "Reduced motion is respected globally; focus rings are never removed.",
                "Token changes live in app/globals.css — no Tailwind config.",
              ]}
            />
          </SectionCard>
        </div>

        <section id="stack" className="mt-12 border-t border-border-subtle pt-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="m-0 font-mono text-[11px] uppercase tracking-[0.08em] text-text-label">
                stack
              </p>
              <h2 className="mt-1 mb-0 text-[20px] font-semibold tracking-[-0.02em] text-text-primary">
                Small, sharp tools.
              </h2>
            </div>
            <p className="m-0 max-w-[42ch] text-[11px] leading-5 text-text-muted">
              No CSS-in-JS, no component library, no chart runtime. The boring
              parts stay boring.
            </p>
          </div>
          <div className="mt-4">
            <TechStack />
          </div>
        </section>

        <section className="mt-12">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="m-0 text-[20px] font-semibold tracking-[-0.02em] text-text-primary">
              Tradeoffs
            </h2>
            <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-text-muted">
              not every default
            </span>
          </div>
          <div className="mt-4 overflow-x-auto rounded-[var(--radius-md)] border border-border-subtle">
            <table className="min-w-full border-collapse text-left text-[12px]">
              <thead className="bg-surface-raised text-text-primary">
                <tr>
                  <th className="border-b border-border-subtle px-4 py-3 font-medium">
                    decision
                  </th>
                  <th className="border-b border-border-subtle px-4 py-3 font-medium">
                    alternative
                  </th>
                  <th className="border-b border-border-subtle px-4 py-3 font-medium">
                    why
                  </th>
                </tr>
              </thead>
              <tbody>
                {TRADEOFFS.map(([decision, alternative, why]) => (
                  <tr key={decision} className="border-b border-border-subtle last:border-b-0">
                    <td className="px-4 py-3 align-top font-mono text-[11px] text-text-primary">
                      {decision}
                    </td>
                    <td className="px-4 py-3 align-top text-text-secondary">
                      {alternative}
                    </td>
                    <td className="px-4 py-3 align-top text-text-secondary">
                      {why}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-12 rounded-[var(--radius-md)] border border-border-subtle bg-surface p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-[58ch]">
              <p className="m-0 font-mono text-[11px] uppercase tracking-[0.08em] text-text-label">
                open source
              </p>
              <h2 className="mt-1 mb-0 text-[20px] font-semibold tracking-[-0.02em] text-text-primary">
                Built in the open.
              </h2>
              <p className="mt-2 mb-0 text-[12px] leading-5 text-text-secondary">
                If you care about fast interfaces and honest registry data,
                there is room. Start with an issue, a test, or a small
                performance win.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                href={GITHUB_REPO_URL}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-sm)] border border-brand bg-brand px-4 font-mono text-[12px] text-background transition-colors duration-150 ease-out hover:border-brand-hover hover:bg-brand-hover"
              >
                <Github aria-hidden="true" className="h-4 w-4" />
                contribute
              </a>
              <a
                href={`${GITHUB_REPO_URL}/issues/new?template=ai_search.yml`}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-sm)] border border-border-subtle px-4 font-mono text-[12px] text-text-secondary transition-colors duration-150 ease-out hover:border-border-strong hover:text-text-primary"
              >
                propose AI search
                <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </section>
      </PageContainer>
    </AppShell>
  );
}
