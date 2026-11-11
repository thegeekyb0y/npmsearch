import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("../../app/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(),
}));

vi.mock("../../app/lib/registry", () => ({
  searchPackages: vi.fn(),
}));

import { GET } from "../../app/api/search/route";
import { checkRateLimit } from "../../app/lib/rate-limit";
import { searchPackages } from "../../app/lib/registry";
import type { SearchResults } from "../../app/lib/types";

const results: SearchResults = {
  total: 1,
  results: [
    {
      name: "react",
      version: "19.3.1",
      links: { npm: "https://www.npmjs.com/package/react" },
      weeklyDownloads: 100,
      exact: true,
    },
  ],
  from: 0,
  size: 20,
};

beforeEach(() => {
  vi.mocked(checkRateLimit).mockResolvedValue({ allowed: true });
  vi.mocked(searchPackages).mockResolvedValue(results);
});

describe("GET /api/search", () => {
  it("returns registry results with cache headers", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/search?q=react"),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(results);
    expect(response.headers.get("cache-control")).toContain("s-maxage=60");
  });

  it("passes pagination through", async () => {
    await GET(
      new NextRequest("http://localhost/api/search?q=react&from=40&size=50"),
    );

    expect(searchPackages).toHaveBeenCalledWith("react", {
      from: 40,
      size: 50,
    });
  });

  it("rejects a missing query", async () => {
    const response = await GET(new NextRequest("http://localhost/api/search"));

    expect(response.status).toBe(400);
    expect(searchPackages).not.toHaveBeenCalled();
  });

  it("rejects invalid pagination", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/search?q=react&from=-1"),
    );

    expect(response.status).toBe(400);
  });

  it("returns 429 with a retry window", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: false,
      retryAfterSeconds: 7,
    });

    const response = await GET(
      new NextRequest("http://localhost/api/search?q=react"),
    );

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("7");
  });

  it("returns 502 when the registry fails", async () => {
    vi.mocked(searchPackages).mockRejectedValue(new Error("registry down"));

    const response = await GET(
      new NextRequest("http://localhost/api/search?q=react"),
    );

    expect(response.status).toBe(502);
  });
});
