import Link from "next/link";
import { PageContainer } from "./components/ui";

const suggestedPackages = ["react", "next", "typescript", "tailwindcss", "vite", "zod"];

const workflow = [
  {
    step: "01",
    title: "search",
    body: "Query the registry by name, scope, or keyword. Results stay dense and scannable.",
  },
  {
    step: "02",
    title: "inspect",
    body: "Read versions, dependencies, compatibility, install size, and the README in one view.",
  },
  {
    step: "03",
    title: "install",
    body: "Copy a command for npm, pnpm, yarn, or bun without leaving the page.",
  },
];

export default function HomePage() {
  return (
    <PageContainer className="py-10 sm:py-16">
      <section className="max-w-[760px]">
        <p className="m-0 font-mono text-[11px] uppercase tracking-[0.08em] text-text-label">
          {"// npm registry browser"}
        </p>
        <h1 className="mt-4 mb-0 font-mono text-[clamp(32px,6vw,48px)] leading-[1.05] font-semibold tracking-[-0.03em] text-text-primary">
          search the registry.
        </h1>
        <p className="mt-4 mb-0 max-w-[62ch] text-[15px] leading-7 text-text-secondary">
          A faster, quieter interface for the npm ecosystem. No noise, no marketing
          pages — just package data, versions, and READMEs.
        </p>
      </section>

      <section
        aria-labelledby="popular-heading"
        className="home-search-space mt-12 border-t border-border-subtle pt-5"
      >
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-3">
          <h2
            id="popular-heading"
            className="m-0 font-mono text-[11px] uppercase tracking-[0.08em] text-text-label"
          >
            popular
          </h2>
          <ul className="m-0 flex list-none flex-wrap items-center gap-x-5 gap-y-2 p-0">
            {suggestedPackages.map((pkg) => (
              <li key={pkg}>
                <Link
                  href={`/package/${pkg}`}
                  className="inline-flex min-h-11 items-center font-mono text-[13px] text-text-secondary transition-colors duration-150 ease-out hover:text-brand"
                >
                  {pkg}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section
        aria-label="How npmsearch works"
        className="mt-12 grid gap-px border-y border-border-subtle bg-border-subtle sm:grid-cols-3"
      >
        {workflow.map((item) => (
          <div key={item.step} className="bg-background px-4 py-5 sm:px-5">
            <span className="font-mono text-[10px] text-text-secondary">{item.step}</span>
            <h2 className="mt-2 mb-0 font-mono text-[14px] font-medium text-text-primary">
              {item.title}
            </h2>
            <p className="mt-2 mb-0 text-[12px] leading-5 text-text-secondary">{item.body}</p>
          </div>
        ))}
      </section>
    </PageContainer>
  );
}
