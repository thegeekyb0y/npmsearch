import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import downloadsFixture from "../fixtures/registry/downloads.json";

const { backgroundTasks } = vi.hoisted(() => ({
  backgroundTasks: [] as Array<() => Promise<void>>,
}));

vi.mock("../../app/lib/background", () => ({
  runInBackground: (_key: string, task: () => Promise<void>) => {
    backgroundTasks.push(task);
  },
}));

vi.mock("../../app/lib/cache", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../app/lib/cache")>();
  return {
    ...actual,
    cacheGetEntry: vi.fn(),
    cacheSet: vi.fn(),
    cacheDelete: vi.fn(),
  };
});

vi.mock("../../app/lib/github", () => ({
  getGithubStats: vi.fn(async () => null),
}));

import {
  CACHE_HARD_TTL,
  cacheDelete,
  cacheGetEntry,
  cacheSet,
} from "../../app/lib/cache";
import {
  RegistryError,
  getPackageOverview,
} from "../../app/lib/registry";
import type { PackageOverview } from "../../app/lib/types";

const latestManifest = {
  name: "react",
  version: "19.3.1",
  description: "React is a JavaScript library for building user interfaces.",
  license: "MIT",
  homepage: "https://react.dev",
  keywords: ["react", "ui"],
  maintainers: [
    { name: "fb", email: "opensource+npm@fb.com" },
    { name: "react-bot" },
  ],
  repository: { type: "git", url: "git+https://github.com/facebook/react.git" },
  dependencies: { scheduler: "^0.27.0" },
  dist: { unpackedSize: 178700, fileCount: 24 },
  engines: { node: ">=0.10.0" },
  type: "module",
  main: "index.js",
  types: "index.d.ts",
};

const fetchMock = vi.fn();

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function mockRegistry(
  manifest: unknown | null = latestManifest,
  downloads: unknown | null = downloadsFixture,
) {
  fetchMock.mockImplementation((input: RequestInfo | URL) => {
    const url = String(input);

    if (url.includes("/downloads/range/")) {
      return Promise.resolve(
        downloads === null
          ? new Response("down", { status: 500 })
          : jsonResponse(downloads),
      );
    }

    if (manifest === null) {
      return Promise.resolve(new Response("missing", { status: 404 }));
    }

    return Promise.resolve(jsonResponse(manifest));
  });
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  backgroundTasks.length = 0;
  vi.mocked(cacheGetEntry).mockResolvedValue(null);
  vi.mocked(cacheSet).mockResolvedValue(undefined);
  vi.mocked(cacheSet).mockClear();
  vi.mocked(cacheDelete).mockResolvedValue(undefined);
  vi.mocked(cacheDelete).mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getPackageOverview", () => {
  it("builds the shell from the latest manifest and downloads", async () => {
    mockRegistry();

    const data = await getPackageOverview("React");

    expect(data).toMatchObject({
      name: "react",
      description: "React is a JavaScript library for building user interfaces.",
      latestVersion: "19.3.1",
      license: "MIT",
      homepage: "https://react.dev",
      weeklyDownloads: 2800,
      monthlyDownloads: 3950,
    });
    expect(data?.repository?.url).toBe("https://github.com/facebook/react");
    expect(data?.latestVersionInfo?.dependencies).toEqual({
      scheduler: "^0.27.0",
    });
    expect(data?.latestVersionInfo?.dist).toEqual({
      unpackedSize: 178700,
      files: 24,
    });
    expect(data?.maintainers).toEqual([
      { name: "fb", email: "opensource+npm@fb.com" },
      { name: "react-bot", email: undefined },
    ]);
    expect(data?.downloadTrend).toHaveLength(30);
    expect(data?.downloadRange).toEqual({
      start: "2026-10-11",
      end: "2026-11-09",
    });

    expect(cacheSet).toHaveBeenCalledWith(
      "v1:overview:react",
      data,
      CACHE_HARD_TTL.overview,
    );
  });

  it("requests the lightweight latest manifest instead of the packument", async () => {
    mockRegistry();

    await getPackageOverview("react");

    const urls = fetchMock.mock.calls.map(([input]) => String(input));
    expect(urls).toContain("https://registry.npmjs.org/react/latest");
    expect(urls.some((url) => /^https:\/\/registry\.npmjs\.org\/[^/]+$/.test(url))).toBe(
      false,
    );
  });

  it("encodes scoped package names", async () => {
    mockRegistry();

    await getPackageOverview("@scope/name");

    const urls = fetchMock.mock.calls.map(([input]) => String(input));
    expect(urls.some((url) => url.includes("%40scope%2Fname/latest"))).toBe(true);
  });

  it("returns null for a missing package and clears stale data", async () => {
    mockRegistry(null);

    await expect(getPackageOverview("missing-package")).resolves.toBeNull();
    expect(cacheSet).not.toHaveBeenCalled();
    expect(cacheDelete).toHaveBeenCalledWith("v1:overview:missing-package");
  });

  it("returns null for an invalid name without fetching", async () => {
    await expect(getPackageOverview("not a valid name!")).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("serves a fresh cached overview without fetching", async () => {
    const cached: PackageOverview = {
      name: "react",
      keywords: [],
      maintainers: [],
      latestVersion: "19.3.1",
      downloadTrend: [],
    };
    vi.mocked(cacheGetEntry).mockResolvedValue({
      data: cached,
      cachedAt: Date.now(),
    });

    await expect(getPackageOverview("react")).resolves.toEqual(cached);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(backgroundTasks).toHaveLength(0);
  });

  it("serves a stale overview and refreshes it in the background", async () => {
    const cached: PackageOverview = {
      name: "react",
      keywords: [],
      maintainers: [],
      latestVersion: "19.3.1",
      downloadTrend: [],
    };
    vi.mocked(cacheGetEntry).mockResolvedValue({
      data: cached,
      cachedAt: Date.now() - (CACHE_HARD_TTL.overview - 60) * 1_000,
    });
    mockRegistry();

    await expect(getPackageOverview("react")).resolves.toEqual(cached);
    expect(backgroundTasks).toHaveLength(1);

    await backgroundTasks[0]();

    expect(cacheSet).toHaveBeenCalledWith(
      "v1:overview:react",
      expect.objectContaining({ name: "react" }),
      CACHE_HARD_TTL.overview,
    );
  });

  it("keeps the overview when downloads fail", async () => {
    mockRegistry(latestManifest, null);

    const data = await getPackageOverview("react");

    expect(data?.weeklyDownloads).toBeUndefined();
    expect(data?.monthlyDownloads).toBeUndefined();
    expect(data?.downloadTrend).toEqual([]);
  });

  it("throws on a malformed latest manifest", async () => {
    mockRegistry({ name: 123 });

    await expect(getPackageOverview("react")).rejects.toBeInstanceOf(
      RegistryError,
    );
  });
});
