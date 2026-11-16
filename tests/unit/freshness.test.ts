import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  PAGE_REVALIDATE_SECONDS,
  revalidationSafeWindow,
} from "../../app/lib/freshness";

const ROUTE_FILES = [
  "../../app/package/[name]/page.tsx",
  "../../app/[...pkg]/page.tsx",
];

function readRoute(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

describe("revalidation window", () => {
  it("is one minute", () => {
    expect(PAGE_REVALIDATE_SECONDS).toBe(60);
  });

  it("stays in sync with the route segment config", () => {
    // Next requires `revalidate` to be a literal, so the shared constant cannot
    // be imported by the route files. This test is the drift guard.
    for (const file of ROUTE_FILES) {
      expect(readRoute(file)).toContain(
        `export const revalidate = ${PAGE_REVALIDATE_SECONDS};`,
      );
    }
  });

  it("refreshes one page window early so ISR cannot add staleness", () => {
    // Data entering a page at `soft - window` leaves it at `soft`.
    expect(revalidationSafeWindow(300)).toBe(240);
    expect(revalidationSafeWindow(3_600)).toBe(3_540);
    expect(revalidationSafeWindow(60)).toBe(0);
    expect(revalidationSafeWindow(30)).toBe(0);
  });
});
