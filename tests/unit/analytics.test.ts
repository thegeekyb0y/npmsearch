import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
  };
});

import {
  CACHE_HARD_TTL,
  cacheGetEntry,
  cacheSet,
} from "../../app/lib/cache";
import {
  detectModuleFormats,
  getPackageAnalytics,
} from "../../app/lib/analytics";
import type { LatestVersionInfo, PackageAnalytics } from "../../app/lib/types";

const fetchMock = vi.fn();

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const manifests: Record<string, unknown> = {
  "dep-a": {
    name: "dep-a",
    version: "1.5.0",
    dependencies: { "dep-c": "^3.0.0" },
    dist: { unpackedSize: 500 },
  },
  "dep-b": {
    name: "dep-b",
    version: "2.1.0",
    dependencies: {},
    dist: { unpackedSize: 300 },
  },
  "dep-c": {
    name: "dep-c",
    version: "3.1.0",
    dependencies: {},
    dist: { unpackedSize: 200 },
  },
};

function mockManifests(overrides: Record<string, unknown> = {}) {
  const registry = { ...manifests, ...overrides };

  fetchMock.mockImplementation((input: RequestInfo | URL) => {
    const match = /registry\.npmjs\.org\/(.+)\/latest$/.exec(String(input));
    const name = match ? decodeURIComponent(match[1]) : "";
    const manifest = registry[name];

    return Promise.resolve(
      manifest ? jsonResponse(manifest) : new Response("missing", { status: 404 }),
    );
  });
}

const latest: LatestVersionInfo = {
  dependencies: { "dep-a": "^1.0.0", "dep-b": "~2.0.0" },
  dist: { unpackedSize: 1000 },
  engines: { node: ">=18" },
  keywords: [],
  type: "module",
  main: "index.js",
  types: "index.d.ts",
};

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

describe("detectModuleFormats", () => {
  it("detects ESM-only packages", () => {
    expect(detectModuleFormats({ type: "module", types: "index.d.ts" })).toEqual({
      esm: true,
      cjs: false,
      types: true,
    });
  });

  it("defaults to CommonJS when type is absent", () => {
    expect(detectModuleFormats({ main: "index.js" })).toEqual({
      esm: false,
      cjs: true,
      types: false,
    });
  });

  it("detects dual packages from export conditions", () => {
    expect(
      detectModuleFormats({
        type: "module",
        exports: {
          ".": { import: "./index.mjs", require: "./index.cjs" },
        },
      }),
    ).toEqual({ esm: true, cjs: true, types: false });
  });

  it("treats .mjs and .cjs entry points as format hints", () => {
    expect(detectModuleFormats({ main: "index.mjs" })).toMatchObject({
      esm: true,
      cjs: true,
    });
    expect(detectModuleFormats({ type: "module", main: "index.cjs" })).toMatchObject({
      esm: true,
      cjs: true,
    });
  });
});

describe("getPackageAnalytics", () => {
  it("sums install size across the dependency graph", async () => {
    mockManifests();

    const data = await getPackageAnalytics("root", latest);

    expect(data?.installSize).toEqual({
      bytes: 2000,
      packages: 4,
      truncated: false,
    });
    expect(data?.dependencies).toEqual([
      { name: "dep-a", range: "^1.0.0", latest: "1.5.0", outdated: false },
      { name: "dep-b", range: "~2.0.0", latest: "2.1.0", outdated: true },
    ]);
    expect(data?.outdatedCount).toBe(1);
    expect(data?.moduleFormats).toEqual({ esm: true, cjs: false, types: true });
    expect(cacheSet).toHaveBeenCalledWith(
      "v1:analytics:root",
      data,
      CACHE_HARD_TTL.analytics,
    );
  });

  it("keeps working when a manifest is unavailable", async () => {
    mockManifests({ "dep-b": null });

    const data = await getPackageAnalytics("root", latest);

    expect(data?.dependencies[1]).toEqual({
      name: "dep-b",
      range: "~2.0.0",
      latest: undefined,
      outdated: false,
    });
    expect(data?.installSize?.bytes).toBe(1700);
    expect(data?.installSize?.packages).toBe(3);
  });

  it("does not follow the graph past the depth limit", async () => {
    mockManifests({
      "dep-a": {
        name: "dep-a",
        version: "1.5.0",
        dependencies: { "dep-c": "^3.0.0" },
        dist: { unpackedSize: 500 },
      },
      "dep-c": {
        name: "dep-c",
        version: "3.1.0",
        dependencies: { "dep-d": "^1.0.0" },
        dist: { unpackedSize: 200 },
      },
      "dep-d": {
        name: "dep-d",
        version: "1.0.0",
        dependencies: {},
        dist: { unpackedSize: 999 },
      },
    });

    const data = await getPackageAnalytics("root", {
      ...latest,
      dependencies: { "dep-a": "^1.0.0" },
    });

    // root → dep-a (1) → dep-c (2) → dep-d (3, fetched) → nothing beyond.
    expect(data?.installSize?.packages).toBe(4);
    expect(data?.installSize?.bytes).toBe(2699);
  });

  it("returns cached analytics without fetching", async () => {
    const cached: PackageAnalytics = {
      installSize: { bytes: 10, packages: 1, truncated: false },
      dependencies: [],
      outdatedCount: 0,
      moduleFormats: { esm: true, cjs: false, types: false },
    };
    vi.mocked(cacheGetEntry).mockResolvedValue({
      data: cached,
      cachedAt: Date.now(),
    });

    await expect(getPackageAnalytics("root", latest)).resolves.toEqual(cached);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(backgroundTasks).toHaveLength(0);
  });

  it("serves stale analytics and refreshes in the background", async () => {
    vi.mocked(cacheGetEntry).mockResolvedValue({
      data: {
        installSize: { bytes: 10, packages: 1, truncated: false },
        dependencies: [],
        outdatedCount: 0,
        moduleFormats: { esm: true, cjs: false, types: false },
      },
      cachedAt: Date.now() - (CACHE_HARD_TTL.analytics - 60) * 1_000,
    });
    mockManifests();

    const data = await getPackageAnalytics("root", latest);

    expect(data?.installSize?.bytes).toBe(10);
    expect(backgroundTasks).toHaveLength(1);

    await backgroundTasks[0]();
    expect(cacheSet).toHaveBeenCalled();
  });

  it("skips work when version metadata is missing", async () => {
    await expect(getPackageAnalytics("root", undefined)).resolves.toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
