import { runInBackground } from "./background";
import {
  CACHE_FRESH_TTL,
  CACHE_HARD_TTL,
  cacheGetEntry,
  cacheSet,
  isExpired,
  isFresh,
  readmeCacheKey,
} from "./cache";
import { README_LIMIT } from "./registry";

const README_FILES = [
  "README.md",
  "readme.md",
  "Readme.md",
  "README.markdown",
  "README",
];

const README_FETCH_TIMEOUT_MS = 3_000;
const README_BUDGET_MS = 4_000;
const MAX_DOWNLOAD_BYTES = 512_000;

type CachedReadme = {
  readme: string | null;
  truncated: boolean;
};

const NEGATIVE_TTL_SECONDS = 3_600;

export type ReadmeSource = {
  readme: string;
  truncated: boolean;
};

async function fetchReadmeFile(
  name: string,
  version: string,
  file: string,
  timeoutMs: number,
): Promise<string | null> {
  let response: Response;

  try {
    response = await fetch(
      `https://cdn.jsdelivr.net/npm/${name}@${encodeURIComponent(version)}/${file}`,
      {
        headers: { Accept: "text/plain" },
        signal: AbortSignal.timeout(timeoutMs),
        cache: "no-store",
      },
    );
  } catch {
    return null;
  }

  if (!response.ok) return null;

  const contentLength = Number(response.headers.get("content-length") ?? 0);
  if (contentLength > MAX_DOWNLOAD_BYTES) return null;

  let text: string;

  try {
    text = await response.text();
  } catch {
    return null;
  }

  const trimmed = text.trim();

  if (!trimmed || trimmed.startsWith("<!DOCTYPE") || trimmed.startsWith("<html")) {
    return null;
  }

  return trimmed;
}

async function refreshReadmeFallback(
  name: string,
  version: string,
  cacheKey: string,
): Promise<ReadmeSource | null> {
  const startedAt = Date.now();

  for (const file of README_FILES) {
    const remaining = README_BUDGET_MS - (Date.now() - startedAt);
    if (remaining <= 0) break;

    const readme = await fetchReadmeFile(
      name,
      version,
      file,
      Math.min(README_FETCH_TIMEOUT_MS, remaining),
    );
    if (!readme) continue;

    const truncated = readme.length > README_LIMIT;
    const data: CachedReadme = {
      readme: truncated ? readme.slice(0, README_LIMIT) : readme,
      truncated,
    };

    await cacheSet(cacheKey, data, CACHE_HARD_TTL.readme);

    return data.readme ? { readme: data.readme, truncated } : null;
  }

  await cacheSet(
    cacheKey,
    { readme: null, truncated: false } satisfies CachedReadme,
    NEGATIVE_TTL_SECONDS,
  );

  return null;
}

/**
 * The npm registry now returns an empty `readme` for many packages. Fall back
 * to the README published in the tarball, served by jsDelivr.
 */
export async function getReadmeFallback(
  name: string,
  version: string,
): Promise<ReadmeSource | null> {
  const cacheKey = readmeCacheKey(name, version);
  const entry = await cacheGetEntry<CachedReadme>(cacheKey);

  if (entry && !isExpired(entry, CACHE_HARD_TTL.readme)) {
    if (!isFresh(entry, CACHE_FRESH_TTL.readme)) {
      runInBackground(cacheKey, async () => {
        await refreshReadmeFallback(name, version, cacheKey);
      });
    }

    return entry.data.readme
      ? { readme: entry.data.readme, truncated: entry.data.truncated }
      : null;
  }

  return refreshReadmeFallback(name, version, cacheKey);
}
