"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { startTransition, useState, type FormEvent } from "react";

function getRouteQuery(pathname: string, searchParams: URLSearchParams) {
  const query = searchParams.get("q")?.trim();
  if (query) return query;
  if (pathname.startsWith("/package/")) {
    return decodeURIComponent(pathname.replace("/package/", ""));
  }
  return "";
}

export function SearchBox() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeQuery = getRouteQuery(pathname, searchParams);
  const [query, setQuery] = useState(routeQuery);
  const [previousRouteQuery, setPreviousRouteQuery] = useState(routeQuery);

  if (routeQuery !== previousRouteQuery) {
    setPreviousRouteQuery(routeQuery);
    setQuery(routeQuery);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();
    startTransition(() => {
      router.push(trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : "/");
    });
  }

  return (
    <form
      action="/search"
      method="GET"
      role="search"
      onSubmit={handleSubmit}
      className="flex min-w-0 flex-1 items-center gap-2"
    >
      <div className="relative min-w-0 flex-1">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-3 flex items-center font-mono text-[12px] text-text-muted"
        >
          /
        </span>
        <input
          type="search"
          name="q"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="search"
          aria-label="Search npm packages"
          placeholder="search packages…"
          className="min-h-9 w-full rounded-[var(--radius-sm)] border border-border-subtle bg-surface-code py-2 pr-3 pl-7 text-[13px] text-text-primary transition-colors duration-150 ease-out placeholder:text-text-muted hover:border-border-strong focus:border-brand focus:outline-none"
        />
      </div>
      <button
        type="submit"
        className="inline-flex min-h-9 min-w-9 shrink-0 items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-border-subtle bg-transparent px-2 text-[12px] font-medium text-text-secondary transition-colors duration-150 ease-out hover:border-border-strong hover:bg-surface-raised hover:text-text-primary sm:px-3"
      >
        <Search className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
        <span className="hidden sm:inline">search</span>
      </button>
    </form>
  );
}

export function SearchBoxFallback() {
  return (
    <form
      action="/search"
      method="GET"
      role="search"
      className="flex min-w-0 flex-1 items-center gap-2"
    >
      <div className="relative min-w-0 flex-1">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-3 flex items-center font-mono text-[12px] text-text-muted"
        >
          /
        </span>
        <input
          type="search"
          name="q"
          aria-label="Search npm packages"
          placeholder="search packages…"
          className="min-h-9 w-full rounded-[var(--radius-sm)] border border-border-subtle bg-surface-code py-2 pr-3 pl-7 text-[13px] text-text-primary placeholder:text-text-muted focus:border-brand focus:outline-none"
        />
      </div>
      <button
        type="submit"
        className="inline-flex min-h-9 min-w-9 shrink-0 items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-border-subtle bg-transparent px-2 text-[12px] font-medium text-text-secondary sm:px-3"
      >
        <Search className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
        <span className="hidden sm:inline">search</span>
      </button>
    </form>
  );
}
