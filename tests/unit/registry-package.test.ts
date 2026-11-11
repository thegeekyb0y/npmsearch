import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import downloadsFixture from "../fixtures/registry/downloads.json";
import packageFixture from "../fixtures/registry/package.json";

vi.mock("../../app/lib/cache", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../app/lib/cache")>();
  return {
    ...actual,
    cacheGet: vi.fn(),
    cacheSet: vi.fn(),
  };
});

vi.mock("../../app/lib/github", () => ({
  getGithubStats: vi.fn(async () => null),
}));

import { cacheGet, cacheSet } from "../../app/lib/cache";
import { getGithubStats } from "../../app/lib/github";
import {
  README_LIMIT,
  RegistryError,
  getPackage,
} from "../../app/lib/registry";
import type { PackageDetail } from "../../app/lib/types";

const fetchMock = vi.fn();

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function mockRegistry(
  packument: unknown = packageFixture,
  downloads: unknown | null = downloadsFixture,
) {
  fetchMock.mockImplementation((input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("/downloads/range/")) {
      return Promise.resolve(
        downloads === null ? new Response("down", { status: 500 }) : jsonResponse(downloads),
      );
    }
    if (packument && typeof packument === "object" && "status" in packument) {
      return Promise.resolve(
        jsonResponse({ error: "not found" }, (packument as { status: number }).status),
      );
    }
    return Promise.resolve(jsonResponse(packument));
  });
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.mocked(cacheGet).mockResolvedValue(null);
  vi.mocked(cacheSet).mockResolvedValue(undefined);
  vi.mocked(cacheSet).mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getPackage", () => {
  it("maps a packument and weekly downloads", async () => {
    mockRegistry();

    const data = await getPackage("React");

    expect(data).toMatchObject({
      name: "react",
      description: "React is a JavaScript library for building user interfaces.",
      latestVersion: "19.3.1",
      license: "MIT",
      weeklyDownloads: 2800,
      publishedAt: "2026-10-14T12:00:00.000Z",
      readmeTruncated: false,
    });
    expect(data?.repository?.url).toBe("https://github.com/facebook/react");
    expect(data?.latestVersionInfo?.dependencies).toEqual({
      scheduler: "^0.27.0",
    });
    expect(data?.latestVersionInfo?.dist?.unpackedSize).toBe(178700);
    expect(data?.latestVersionInfo?.engines?.node).toBe(">=0.10.0");
    expect(data?.latestVersionInfo?.types).toBe("index.d.ts");
    expect(data?.recentVersions.map((entry) => entry.version)).toEqual([
      "19.3.1",
      "19.3.0",
    ]);
    expect(data?.recentVersions[0].tag).toBe("latest");
    expect(data?.downloadTrend).toHaveLength(7);
    expect(data?.downloadRange).toEqual({
      start: "2026-11-03",
      end: "2026-11-09",
    });
    expect(data?.maintainers[1].email).toBeUndefined();

    expect(cacheSet).toHaveBeenCalledWith(
      "v1:package:react",
      data,
      300,
    );
  });

  it("encodes scoped package names in upstream URLs", async () => {
    mockRegistry();

    await getPackage("@scope/name");

    const urls = fetchMock.mock.calls.map(([input]) => String(input));
    expect(urls.some((url) => url.includes("%40scope%2Fname"))).toBe(true);
  });

  it("returns null for a missing package and does not cache it", async () => {
    mockRegistry({ status: 404 });

    await expect(getPackage("missing-package")).resolves.toBeNull();
    expect(cacheSet).not.toHaveBeenCalled();
  });

  it("returns null for an invalid package name without fetching", async () => {
    await expect(getPackage("not a valid name!")).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns a cached package without fetching", async () => {
    const cached: PackageDetail = {
      name: "react",
      readmeTruncated: false,
      keywords: [],
      maintainers: [],
      latestVersion: "19.3.1",
      recentVersions: [],
      downloadTrend: [],
    };
    vi.mocked(cacheGet).mockResolvedValue(cached);

    await expect(getPackage("react")).resolves.toEqual(cached);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("includes GitHub stats when they are available", async () => {
    vi.mocked(getGithubStats).mockResolvedValueOnce({
      stars: 200_000,
      forks: 42_000,
      issues: 1_100,
      url: "https://github.com/facebook/react",
    });
    mockRegistry();

    const data = await getPackage("react");

    expect(data?.github).toEqual({
      stars: 200_000,
      forks: 42_000,
      issues: 1_100,
      url: "https://github.com/facebook/react",
    });
  });

  it("keeps the package when downloads fail", async () => {
    mockRegistry(packageFixture, null);

    const data = await getPackage("react");

    expect(data?.weeklyDownloads).toBeUndefined();
    expect(data?.downloadTrend).toEqual([]);
  });

  it("truncates a large README", async () => {
    mockRegistry({
      ...packageFixture,
      readme: "x".repeat(README_LIMIT + 10),
    });

    const data = await getPackage("react");

    expect(data?.readmeTruncated).toBe(true);
    expect(data?.readme).toHaveLength(README_LIMIT);
  });

  it("falls back when dist-tags are missing", async () => {
    mockRegistry({ ...packageFixture, "dist-tags": {} });

    const data = await getPackage("react");
    expect(data?.latestVersion).toBe("Unknown");
    expect(data?.latestVersionInfo).toBeUndefined();
  });

  it("throws on a malformed packument", async () => {
    mockRegistry({ name: 123 });

    await expect(getPackage("react")).rejects.toBeInstanceOf(RegistryError);
  });
});
