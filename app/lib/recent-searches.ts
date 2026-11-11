const STORAGE_KEY = "npmsearch:recent";
const MAX_RECENT = 8;

export function readRecentSearches(): string[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((value): value is string => typeof value === "string")
      .slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

export function rememberSearch(query: string): void {
  if (typeof window === "undefined") return;

  const trimmed = query.trim();
  if (!trimmed) return;

  try {
    const next = [
      trimmed,
      ...readRecentSearches().filter(
        (value) => value.toLowerCase() !== trimmed.toLowerCase(),
      ),
    ].slice(0, MAX_RECENT);

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage can be unavailable in private mode; recent searches are optional.
  }
}
