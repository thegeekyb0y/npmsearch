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
    cacheDelete: vi.fn(),
  };
});

import {
  CACHE_HARD_TTL,
  cacheDelete,
  cacheGetEntry,
  cacheSet,
} from "../../app/lib/cache";
import { getGithubStats, parseGithubRepo } from "../../app/lib/github";

const fetchMock = vi.fn();

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

describe("parseGithubRepo", () => {
  it.each([
    "https://github.com/facebook/react",
    "git+https://github.com/facebook/react.git",
    "git://github.com/facebook/react.git",
    "git@github.com:facebook/react.git",
    "github:facebook/react",
    "facebook/react",
    "https://github.com/facebook/react/tree/main/packages/react",
  ])("parses %s", (value) => {
    expect(parseGithubRepo(value)).toEqual({
      owner: "facebook",
      repo: "react",
      url: "https://github.com/facebook/react",
    });
  });

  it("rejects non-GitHub and empty values", () => {
    expect(parseGithubRepo("https://gitlab.com/facebook/react")).toBeNull();
    expect(parseGithubRepo("https://github.com/facebook")).toBeNull();
    expect(parseGithubRepo(undefined)).toBeNull();
    expect(parseGithubRepo("")).toBeNull();
  });
});

describe("getGithubStats", () => {
  it("returns null without a token and does not fetch", async () => {
    await expect(
      getGithubStats("https://github.com/facebook/react", undefined),
    ).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns null for a non-GitHub repository", async () => {
    await expect(
      getGithubStats("https://gitlab.com/facebook/react", "token"),
    ).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("maps and caches repository stats", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          stargazers_count: 200000,
          forks_count: 42000,
          open_issues_count: 1100,
          html_url: "https://github.com/facebook/react",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const stats = await getGithubStats(
      "https://github.com/facebook/react",
      "token",
    );

    expect(stats).toEqual({
      stars: 200000,
      forks: 42000,
      issues: 1100,
      url: "https://github.com/facebook/react",
    });
    expect(cacheSet).toHaveBeenCalledWith(
      "v1:github:facebook/react",
      stats,
      CACHE_HARD_TTL.github,
    );
  });

  it("returns cached stats without fetching", async () => {
    const cached = { stars: 1, forks: 2, issues: 3, url: "https://github.com/a/b" };
    vi.mocked(cacheGetEntry).mockResolvedValue({
      data: cached,
      cachedAt: Date.now(),
    });

    await expect(getGithubStats("https://github.com/a/b", "token")).resolves.toEqual(
      cached,
    );
    expect(fetchMock).not.toHaveBeenCalled();
    expect(backgroundTasks).toHaveLength(0);
  });

  it("serves stale stats and refreshes them in the background", async () => {
    const cached = { stars: 1, forks: 2, issues: 3, url: "https://github.com/a/b" };
    vi.mocked(cacheGetEntry).mockResolvedValue({
      data: cached,
      cachedAt: Date.now() - 90_000_000,
    });
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          stargazers_count: 4,
          forks_count: 5,
          open_issues_count: 6,
          html_url: "https://github.com/a/b",
        }),
        { status: 200 },
      ),
    );

    await expect(getGithubStats("https://github.com/a/b", "token")).resolves.toEqual(
      cached,
    );
    expect(fetchMock).not.toHaveBeenCalled();
    expect(backgroundTasks).toHaveLength(1);

    await backgroundTasks[0]();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(cacheSet).toHaveBeenCalledWith(
      "v1:github:a/b",
      expect.objectContaining({ stars: 4 }),
      CACHE_HARD_TTL.github,
    );
  });

  it("returns null on 404 and clears any stale entry", async () => {
    fetchMock.mockResolvedValue(new Response("not found", { status: 404 }));

    await expect(
      getGithubStats("https://github.com/facebook/react", "token"),
    ).resolves.toBeNull();
    expect(cacheSet).not.toHaveBeenCalled();
    expect(cacheDelete).toHaveBeenCalledWith("v1:github:facebook/react");
  });

  it("returns null on malformed or failed responses", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ stargazers_count: "many" }), { status: 200 }),
    );
    await expect(
      getGithubStats("https://github.com/facebook/react", "token"),
    ).resolves.toBeNull();

    fetchMock.mockRejectedValueOnce(new Error("network down"));
    await expect(
      getGithubStats("https://github.com/facebook/react", "token"),
    ).resolves.toBeNull();
  });
});
