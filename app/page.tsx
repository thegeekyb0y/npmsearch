import Link from "next/link";
import { AppShell, PageContainer, SearchForm } from "./components/ui";

const suggestedPackages = ["react", "next", "typescript", "tailwindcss", "zod"];

export default function HomePage() {
  return (
    <AppShell>
      <PageContainer className="flex min-h-screen items-center py-8">
        <main className="w-full max-w-140">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-3">
              <p className="m-0 text-[12px] font-medium uppercase tracking-[0.08em] text-text-secondary">
                npm registry browser
              </p>
              <h1 className="m-0 text-[24px] leading-[1.1] font-semibold tracking-[-0.01em] text-text-primary md:text-[32px]">
                Find packages with a cleaner, faster view.
              </h1>
              <p className="m-0 max-w-[48ch] text-[16px] leading-[1.6] text-text-secondary">
                Search the npm ecosystem with a sharper layout, clearer
                metadata, and package pages built for real work.
              </p>
            </div>

            <SearchForm placeholder="Search packages, scopes, and libraries" />

            {suggestedPackages.length > 0 ? (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-border-subtle pt-4">
                <span className="text-[13px] leading-normal text-text-muted">
                  Popular
                </span>
                {suggestedPackages.map((pkg) => (
                  <Link
                    key={pkg}
                    href={`/package/${pkg}`}
                    className="text-[13px] text-text-secondary transition-colors duration-150 ease-out hover:text-text-primary"
                  >
                    {pkg}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        </main>
      </PageContainer>
    </AppShell>
  );
}
