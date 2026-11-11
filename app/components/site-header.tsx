import Link from "next/link";
import { Suspense } from "react";
import { HeaderBackdrop } from "./header-backdrop";
import { SearchBox, SearchBoxFallback } from "./search-box";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40">
      <HeaderBackdrop />
      <div className="relative mx-auto flex h-[var(--header-height)] w-full max-w-[var(--container-max)] items-center gap-3 px-4 sm:gap-4 sm:px-6">
        <Link
          href="/"
          className="group flex min-h-11 shrink-0 items-center gap-1 font-mono text-[13px] leading-none tracking-[-0.01em]"
        >
          <span aria-hidden="true" className="text-brand">
            /
          </span>
          <span className="text-text-primary transition-colors duration-150 ease-out group-hover:text-brand">
            npmsearch
          </span>
          <span className="hidden text-[10px] text-text-secondary lg:inline">v0.1</span>
        </Link>

        <div className="min-w-0 flex-1 lg:pointer-events-none lg:absolute lg:top-0 lg:left-1/2 lg:flex lg:h-[var(--header-height)] lg:w-[min(560px,calc(100vw_-_28rem))] lg:-translate-x-1/2 lg:items-center">
          <Suspense fallback={<SearchBoxFallback />}>
            <SearchBox />
          </Suspense>
        </div>

        <nav
          aria-label="Primary"
          className="ml-auto hidden shrink-0 items-center gap-4 font-mono text-[11px] text-text-secondary md:flex"
        >
          <Link
            href="/search"
            className="transition-colors duration-150 ease-out hover:text-text-primary"
          >
            search
          </Link>
          <span aria-hidden="true" className="text-border-strong">
            |
          </span>
          <span>registry.npmjs.org</span>
        </nav>
      </div>
    </header>
  );
}
