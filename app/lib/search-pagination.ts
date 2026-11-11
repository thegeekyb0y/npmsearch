import type { SearchResults } from "./types";

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_SEARCH_FROM = 1_000;

export function nextPageFrom(data: SearchResults): number {
  return data.from + data.size;
}

export function canLoadMore(data: SearchResults): boolean {
  const next = nextPageFrom(data);
  return (
    data.results.length > 0 &&
    data.results.length < data.total &&
    next < MAX_SEARCH_FROM
  );
}

export function mergePages(
  current: SearchResults,
  next: SearchResults,
): SearchResults {
  const seen = new Set(current.results.map((item) => item.name));
  const appended = next.results.filter((item) => !seen.has(item.name));

  return {
    total: next.total || current.total,
    results: [...current.results, ...appended],
    from: next.from,
    size: next.size,
  };
}

export function reachedSearchCap(data: SearchResults): boolean {
  return data.results.length < data.total && nextPageFrom(data) >= MAX_SEARCH_FROM;
}
