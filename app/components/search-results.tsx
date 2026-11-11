"use client";

import { useWindowVirtualizer } from "@tanstack/react-virtual";
import {
  startTransition,
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { FOCUS_RESULTS_EVENT } from "../lib/keyboard-events";
import { focusGlobalSearch } from "../lib/keyboard";
import {
  MAX_SEARCH_FROM,
  canLoadMore,
  mergePages,
  nextPageFrom,
  reachedSearchCap,
} from "../lib/search-pagination";
import {
  SEARCH_QUERY_EVENT,
  type SearchQueryDetail,
} from "../lib/search-events";
import type { SearchResults } from "../lib/types";
import { SearchRow } from "./search-row";
import { SearchRowSkeleton, SearchSkeleton } from "./skeleton";
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
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState(false);
  const [exhausted, setExhausted] = useState(false);
  const [previousInitialQuery, setPreviousInitialQuery] =
    useState(initialQuery);
  const [listElement, setListElement] = useState<HTMLDivElement | null>(null);

  const loadedQueryRef = useRef(initialQuery);
  const abortRef = useRef<AbortController | null>(null);
  const moreAbortRef = useRef<AbortController | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const rowRefs = useRef(new Map<number, HTMLAnchorElement>());

  if (initialQuery !== previousInitialQuery) {
    setPreviousInitialQuery(initialQuery);
    setQuery(initialQuery);
    setData(initialData);
    setStatus("idle");
    setIsLoadingMore(false);
    setMoreError(false);
    setExhausted(false);
  }

  useEffect(() => {
    loadedQueryRef.current = initialQuery;
    if (initialQuery) {
      writeCache(initialQuery, initialData);
    }
  }, [initialQuery, initialData]);

  const applyData = useCallback(
    (nextQuery: string, nextData: SearchResults) => {
      loadedQueryRef.current = nextQuery;
      moreAbortRef.current?.abort();
      setIsLoadingMore(false);
      setMoreError(false);
      setExhausted(false);
      startTransition(() => {
        setQuery(nextQuery);
        setData(nextData);
        setStatus("idle");
      });
    },
    [],
  );

  const load = useCallback(
    async (rawQuery: string, force = false) => {
      const next = rawQuery.trim();

      if (!next) {
        abortRef.current?.abort();
        moreAbortRef.current?.abort();
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
      moreAbortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      loadedQueryRef.current = next;

      setIsLoadingMore(false);
      setMoreError(false);
      setExhausted(false);
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

  const hasMore =
    status === "idle" &&
    !exhausted &&
    canLoadMore(data) &&
    nextPageFrom(data) < MAX_SEARCH_FROM;

  const loadMore = useCallback(async () => {
    if (status !== "idle" || isLoadingMore || !query || !hasMore) return;

    const pageFrom = nextPageFrom(data);
    const pageSize = data.size || 20;

    moreAbortRef.current?.abort();
    const controller = new AbortController();
    moreAbortRef.current = controller;

    setIsLoadingMore(true);
    setMoreError(false);

    try {
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(query)}&from=${pageFrom}&size=${pageSize}`,
        {
          signal: controller.signal,
          headers: { Accept: "application/json" },
        },
      );

      if (!response.ok) {
        throw new Error(`Search page failed with status ${response.status}`);
      }

      const json: unknown = await response.json();

      if (!isSearchResults(json)) {
        throw new Error("Unexpected search page response");
      }

      if (controller.signal.aborted) return;

      const merged = mergePages(data, json);
      setExhausted(json.results.length < pageSize);

      startTransition(() => {
        setData(merged);
        setIsLoadingMore(false);
      });
    } catch {
      if (controller.signal.aborted) return;
      setIsLoadingMore(false);
      setMoreError(true);
    }
  }, [data, hasMore, isLoadingMore, query, status]);

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
      moreAbortRef.current?.abort();
    };
  }, [load]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "auto" });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [query]);

  useEffect(() => {
    if (!hasMore || isLoadingMore || moreError) return;

    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void loadMore();
        }
      },
      { rootMargin: "600px 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, loadMore, moreError]);

  useEffect(() => {
    const urlQuery =
      new URLSearchParams(window.location.search).get("q")?.trim() ?? "";

    if (urlQuery === initialQuery) return;

    const timer = window.setTimeout(() => {
      void load(urlQuery, true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [initialQuery, load]);

  const rowVirtualizer = useWindowVirtualizer({
    count: data.results.length + (isLoadingMore ? 1 : 0),
    estimateSize: () => 84,
    overscan: 8,
    scrollMargin: listElement?.offsetTop ?? 0,
    getItemKey: (index) =>
      data.results[index]?.name ?? `loading-${index}`,
  });

  const requestFocus = useCallback(
    (index: number) => {
      if (index < 0 || index >= data.results.length) return;

      // Global smooth scrolling would delay virtualization and lose focus
      // before the target row is rendered. Keyboard movement is instant.
      const root = document.documentElement;
      const previousScrollBehavior = root.style.scrollBehavior;
      root.style.scrollBehavior = "auto";

      rowVirtualizer.scrollToIndex(index, { align: "auto" });

      let attempts = 0;
      const focusWhenReady = () => {
        const link = rowRefs.current.get(index);
        if (link) {
          link.focus({ preventScroll: true });
          root.style.scrollBehavior = previousScrollBehavior;
          return;
        }

        if (attempts < 8) {
          attempts += 1;
          window.requestAnimationFrame(focusWhenReady);
        } else {
          root.style.scrollBehavior = previousScrollBehavior;
        }
      };

      window.requestAnimationFrame(focusWhenReady);
    },
    [data.results.length, rowVirtualizer],
  );

  const handleRowKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLAnchorElement>, index: number) => {
      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          requestFocus(index + 1);
          break;
        case "ArrowUp":
          event.preventDefault();
          if (index === 0) {
            focusGlobalSearch();
          } else {
            requestFocus(index - 1);
          }
          break;
        case "Home":
          event.preventDefault();
          requestFocus(0);
          break;
        case "End":
          event.preventDefault();
          requestFocus(data.results.length - 1);
          break;
        case "Escape":
          event.preventDefault();
          focusGlobalSearch();
          break;
      }
    },
    [data.results.length, requestFocus],
  );

  useEffect(() => {
    function handleFocusResults() {
      requestFocus(0);
    }

    window.addEventListener(FOCUS_RESULTS_EVENT, handleFocusResults);
    return () => {
      window.removeEventListener(FOCUS_RESULTS_EVENT, handleFocusResults);
    };
  }, [requestFocus]);

  const isLoading = status === "loading";
  const countLabel = isLoading
    ? "…"
    : status === "error"
      ? "—"
      : data.total.toLocaleString("en-US");
  const atCap = reachedSearchCap(data);

  return (
    <div aria-busy={isLoading || isLoadingMore}>
      <div
        aria-hidden="true"
        className={`h-px w-full ${
          isLoading ? "animate-pulse bg-brand" : "bg-transparent"
        }`}
      />
      <p className="sr-only" role="status" aria-live="polite">
        {isLoading
          ? "Searching"
          : `${data.results.length.toLocaleString("en-US")} of ${data.total.toLocaleString("en-US")} results for ${query || "no query"}${isLoadingMore ? ", loading more" : ""}`}
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
        isLoading ? (
          <SearchSkeleton rows={6} />
        ) : query ? (
          <StatusPanel
            title={status === "error" ? "Search is unavailable" : "No packages found"}
            message={
              status === "error"
                ? "The registry did not respond. Try the same query again in a moment."
                : `No results matched "${query}". Try a broader term or a different package name.`
            }
            error={status === "error"}
          />
        ) : (
          <StatusPanel
            title="Search the npm registry"
            message="Enter a package name, scope, or keyword to explore results."
          />
        )
      ) : (
        <>
          <div
            ref={setListElement}
            role="list"
            aria-label="Search results"
            aria-busy={isLoadingMore}
            className={`relative border-t border-border-subtle ${
              isLoading ? "opacity-60" : "opacity-100"
            }`}
            style={{ height: rowVirtualizer.getTotalSize() }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const item = data.results[virtualRow.index];
              const isSkeleton = !item;

              return (
                <div
                  key={virtualRow.key}
                  ref={rowVirtualizer.measureElement}
                  data-index={virtualRow.index}
                  role={isSkeleton ? undefined : "listitem"}
                  aria-setsize={isSkeleton ? undefined : data.total}
                  aria-posinset={
                    isSkeleton ? undefined : virtualRow.index + 1
                  }
                  className="absolute top-0 left-0 w-full"
                  style={{
                    transform: `translateY(${virtualRow.start - (listElement?.offsetTop ?? 0)}px)`,
                  }}
                >
                  {item ? (
                    <SearchRow
                      item={item}
                      linkRef={(element) => {
                        if (element) {
                          rowRefs.current.set(virtualRow.index, element);
                        } else {
                          rowRefs.current.delete(virtualRow.index);
                        }
                      }}
                      onKeyDown={(event) =>
                        handleRowKeyDown(event, virtualRow.index)
                      }
                    />
                  ) : (
                    <SearchRowSkeleton />
                  )}
                </div>
              );
            })}
          </div>

          {hasMore ? (
            <div
              ref={sentinelRef}
              className="flex flex-col items-center gap-2 border-t border-border-subtle py-4"
            >
              {moreError ? (
                <p role="alert" className="m-0 text-[12px] text-destructive">
                  Couldn&apos;t load more results.
                </p>
              ) : null}
              <button
                type="button"
                onClick={() => void loadMore()}
                disabled={isLoadingMore}
                className="inline-flex min-h-11 items-center rounded-[var(--radius-sm)] border border-border-subtle px-4 font-mono text-[11px] text-text-secondary transition-colors duration-150 ease-out hover:border-border-strong hover:bg-surface-raised hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoadingMore
                  ? "loading…"
                  : moreError
                    ? "retry"
                    : "load more"}
              </button>
              <span className="font-mono text-[10px] text-text-secondary">
                {data.results.length.toLocaleString("en-US")} of{" "}
                {data.total.toLocaleString("en-US")} shown
              </span>
            </div>
          ) : atCap ? (
            <p className="m-0 border-t border-border-subtle py-4 text-center font-mono text-[11px] text-text-secondary">
              Showing the first {MAX_SEARCH_FROM.toLocaleString("en-US")} results.
              Refine your search.
            </p>
          ) : (
            <p className="m-0 border-t border-border-subtle py-4 text-center font-mono text-[11px] text-text-secondary">
              end of results · {data.results.length.toLocaleString("en-US")} shown
            </p>
          )}
        </>
      )}
    </div>
  );
}
