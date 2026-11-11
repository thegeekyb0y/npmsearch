export const SEARCH_QUERY_EVENT = "npmsearch:query";

export type SearchQueryDetail = {
  query: string;
};

export function emitSearchQuery(query: string) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent<SearchQueryDetail>(SEARCH_QUERY_EVENT, {
      detail: { query },
    }),
  );
}
