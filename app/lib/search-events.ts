export const SEARCH_QUERY_EVENT = "npmsearch:query";

export type SearchQueryDetail = {
  query: string;
  force?: boolean;
};

export function emitSearchQuery(
  query: string,
  options: { force?: boolean } = {},
) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent<SearchQueryDetail>(SEARCH_QUERY_EVENT, {
      detail: { query, force: options.force },
    }),
  );
}
