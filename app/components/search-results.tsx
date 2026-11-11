"use client";

import {
  startTransition,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  SEARCH_QUERY_EVENT,
  type SearchQueryDetail,
} from "../lib/search-events";
import type { SearchResults } from "../lib/types";
import { SearchRow } from "./search-row";
import { StatusPanel } from "./ui";

const CLIENT_CACHE_TTL_MS = 60_000;
const CLIENT_CACHE_MAX_ENTRIES = 20;

type ClientCacheEntry = {
  data: SearchResults;
  cachedAt: number;
};

const clientCache = new Map<string, ClientCacheEntry>();

function normalizeQuery(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function readCache(query: string): SearchResults | null {
  const key = normalizeQuery(query);
  const entry = clientCache.get(key);

  if (!entry) return null;

  if (Date.now() - entry.cachedAt > CLIENT_CACHE_TTL_MS) {
    clientCache.delete(key);
    return null;
  }

  return entry.data;
}

function writeCache(query: string, data: SearchResults): void {
  const key = normalizeQuery(query);
  clientCache.delete(key);
  clientCache.set(key, { data, cachedAt: Date.now() });

  while (clientCache.size > CLIENT_CACHE_MAX_ENTRIES) {
    const oldest = clientCache.keys().next().value;
    if (!oldest) break;
    clientCache.delete(oldest);
  }
}

function isSearchResults(value: unknown): value is SearchResults {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<SearchResults>;
  return (
    typeof candidate.total === "number" && Array.isArray(candidate.results)
  );
}

function emptyResults(size = 20): SearchResults {
  return { total: 0, results: [], from: 0, size };
}

export function SearchResultsView({
  initialQuery,
  initialData,
}: {
  initialQuery: string;
  initialData: SearchResults;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [data, setData] = useState(initialData);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [previousInitialQuery, setPreviousInitialQuery] =
    useState(initialQuery);

  const loadedQueryRef = useRef(initialQuery);
  const abortRef = useRef<AbortController | null>(null);

  if (initialQuery !== previousInitialQuery) {
    setPreviousInitialQuery(initialQuery);
    setQuery(initialQuery);
    setData(initialData);
    setStatus("idle");
  }

  useEffect(() => {
    loadedQueryRef.current = initialQuery;
    if (initialQuery) {
      writeCache(initialQuery, initialData);
    }
  }, [initialQuery, initialData]);

  const applyData = useCallback((nextQuery: string, nextData: SearchResults) => {
    loadedQueryRef.current = nextQuery;
    startTransition(() => {
      setQuery(nextQuery);
      setData(nextData);
      setStatus("idle");
    });
  }, []);

  const load = useCallback(
    async (rawQuery: string, force = false) => {
      const next = rawQuery.trim();

      if (!next) {
        abortRef.current?.abort();
        applyData("", emptyResults());
        return;
      }

      if (!force && next === loadedQueryRef.current) {
        return;
      }

      if (!force) {
        const cached = readCache(next);
        if (cached) {
          applyData(next, cached);
          return;
        }
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      loadedQueryRef.current = next;

      setQuery(next);
      setStatus("loading");

      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(next)}`,
          {
            signal: controller.signal,
            headers: { Accept: "application/json" },
          },
        );

        if (!response.ok) {
          throw new Error(`Search failed with status ${response.status}`);
        }

        const json: unknown = await response.json();

        if (!isSearchResults(json)) {
          throw new Error("Unexpected search response");
        }

        if (controller.signal.aborted) return;

        writeCache(next, json);
        applyData(next, json);
      } catch {
        if (controller.signal.aborted) return;
        setStatus("error");
      }
    },
    [applyData],
  );

  useEffect(() => {
    function handleQuery(event: Event) {
      const detail = (event as CustomEvent<SearchQueryDetail>).detail;
      if (!detail || typeof detail.query !== "string") return;
      void load(detail.query);
    }

    function handlePopState() {
      const next =
        new URLSearchParams(window.location.search).get("q")?.trim() ?? "";
      void load(next, true);
    }

    window.addEventListener(SEARCH_QUERY_EVENT, handleQuery);
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener(SEARCH_QUERY_EVENT, handleQuery);
      window.removeEventListener("popstate", handlePopState);
      abortRef.current?.abort();
    };
  }, [load]);

  useEffect(() => {
    const urlQuery =
      new URLSearchParams(window.location.search).get("q")?.trim() ?? "";

    if (urlQuery === initialQuery) return;

    const timer = window.setTimeout(() => {
      void load(urlQuery, true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [initialQuery, load]);

  const isLoading = status === "loading";
  const countLabel = isLoading
    ? "…"
    : status === "error"
      ? "—"
      : data.total.toLocaleString("en-US");

  return (
    <div aria-busy={isLoading}>
      <div
        aria-hidden="true"
        className={`h-px w-full ${
          isLoading ? "animate-pulse bg-brand" : "bg-transparent"
        }`}
      />
      <p className="sr-only" role="status" aria-live="polite">
        {isLoading
          ? "Searching"
          : `${data.total.toLocaleString("en-US")} results for ${query || "no query"}`}
      </p>

      {query ? (
        <header className="flex flex-col gap-2 pt-4 pb-5">
          <p className="m-0 font-mono text-[11px] uppercase tracking-[0.08em] text-text-label">
            search
          </p>
          <h1 className="m-0 font-mono text-[clamp(20px,4vw,28px)] leading-[1.2] font-semibold tracking-[-0.02em] text-text-primary">
            <span className="text-brand">{countLabel}</span> packages for &quot;
            {query}&quot;
          </h1>
          <p className="m-0 text-[12px] leading-5 text-text-secondary">
            Ranked by registry relevance · weekly downloads from npm
          </p>
        </header>
      ) : null}

      {status === "error" ? (
        <div
          role="alert"
          className="mb-4 flex flex-wrap items-center gap-3 border-y border-border-subtle py-3 text-[12px] text-text-secondary"
        >
          <span>Couldn&apos;t update results.</span>
          <button
            type="button"
            onClick={() => void load(query, true)}
            className="inline-flex min-h-11 items-center rounded-[var(--radius-sm)] border border-border-subtle px-3 font-mono text-[11px] text-text-secondary transition-colors duration-150 ease-out hover:border-border-strong hover:bg-surface-raised hover:text-text-primary"
          >
            retry
          </button>
        </div>
      ) : null}

      {data.results.length === 0 ? (
        query ? (
          <StatusPanel
            title="No packages found"
            message={`No results matched "${query}". Try a broader term or a different package name.`}
          />
        ) : (
          <StatusPanel
            title="Search the npm registry"
            message="Enter a package name, scope, or keyword to explore results."
          />
        )
      ) : (
        <div
          className={`border-t border-border-subtle ${
            isLoading ? "opacity-60" : "opacity-100"
          }`}
        >
          {data.results.map((item) => (
            <SearchRow key={item.name} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
