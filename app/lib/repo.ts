import { getGithubToken } from "./env";
import { GITHUB_REPO } from "./site";

const REQUEST_TIMEOUT_MS = 2_000;
const REVALIDATE_SECONDS = 86_400;

export async function getRepoStars(): Promise<number | undefined> {
  let token: string | undefined;

  try {
    token = getGithubToken();
  } catch {
    token = undefined;
  }

  try {
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": "npmsearch",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        next: { revalidate: REVALIDATE_SECONDS },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      },
    );

    if (!response.ok) return undefined;

    const json: unknown = await response.json();

    if (!json || typeof json !== "object") return undefined;

    const stars = (json as { stargazers_count?: unknown }).stargazers_count;

    return typeof stars === "number" ? stars : undefined;
  } catch {
    return undefined;
  }
}
