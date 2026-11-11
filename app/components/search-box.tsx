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
import { emitFocusResults } from "../lib/keyboard-events";
import { rememberSearch } from "../lib/recent-searches";
import { emitSearchQuery } from "../lib/search-events";

const DEBOUNCE_MS = 100;
const DOCK_SETTLE_MS = 3_000;

function getRouteQuery(pathname: string, searchParams: URLSearchParams) {
  const query = searchParams.get("q")?.trim();
  if (query) return query;
  if (pathname.startsWith("/package/")) {
    return decodeURIComponent(pathname.replace("/package/", ""));
  }
  return "";
}

function buttonClass(isHome: boolean) {
  return isHome
    ? "border-brand bg-brand text-background hover:border-brand-hover hover:bg-brand-hover"
    : "border-border-subtle bg-transparent text-text-secondary hover:border-border-strong hover:bg-surface-raised hover:text-text-primary";
}

function iconClass(isHome: boolean) {
  return isHome ? "" : "text-brand";
}

export function SearchBox() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isHome = pathname === "/";
  const routeQuery = getRouteQuery(pathname, searchParams);
  const [query, setQuery] = useState(routeQuery);
  const [previousRouteQuery, setPreviousRouteQuery] = useState(routeQuery);
  const [previousIsHome, setPreviousIsHome] = useState(isHome);

  const [animateDock, setAnimateDock] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAppliedRef = useRef(routeQuery);
  const hasLeadingFiredRef = useRef(false);
  const composingRef = useRef(false);

  if (routeQuery !== previousRouteQuery) {
    setPreviousRouteQuery(routeQuery);
    setQuery(routeQuery);
  }

  if (isHome !== previousIsHome) {
    setPreviousIsHome(isHome);
    if (isHome) setAnimateDock(false);
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

  useEffect(() => {
    if (!animateDock || isHome) return;

    const timer = window.setTimeout(() => setAnimateDock(false), DOCK_SETTLE_MS);
    return () => window.clearTimeout(timer);
  }, [animateDock, isHome]);

  useEffect(() => {
    if (!isHome) return;

    const form = formRef.current;
    const wrapper = form?.parentElement;
    const container = form?.closest("[data-header-inner]");
    if (!form || !wrapper || !container) return;

    const update = () => {
      const containerRect = container.getBoundingClientRect();
      const paddingLeft = Number.parseFloat(
        getComputedStyle(container).paddingLeft,
      );
      const contentLeft = containerRect.left + paddingLeft;
      const offset = wrapper.getBoundingClientRect().left - contentLeft;

      form.style.setProperty("--home-dock-x", `${-offset}px`);
    };

    update();
    window.addEventListener("resize", update);

    return () => {
      window.removeEventListener("resize", update);
      form.style.removeProperty("--home-dock-x");
    };
  }, [isHome, pathname]);

  function markDockAnimation() {
    setAnimateDock(true);
  }

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

    rememberSearch(trimmed);
    markDockAnimation();
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
    rememberSearch(trimmed);

    if (pathname === "/search") {
      startTransition(() => router.replace(target, { scroll: false }));
      emitSearchQuery(trimmed);
      return;
    }

    markDockAnimation();
    startTransition(() => router.push(target));
  }

  const dataHome = isHome ? "true" : "false";
  const dataSnap = animateDock && !isHome ? "false" : "true";

  return (
    <form
      ref={formRef}
      action="/search"
      method="GET"
      role="search"
      data-home={dataHome}
      data-snap={dataSnap}
      onSubmit={handleSubmit}
      className="search-dock flex min-w-0 flex-1 items-center gap-2 lg:max-w-[560px]"
    >
      <div className="relative min-w-0 flex-1">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-3 flex items-center font-mono text-[12px] text-brand"
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
          data-global-search
          aria-label="Search npm packages"
          aria-keyshortcuts="/"
          onKeyDown={(event) => {
            if (
              event.key === "ArrowDown" &&
              query.trim() &&
              !event.metaKey &&
              !event.ctrlKey &&
              !event.altKey
            ) {
              event.preventDefault();
              emitFocusResults();
            }
          }}
          placeholder="search packages…"
          className={`min-h-11 w-full rounded-[var(--radius-sm)] border border-border-subtle bg-surface-code py-2 pr-3 pl-7 text-[13px] text-text-primary transition-colors duration-150 ease-out placeholder:text-text-secondary hover:border-border-strong focus:border-brand ${
            isHome ? "lg:min-h-12 lg:text-[15px]" : ""
          }`}
        />
      </div>
      <button
        type="submit"
        aria-label="Search packages"
        className={`inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-[var(--radius-sm)] border px-2 text-[12px] font-medium transition-colors duration-150 ease-out sm:px-3 ${
          isHome ? "lg:min-h-12 lg:min-w-12" : ""
        } ${buttonClass(isHome)}`}
      >
        <Search
          className={`h-4 w-4 ${iconClass(isHome)}`}
          strokeWidth={2}
          aria-hidden="true"
        />
        <span className="hidden sm:inline">search</span>
      </button>
    </form>
  );
}

export function SearchBoxFallback() {
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <form
      action="/search"
      method="GET"
      role="search"
      data-home={isHome ? "true" : "false"}
      data-snap="true"
      className="search-dock flex min-w-0 flex-1 items-center gap-2 lg:max-w-[560px]"
    >
      <div className="relative min-w-0 flex-1">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-3 flex items-center font-mono text-[12px] text-brand"
        >
          /
        </span>
        <input
          type="search"
          name="q"
          data-global-search
          aria-label="Search npm packages"
          aria-keyshortcuts="/"
          placeholder="search packages…"
          className={`min-h-11 w-full rounded-[var(--radius-sm)] border border-border-subtle bg-surface-code py-2 pr-3 pl-7 text-[13px] text-text-primary placeholder:text-text-secondary focus:border-brand ${
            isHome ? "lg:min-h-12 lg:text-[15px]" : ""
          }`}
        />
      </div>
      <button
        type="submit"
        aria-label="Search packages"
        className={`inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-[var(--radius-sm)] border px-2 text-[12px] font-medium sm:px-3 ${
          isHome ? "lg:min-h-12 lg:min-w-12" : ""
        } ${buttonClass(isHome)}`}
      >
        <Search
          className={`h-4 w-4 ${iconClass(isHome)}`}
          strokeWidth={2}
          aria-hidden="true"
        />
        <span className="hidden sm:inline">search</span>
      </button>
    </form>
  );
}
