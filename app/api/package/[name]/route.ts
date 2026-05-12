import { Redis } from "@upstash/redis";
import { NextRequest, NextResponse } from "next/server";

const redis = Redis.fromEnv();

type RegistryVersionData = {
  license?: string;
  dependencies?: Record<string, string>;
  dist?: { unpackedSize?: number };
  engines?: { node?: string };
  keywords?: string[];
};

type RegistryPackageData = {
  name?: string;
  description?: string;
  readme?: string;
  license?: string;
  homepage?: string;
  keywords?: string[];
  maintainers?: Array<{ name: string; email?: string }>;
  time?: Record<string, string>;
  repository?: { url?: string };
  "dist-tags"?: { latest?: string };
  versions?: Record<string, RegistryVersionData>;
};

type NpmsPackageData = {
  collected?: {
    github?: {
      starsCount?: number;
      forksCount?: number;
      issues?: { openCount?: number };
    };
    npm?: {
      dependentsCount?: number;
      starsCount?: number;
      forksCount?: number;
    };
    source?: {
      starsCount?: number;
      forksCount?: number;
      issues?: { openCount?: number };
    };
  };
  evaluation?: {
    popularity?: {
      dependentsCount?: number;
    };
  };
  score?: {
    final?: number;
  };
};

type DownloadsRangeData = {
  start?: string;
  end?: string;
  downloads?: Array<{
    downloads?: number;
    day?: string;
  }>;
};

function extractGithubStats(npmsData: NpmsPackageData | null) {
  const github = npmsData?.collected?.github ?? {};
  const npm = npmsData?.collected?.npm ?? {};
  const source = npmsData?.collected?.source ?? {};

  return {
    stars: github.starsCount ?? source.starsCount ?? npm.starsCount ?? undefined,
    forks: github.forksCount ?? source.forksCount ?? npm.forksCount ?? undefined,
    issues: github.issues?.openCount ?? source.issues?.openCount ?? undefined,
    dependents:
      npm.dependentsCount ??
      npmsData?.evaluation?.popularity?.dependentsCount ??
      undefined,
    score: npmsData?.score?.final,
  };
}

function buildCompactPackagePayload(
  registryData: RegistryPackageData,
  downloadData: DownloadsRangeData | null,
  npmsData: NpmsPackageData | null,
) {
  const latestVersion = registryData["dist-tags"]?.latest ?? "";
  const latestVersionData = latestVersion ? registryData.versions?.[latestVersion] : undefined;
  const recentVersions = Object.entries(registryData.time ?? {})
    .filter(([version]) => !["created", "modified"].includes(version))
    .sort((a, b) => new Date(b[1]).getTime() - new Date(a[1]).getTime())
    .slice(0, 7)
    .map(([version, publishedAt]) => ({
      version,
      publishedAt,
      tag:
        Object.entries(registryData["dist-tags"] ?? {}).find(
          ([, taggedVersion]) => taggedVersion === version,
        )?.[0] ?? undefined,
    }));

  const downloadTrend = (downloadData?.downloads ?? [])
    .map((entry) => ({
      day: entry.day,
      downloads: entry.downloads ?? 0,
    }))
    .filter((entry) => entry.day);
  const weeklyDownloads = downloadTrend.reduce(
    (sum, entry) => sum + entry.downloads,
    0,
  );
  const githubStats = extractGithubStats(npmsData);

  return {
    name: registryData.name,
    description: registryData.description,
    readme: registryData.readme,
    license: registryData.license,
    homepage: registryData.homepage,
    keywords: registryData.keywords ?? [],
    maintainers: registryData.maintainers ?? [],
    repository: registryData.repository,
    "dist-tags": registryData["dist-tags"],
    latestVersionInfo: latestVersionData
      ? {
          license: latestVersionData.license,
          dependencies: latestVersionData.dependencies ?? {},
          dist: latestVersionData.dist,
          engines: latestVersionData.engines,
          keywords: latestVersionData.keywords ?? [],
        }
      : undefined,
    recentVersions,
    _meta: {
      ...githubStats,
      weeklyDownloads: weeklyDownloads || undefined,
      downloadTrend,
      downloadRange: {
        start: downloadData?.start,
        end: downloadData?.end,
      },
      publishedAt: latestVersion ? registryData.time?.[latestVersion] : undefined,
    },
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ name: string }> },
) {
  const name = decodeURIComponent((await params).name).trim();

  if (!name) {
    return NextResponse.json(
      { error: "Package name is required" },
      { status: 400 },
    );
  }

  const cacheKey = `package:${name.toLowerCase()}`;

  try {
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      return NextResponse.json(
        typeof cachedData === "string" ? JSON.parse(cachedData) : cachedData,
      );
    }
  } catch (error) {
    console.error("Package cache read error:", error);
  }

  try {
    const encodedName = encodeURIComponent(name);
    const [registryResponse, downloadsResponse, npmsResponse] =
      await Promise.all([
        fetch(`https://registry.npmjs.org/${encodedName}`, { cache: "no-store" }),
        fetch(`https://api.npmjs.org/downloads/range/last-week/${encodedName}`, {
          cache: "no-store",
        }).catch(() => null),
        fetch(`https://api.npms.io/v2/package/${encodedName}`, {
          headers: { Accept: "application/json" },
          cache: "no-store",
        }).catch(() => null),
      ]);

    if (!registryResponse.ok) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 });
    }

    const registryData: RegistryPackageData = await registryResponse.json();
    const downloadsData: DownloadsRangeData | null =
      downloadsResponse && downloadsResponse.ok
        ? await downloadsResponse.json()
        : null;
    const npmsData: NpmsPackageData | null =
      npmsResponse && npmsResponse.ok ? await npmsResponse.json() : null;
    const data = buildCompactPackagePayload(registryData, downloadsData, npmsData);

    try {
      await redis.set(cacheKey, JSON.stringify(data), { ex: 3600 });
    } catch (error) {
      console.error("Package cache write error:", error);
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Package API Error: ", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
