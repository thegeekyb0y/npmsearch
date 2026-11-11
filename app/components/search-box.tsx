"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  startTransition,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { emitSearchQuery } from "../lib/search-events";

const DEBOUNCE_MS = 100;

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

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAppliedRef = useRef(routeQuery);
  const hasLeadingFiredRef = useRef(false);
  const composingRef = useRef(false);

  if (routeQuery !== previousRouteQuery) {
    setPreviousRouteQuery(routeQuery);
    setQuery(routeQuery);
  }

  useEffect(() => {
    lastAppliedRef.current = routeQuery;
  }, [routeQuery]);

  useEffect(() => {
    function handlePopState() {
      const params = new URLSearchParams(window.location.search);
      const urlQuery = params.get("q")?.trim() ?? "";

      if (urlQuery) {
        setQuery(urlQuery);
        lastAppliedRef.current = urlQuery;
        return;
      }

      if (window.location.pathname.startsWith("/package/")) {
        const packageName = decodeURIComponent(
          window.location.pathname.replace("/package/", ""),
        );
        setQuery(packageName);
        lastAppliedRef.current = packageName;
        return;
      }

      setQuery("");
      lastAppliedRef.current = "";
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function applyQuery(raw: string) {
    const trimmed = raw.trim();

    if (trimmed === lastAppliedRef.current) return;
    lastAppliedRef.current = trimmed;

    const target = trimmed
      ? `/search?q=${encodeURIComponent(trimmed)}`
      : "/search";

    if (pathname === "/search") {
      window.history.replaceState(null, "", target);
      emitSearchQuery(trimmed);
      return;
    }

    if (!trimmed) {
      startTransition(() => router.push("/"));
      return;
    }

    startTransition(() => router.push(target));
  }

  function schedule(value: string) {
    if (composingRef.current) return;

    // Fire once at the start of a burst, then once after typing stops.
    if (pathname === "/search" && !hasLeadingFiredRef.current) {
      hasLeadingFiredRef.current = true;
      applyQuery(value);
    }

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      hasLeadingFiredRef.current = false;
      applyQuery(value);
      timerRef.current = null;
    }, DEBOUNCE_MS);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    hasLeadingFiredRef.current = false;

    const trimmed = query.trim();

    if (!trimmed) {
      startTransition(() => router.push("/"));
      return;
    }

    const target = `/search?q=${encodeURIComponent(trimmed)}`;
    lastAppliedRef.current = trimmed;

    if (pathname === "/search") {
      startTransition(() => router.replace(target, { scroll: false }));
      emitSearchQuery(trimmed);
      return;
    }

    startTransition(() => router.push(target));
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
          className="pointer-events-none absolute inset-y-0 left-3 flex items-center font-mono text-[12px] text-text-secondary"
        >
          /
        </span>
        <input
          type="search"
          name="q"
          value={query}
          onChange={(event) => {
            const value = event.target.value;
            setQuery(value);
            schedule(value);
          }}
          onCompositionStart={() => {
            composingRef.current = true;
          }}
          onCompositionEnd={(event) => {
            composingRef.current = false;
            schedule(event.currentTarget.value);
          }}
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="search"
          aria-label="Search npm packages"
          placeholder="search packages…"
          className="min-h-11 w-full rounded-[var(--radius-sm)] border border-border-subtle bg-surface-code py-2 pr-3 pl-7 text-[13px] text-text-primary transition-colors duration-150 ease-out placeholder:text-text-secondary hover:border-border-strong focus:border-brand"
        />
      </div>
      <button
        type="submit"
        aria-label="Search packages"
        className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-border-subtle bg-transparent px-2 text-[12px] font-medium text-text-secondary transition-colors duration-150 ease-out hover:border-border-strong hover:bg-surface-raised hover:text-text-primary sm:px-3"
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
          className="pointer-events-none absolute inset-y-0 left-3 flex items-center font-mono text-[12px] text-text-secondary"
        >
          /
        </span>
        <input
          type="search"
          name="q"
          aria-label="Search npm packages"
          placeholder="search packages…"
          className="min-h-11 w-full rounded-[var(--radius-sm)] border border-border-subtle bg-surface-code py-2 pr-3 pl-7 text-[13px] text-text-primary placeholder:text-text-secondary focus:border-brand"
        />
      </div>
      <button
        type="submit"
        aria-label="Search packages"
        className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-border-subtle bg-transparent px-2 text-[12px] font-medium text-text-secondary sm:px-3"
      >
        <Search className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
        <span className="hidden sm:inline">search</span>
      </button>
    </form>
  );
}
