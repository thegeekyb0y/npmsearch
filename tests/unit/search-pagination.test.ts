import { describe, expect, it } from "vitest";
import {
  MAX_SEARCH_FROM,
  canLoadMore,
  mergePages,
  nextPageFrom,
  reachedSearchCap,
} from "../../app/lib/search-pagination";
import type { PackageSummary, SearchResults } from "../../app/lib/types";

function result(name: string): PackageSummary {
  return {
    name,
    version: "1.0.0",
    links: { npm: `https://www.npmjs.com/package/${name}` },
  };
}

function page(
  names: string[],
  from: number,
  total: number,
  size = 20,
): SearchResults {
  return {
    total,
    results: names.map(result),
    from,
    size,
  };
}

describe("search pagination", () => {
  it("computes the next offset", () => {
    expect(nextPageFrom(page(["a", "b"], 0, 100))).toBe(20);
    expect(nextPageFrom(page(["a", "b"], 20, 100))).toBe(40);
  });

  it("knows when more results exist", () => {
    expect(canLoadMore(page(["a"], 0, 40))).toBe(true);
    expect(canLoadMore(page(["a"], 20, 21))).toBe(true);
    expect(
      canLoadMore(
        page(
          Array.from({ length: 20 }, (_, index) => `pkg-${index}`),
          20,
          20,
        ),
      ),
    ).toBe(false);
    expect(canLoadMore(page([], 0, 40))).toBe(false);
  });

  it("stops at the registry cap", () => {
    const atCap = page(["a"], MAX_SEARCH_FROM - 20, 10_000);
    expect(canLoadMore(atCap)).toBe(false);
    expect(reachedSearchCap(atCap)).toBe(true);
  });

  it("merges pages and deduplicates package names", () => {
    const current = page(["react", "react-dom"], 0, 4);
    const next = page(["react-dom", "react-is", "react-router"], 20, 4);

    expect(mergePages(current, next)).toEqual({
      total: 4,
      results: [
        result("react"),
        result("react-dom"),
        result("react-is"),
        result("react-router"),
      ],
      from: 20,
      size: 20,
    });
  });
});
