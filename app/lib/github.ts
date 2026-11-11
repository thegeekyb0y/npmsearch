import { z } from "zod";
import { runInBackground } from "./background";
import {
  CACHE_FRESH_TTL,
  CACHE_HARD_TTL,
  cacheDelete,
  cacheGetEntry,
  cacheSet,
  githubCacheKey,
  isExpired,
  isFresh,
} from "./cache";
import { getGithubToken } from "./env";
import type { GithubStats } from "./types";

const GITHUB_API_BASE = "https://api.github.com";
const REQUEST_TIMEOUT_MS = 8_000;

export type GithubRepoRef = {
  owner: string;
  repo: string;
  url: string;
};

const githubRepoSchema = z.object({
  stargazers_count: z.number().nullable().optional(),
  forks_count: z.number().nullable().optional(),
  open_issues_count: z.number().nullable().optional(),
  html_url: z.string().nullable().optional(),
});

function buildRef(owner: string, repo: string): GithubRepoRef | null {
  const cleanOwner = owner.trim();
  const cleanRepo = repo.trim().replace(/\.git$/, "");

  if (
    !/^[\w.-]+$/.test(cleanOwner) ||
    !/^[\w.-]+$/.test(cleanRepo) ||
    cleanRepo === "."
  ) {
    return null;
  }

  return {
    owner: cleanOwner,
    repo: cleanRepo,
    url: `https://github.com/${cleanOwner}/${cleanRepo}`,
  };
}

export function parseGithubRepo(
  repositoryUrl?: string | null,
): GithubRepoRef | null {
  if (!repositoryUrl) return null;

  let value = repositoryUrl.trim();
  if (!value) return null;

  const shorthand = /^github:([^/\s]+)\/([^/\s#?]+)$/i.exec(value);
  if (shorthand) return buildRef(shorthand[1], shorthand[2]);

  const scp = /^git@github\.com:([^/]+)\/(.+)$/i.exec(value);
  if (scp) return buildRef(scp[1], scp[2]);

  if (/^[\w.-]+\/[\w.-]+$/.test(value)) {
    const [owner, repo] = value.split("/");
    return buildRef(owner, repo);
  }

  value = value
    .replace(/^git\+/, "")
    .replace(/^git:\/\//, "https://")
    .replace(/^ssh:\/\/git@/, "https://");

  try {
    const url = new URL(value);

    if (url.hostname !== "github.com" && url.hostname !== "www.github.com") {
      return null;
    }

    const [owner, repo] = url.pathname.split("/").filter(Boolean);
    if (!owner || !repo) return null;

    return buildRef(owner, repo);
  } catch {
    return null;
  }
}

function resolveToken(): string | undefined {
  try {
    return getGithubToken();
  } catch (error) {
    console.warn("GitHub token is unavailable.", error);
    return undefined;
  }
}

export async function getGithubStats(
  repositoryUrl: string | null | undefined,
  token: string | undefined = resolveToken(),
): Promise<GithubStats | null> {
  if (!token) return null;

  const ref = parseGithubRepo(repositoryUrl);
  if (!ref) return null;

  const cacheKey = githubCacheKey(ref.owner, ref.repo);
  const entry = await cacheGetEntry<GithubStats>(cacheKey);

  if (entry && !isExpired(entry, CACHE_HARD_TTL.github)) {
    if (!isFresh(entry, CACHE_FRESH_TTL.github)) {
      runInBackground(cacheKey, async () => {
        await refreshGithub(ref, token, cacheKey);
      });
    }

    return entry.data;
  }

  return refreshGithub(ref, token, cacheKey);
}

async function refreshGithub(
  ref: GithubRepoRef,
  token: string,
  cacheKey: string,
): Promise<GithubStats | null> {
  let response: Response;

  try {
    response = await fetch(
      `${GITHUB_API_BASE}/repos/${encodeURIComponent(ref.owner)}/${encodeURIComponent(ref.repo)}`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${token}`,
          "User-Agent": "npmsearch",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        cache: "no-store",
      },
    );
  } catch {
    return null;
  }

  if (!response.ok) {
    if (response.status !== 404) {
      console.warn(
        `GitHub stats unavailable for ${ref.owner}/${ref.repo}: ${response.status}`,
      );
    } else {
      await cacheDelete(cacheKey);
    }
    return null;
  }

  let json: unknown;

  try {
    json = await response.json();
  } catch {
    return null;
  }

  const parsed = githubRepoSchema.safeParse(json);
  if (!parsed.success) return null;

  const data: GithubStats = {
    stars: parsed.data.stargazers_count ?? undefined,
    forks: parsed.data.forks_count ?? undefined,
    issues: parsed.data.open_issues_count ?? undefined,
    url: parsed.data.html_url ?? ref.url,
  };

  await cacheSet(cacheKey, data, CACHE_HARD_TTL.github);

  return data;
}
