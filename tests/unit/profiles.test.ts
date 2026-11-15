import { beforeEach, describe, expect, it, vi } from "vitest";

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

vi.mock("../../app/lib/registry", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../app/lib/registry")>();
  return {
    ...actual,
    searchPackages: vi.fn(),
    getDownloadTrend: vi.fn(),
  };
});

import {
  CACHE_HARD_TTL,
  cacheGetEntry,
  cacheSet,
} from "../../app/lib/cache";
import {
  getMaintainerProfile,
  getMaintainerTrend,
  isValidMaintainerName,
} from "../../app/lib/profiles";
import { getDownloadTrend, searchPackages } from "../../app/lib/registry";
import type { PackageSummary } from "../../app/lib/types";

function pkg(name: string, weeklyDownloads: number): PackageSummary {
  return {
    name,
    version: "1.0.0",
    links: { npm: `https://www.npmjs.com/package/${name}` },
    weeklyDownloads,
  };
}

beforeEach(() => {
  backgroundTasks.length = 0;
  vi.mocked(cacheGetEntry).mockResolvedValue(null);
  vi.mocked(cacheSet).mockResolvedValue(undefined);
  vi.mocked(cacheSet).mockClear();
  vi.mocked(searchPackages).mockReset();
  vi.mocked(getDownloadTrend).mockReset();
});

describe("maintainer profile", () => {
  it("validates maintainer handles", () => {
    expect(isValidMaintainerName("sindresorhus")).toBe(true);
    expect(isValidMaintainerName("types")).toBe(true);
    expect(isValidMaintainerName("@scope")).toBe(false);
    expect(isValidMaintainerName("not a name")).toBe(false);
  });

  it("searches by maintainer and sorts packages by downloads", async () => {
    vi.mocked(searchPackages).mockResolvedValue({
      total: 3,
      results: [pkg("chalk", 10), pkg("strip-ansi", 30), pkg("onetime", 20)],
      from: 0,
      size: 50,
    });

    const profile = await getMaintainerProfile("SindreSorhus");

    expect(searchPackages).toHaveBeenCalledWith("maintainer:sindresorhus", {
      size: 50,
    });
    expect(profile?.packages.map((item) => item.name)).toEqual([
      "strip-ansi",
      "onetime",
      "chalk",
    ]);
    expect(profile?.weeklyDownloads).toBe(60);
    expect(profile?.topPackage?.name).toBe("strip-ansi");
  });

  it("rejects invalid names without hitting the registry", async () => {
    await expect(getMaintainerProfile("not a name")).resolves.toBeNull();
    expect(searchPackages).not.toHaveBeenCalled();
  });
});

describe("maintainer trend", () => {
  const packages = [pkg("chalk", 10), pkg("strip-ansi", 8)];

  it("aggregates the top five package trends and caches them", async () => {
    vi.mocked(getDownloadTrend).mockImplementation(async (name) => [
      { day: "2026-11-01", downloads: name === "chalk" ? 10 : 5 },
      { day: "2026-11-02", downloads: name === "chalk" ? 20 : 7 },
    ]);

    const trend = await getMaintainerTrend("sindresorhus", packages);

    expect(trend?.points).toEqual([
      { day: "2026-11-01", downloads: 15 },
      { day: "2026-11-02", downloads: 27 },
    ]);
    expect(trend?.weekly).toBe(42);
    expect(trend?.monthly).toBe(42);
    expect(cacheSet).toHaveBeenCalledWith(
      "v1:profile-trend:sindresorhus",
      trend,
      CACHE_HARD_TTL.profile,
    );
  });

  it("returns a cached trend without fetching package trends", async () => {
    const cached = {
      points: [{ day: "2026-11-01", downloads: 10 }],
      weekly: 10,
      monthly: 10,
    };
    vi.mocked(cacheGetEntry).mockResolvedValue({
      data: cached,
      cachedAt: Date.now(),
    });

    await expect(getMaintainerTrend("sindresorhus", packages)).resolves.toEqual(
      cached,
    );
    expect(getDownloadTrend).not.toHaveBeenCalled();
  });

  it("limits the aggregation to five packages", async () => {
    vi.mocked(getDownloadTrend).mockResolvedValue([]);

    await getMaintainerTrend("sindresorhus", [
      pkg("a", 10),
      pkg("b", 9),
      pkg("c", 8),
      pkg("d", 7),
      pkg("e", 6),
      pkg("f", 5),
    ]);

    expect(getDownloadTrend).toHaveBeenCalledTimes(5);
  });

  it("returns null when there are no packages", async () => {
    await expect(getMaintainerTrend("sindresorhus", [])).resolves.toBeNull();
  });
});
