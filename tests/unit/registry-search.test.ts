import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fixture from "../fixtures/registry/search.json";

vi.mock("../../app/lib/cache", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../app/lib/cache")>();
  return {
    ...actual,
    cacheGet: vi.fn(),
    cacheSet: vi.fn(),
  };
});

import { cacheGet, cacheSet } from "../../app/lib/cache";
import {
  RegistryError,
  buildSearchUrl,
  clampSearchParams,
  normalizePackageName,
  normalizeQuery,
  searchPackages,
} from "../../app/lib/registry";

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.mocked(cacheGet).mockResolvedValue(null);
  vi.mocked(cacheSet).mockResolvedValue(undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("registry search helpers", () => {
  it("normalizes a query", () => {
    expect(normalizeQuery("  React   Hooks ")).toBe("react hooks");
  });

  it("builds an encoded registry URL", () => {
    expect(buildSearchUrl("react hooks", 0, 20)).toBe(
      "https://registry.npmjs.org/-/v1/search?text=react%20hooks&size=20&from=0",
    );
  });

  it("clamps pagination", () => {
    expect(clampSearchParams({ from: -10, size: 500 })).toEqual({
      from: 0,
      size: 50,
    });
  });

  it("normalizes package names with scopes", () => {
    expect(normalizePackageName("%40scope%2Fname")).toBe("@scope/name");
  });
});

describe("searchPackages", () => {
  it("maps registry results and uses weekly downloads", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(fixture), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const data = await searchPackages("React");

    expect(data.total).toBe(207550);
    expect(data.results).toHaveLength(3);
    expect(data.results[0]).toMatchObject({
      name: "react",
      version: "19.3.1",
      weeklyDownloads: 252000000,
      publishedAt: "2026-10-14T12:00:00.000Z",
      exact: true,
    });
    expect(data.results[1].weeklyDownloads).toBeUndefined();
    expect(data.results[1].links.npm).toBe(
      "https://www.npmjs.com/package/%40types%2Freact",
    );
    expect(data.results[2].description).toBeUndefined();
    expect(cacheSet).toHaveBeenCalledWith(
      expect.stringContaining("v1:search:react"),
      data,
      60,
    );
  });

  it("returns a cached page without calling the registry", async () => {
    const cached = {
      total: 1,
      results: [],
      from: 0,
      size: 20,
    };
    vi.mocked(cacheGet).mockResolvedValue(cached);

    await expect(searchPackages("react")).resolves.toEqual(cached);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("throws a RegistryError for a non-OK response", async () => {
    fetchMock.mockResolvedValue(new Response("nope", { status: 502 }));

    await expect(searchPackages("react")).rejects.toBeInstanceOf(RegistryError);
  });

  it("throws a RegistryError for an unexpected payload", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ objects: "not-an-array" }), { status: 200 }),
    );

    await expect(searchPackages("react")).rejects.toBeInstanceOf(RegistryError);
  });

  it("ignores one malformed object instead of failing the page", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ ...fixture, objects: [...fixture.objects, { package: {} }] }),
        { status: 200 },
      ),
    );

    const data = await searchPackages("react");
    expect(data.results).toHaveLength(3);
  });

  it("does not fetch for an empty query", async () => {
    const data = await searchPackages("   ");
    expect(data.results).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
