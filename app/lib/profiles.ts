import { runInBackground } from "./background";
import {
  CACHE_FRESH_TTL,
  CACHE_HARD_TTL,
  cacheGetEntry,
  cacheSet,
  isExpired,
  isFresh,
  profileTrendCacheKey,
} from "./cache";
import { aggregateTrends } from "./profile-art";
import { getDownloadTrend, searchPackages } from "./registry";
import type {
  DownloadPoint,
  MaintainerTrend,
  PackageSummary,
} from "./types";

const MAINTAINER_PATTERN = /^[a-z0-9][a-z0-9._-]*$/i;
const MAX_PACKAGES = 50;
const TREND_PACKAGES = 5;

export type MaintainerProfile = {
  name: string;
  total: number;
  packages: PackageSummary[];
  weeklyDownloads: number;
  topPackage?: PackageSummary;
};

export function normalizeMaintainerName(name: string): string {
  try {
    return decodeURIComponent(name).trim().toLowerCase();
  } catch {
    return name.trim().toLowerCase();
  }
}

export function isValidMaintainerName(name: string): boolean {
  return name.length <= 100 && MAINTAINER_PATTERN.test(name);
}

export async function getMaintainerProfile(
  rawName: string,
): Promise<MaintainerProfile | null> {
  const name = normalizeMaintainerName(rawName);

  if (!isValidMaintainerName(name)) return null;

  const results = await searchPackages(`maintainer:${name}`, {
    size: MAX_PACKAGES,
  });
  const packages = [...results.results].sort(
    (left, right) =>
      (right.weeklyDownloads ?? -1) - (left.weeklyDownloads ?? -1),
  );

  return {
    name,
    total: results.total,
    packages,
    weeklyDownloads: packages.reduce(
      (sum, item) => sum + (item.weeklyDownloads ?? 0),
      0,
    ),
    topPackage: packages[0],
  };
}

function summarizeTrend(points: DownloadPoint[]): MaintainerTrend | null {
  if (points.length === 0) return null;

  return {
    points,
    weekly: points
      .slice(-7)
      .reduce((sum, point) => sum + point.downloads, 0),
    monthly: points.reduce((sum, point) => sum + point.downloads, 0),
  };
}

async function refreshMaintainerTrend(
  name: string,
  packages: PackageSummary[],
  cacheKey: string,
): Promise<MaintainerTrend | null> {
  const trends = await Promise.all(
    packages
      .slice(0, TREND_PACKAGES)
      .map((item) => getDownloadTrend(item.name)),
  );
  const data = summarizeTrend(aggregateTrends(trends));

  if (data) {
    await cacheSet(cacheKey, data, CACHE_HARD_TTL.profile);
  }

  return data;
}

export async function getMaintainerTrend(
  name: string,
  packages: PackageSummary[],
): Promise<MaintainerTrend | null> {
  if (packages.length === 0) return null;

  const cacheKey = profileTrendCacheKey(name);
  const entry = await cacheGetEntry<MaintainerTrend>(cacheKey);

  if (entry && !isExpired(entry, CACHE_HARD_TTL.profile)) {
    if (!isFresh(entry, CACHE_FRESH_TTL.profile)) {
      runInBackground(cacheKey, async () => {
        await refreshMaintainerTrend(name, packages, cacheKey);
      });
    }

    return entry.data;
  }

  return refreshMaintainerTrend(name, packages, cacheKey);
}
