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
  CACHE_FRESH_TTL,
  CACHE_HARD_TTL,
  CACHE_NEGATIVE_TTL,
  cacheGetEntry,
  cacheSet,
} from "../../app/lib/cache";
import {
  RegistryError,
  getPackageOverview,
  getPackageVersionOverview,
  isValidPackageName,
  isValidVersion,
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

  it("returns null for a missing package and caches a short negative entry", async () => {
    mockRegistry(null);

    await expect(getPackageOverview("missing-package")).resolves.toBeNull();
    expect(cacheSet).toHaveBeenCalledWith(
      "v1:overview:missing-package",
      null,
      CACHE_NEGATIVE_TTL,
    );
    expect(cacheSet).toHaveBeenCalledTimes(1);
  });

  it("serves a cached negative entry without calling the registry", async () => {
    vi.mocked(cacheGetEntry).mockResolvedValue({
      data: null,
      cachedAt: Date.now(),
    });

    await expect(getPackageOverview("missing-package")).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(backgroundTasks).toHaveLength(0);
  });

  it("returns null for an invalid name without fetching", async () => {
    await expect(getPackageOverview("not a valid name!")).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects names longer than 214 characters", () => {
    expect(isValidPackageName("a".repeat(214))).toBe(true);
    expect(isValidPackageName("a".repeat(215))).toBe(false);
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

  it("refreshes a soft-stale overview before rendering when fresh is requested", async () => {
    const cached: PackageOverview = {
      name: "react",
      keywords: [],
      maintainers: [],
      latestVersion: "18.0.0",
      downloadTrend: [],
    };
    vi.mocked(cacheGetEntry).mockResolvedValue({
      data: cached,
      cachedAt: Date.now() - (CACHE_FRESH_TTL.overview + 1) * 1_000,
    });
    mockRegistry();

    const data = await getPackageOverview("react", { fresh: true });

    expect(data?.latestVersion).toBe("19.3.1");
    expect(backgroundTasks).toHaveLength(0);
    expect(fetchMock).toHaveBeenCalled();
  });

  it("falls back to the cached overview when the fresh refresh fails", async () => {
    const cached: PackageOverview = {
      name: "react",
      keywords: [],
      maintainers: [],
      latestVersion: "19.3.1",
      downloadTrend: [],
    };
    vi.mocked(cacheGetEntry).mockResolvedValue({
      data: cached,
      cachedAt: Date.now() - (CACHE_FRESH_TTL.overview + 1) * 1_000,
    });
    fetchMock.mockResolvedValue(new Response("boom", { status: 502 }));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    await expect(
      getPackageOverview("react", { fresh: true }),
    ).resolves.toEqual(cached);
    expect(backgroundTasks).toHaveLength(0);

    warn.mockRestore();
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

  it("coalesces concurrent misses into one fetch", async () => {
    mockRegistry();

    const results = await Promise.all([
      getPackageOverview("react"),
      getPackageOverview("react"),
      getPackageOverview("react"),
      getPackageOverview("react"),
      getPackageOverview("react"),
    ]);

    expect(results.every((entry) => entry?.name === "react")).toBe(true);

    const urls = fetchMock.mock.calls.map(([input]) => String(input));
    expect(urls.filter((url) => url.endsWith("/latest"))).toHaveLength(1);
    expect(
      urls.filter((url) => url.includes("/downloads/range/")),
    ).toHaveLength(1);
  });
});

describe("registry request hygiene", () => {
  it("sends a descriptive User-Agent", async () => {
    mockRegistry();

    await getPackageOverview("react");

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers["User-Agent"]).toContain("npmsearch");
  });

  it("reports status, content-type, retry-after and package name on 429", async () => {
    fetchMock.mockResolvedValue(
      new Response("slow down", {
        status: 429,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Retry-After": "900",
        },
      }),
    );

    const error = await getPackageOverview("react").catch(
      (thrown: unknown) => thrown,
    );

    expect(error).toBeInstanceOf(RegistryError);
    expect(error).toMatchObject({
      packageName: "react",
      status: 429,
      contentType: "text/plain; charset=utf-8",
      retryAfterSeconds: 900,
    });
  });

  it("rejects a non-JSON 200 before parsing", async () => {
    fetchMock.mockResolvedValue(
      new Response("<html>maintenance</html>", {
        status: 200,
        headers: { "Content-Type": "text/html" },
      }),
    );

    const error = await getPackageOverview("react").catch(
      (thrown: unknown) => thrown,
    );

    expect(error).toBeInstanceOf(RegistryError);
    expect((error as RegistryError).contentType).toBe("text/html");
  });
});

describe("isValidVersion", () => {
  it("accepts releases, prereleases and dist-tags", () => {
    expect(isValidVersion("1.2.3")).toBe(true);
    expect(isValidVersion("1.0.0-beta.1")).toBe(true);
    expect(isValidVersion("latest")).toBe(true);
  });

  it("rejects paths and empty values", () => {
    expect(isValidVersion("")).toBe(false);
    expect(isValidVersion("1.0.0/extra")).toBe(false);
    expect(isValidVersion("1.0.0 beta")).toBe(false);
  });
});

describe("getPackageVersionOverview", () => {
  it("builds the shell from the requested version manifest", async () => {
    mockRegistry({ ...latestManifest, version: "19.3.0" });

    const data = await getPackageVersionOverview("react", "19.3.0");

    expect(data).toMatchObject({
      name: "react",
      latestVersion: "19.3.0",
      weeklyDownloads: 2800,
    });

    const urls = fetchMock.mock.calls.map(([input]) => String(input));
    expect(urls).toContain("https://registry.npmjs.org/react/19.3.0");
    expect(cacheSet).toHaveBeenCalledWith(
      "v1:overview:react@19.3.0",
      data,
      CACHE_HARD_TTL.overview,
    );
  });

  it("returns null for a missing version and caches a negative entry", async () => {
    mockRegistry(null);

    await expect(
      getPackageVersionOverview("react", "99.0.0"),
    ).resolves.toBeNull();
    expect(cacheSet).toHaveBeenCalledWith(
      "v1:overview:react@99.0.0",
      null,
      CACHE_NEGATIVE_TTL,
    );
  });

  it("rejects an invalid version without fetching", async () => {
    await expect(
      getPackageVersionOverview("react", "1.0.0/extra"),
    ).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
