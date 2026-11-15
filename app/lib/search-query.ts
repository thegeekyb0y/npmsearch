export const MIN_QUERY_LENGTH = 2;
export const MAX_QUERY_LENGTH = 64;

export type QueryIssue =
  | { kind: "short"; minimum: number; remaining: number }
  | { kind: "long"; maximum: number };

/**
 * The registry rejects searches outside 2–64 characters with a 400, so the UI
 * has to recognise those queries before spending a request on them.
 */
export function getQueryIssue(rawQuery: string): QueryIssue | null {
  const query = rawQuery.trim();

  if (!query) return null;

  if (query.length < MIN_QUERY_LENGTH) {
    return {
      kind: "short",
      minimum: MIN_QUERY_LENGTH,
      remaining: MIN_QUERY_LENGTH - query.length,
    };
  }

  if (query.length > MAX_QUERY_LENGTH) {
    return { kind: "long", maximum: MAX_QUERY_LENGTH };
  }

  return null;
}

export function isSearchableQuery(rawQuery: string): boolean {
  const query = rawQuery.trim();

  return query.length > 0 && getQueryIssue(query) === null;
}
