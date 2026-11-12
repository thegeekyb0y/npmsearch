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
import { getReadmeFallback } from "../../app/lib/readme-source";
import { README_LIMIT } from "../../app/lib/registry";

const fetchMock = vi.fn();

function textResponse(body: string, status = 200) {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/plain" },
  });
}

function mockFiles(files: Record<string, string>) {
  fetchMock.mockImplementation((input: RequestInfo | URL) => {
    const url = String(input);
    const file = url.split("/").pop() ?? "";
    const body = files[file];

    return Promise.resolve(
      body === undefined ? new Response("missing", { status: 404 }) : textResponse(body),
    );
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

describe("getReadmeFallback", () => {
  it("tries filenames in order and caches the first match", async () => {
    mockFiles({ "readme.md": "# TypeScript\n\nRead me." });

    const data = await getReadmeFallback("typescript", "7.0.2");

    expect(data).toEqual({ readme: "# TypeScript\n\nRead me.", truncated: false });

    const urls = fetchMock.mock.calls.map(([input]) => String(input));
    expect(urls[0]).toBe(
      "https://cdn.jsdelivr.net/npm/typescript@7.0.2/README.md",
    );
    expect(urls[1]).toBe(
      "https://cdn.jsdelivr.net/npm/typescript@7.0.2/readme.md",
    );
    expect(cacheSet).toHaveBeenCalledWith(
      "v1:readme:typescript@7.0.2",
      { readme: "# TypeScript\n\nRead me.", truncated: false },
      CACHE_HARD_TTL.readme,
    );
  });

  it("keeps scoped package paths intact", async () => {
    mockFiles({ "README.md": "# Node types" });

    await getReadmeFallback("@types/node", "22.10.0");

    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://cdn.jsdelivr.net/npm/@types/node@22.10.0/README.md",
    );
  });

  it("truncates oversized content", async () => {
    mockFiles({ "README.md": "x".repeat(README_LIMIT + 10) });

    const data = await getReadmeFallback("huge", "1.0.0");

    expect(data?.truncated).toBe(true);
    expect(data?.readme).toHaveLength(README_LIMIT);
  });

  it("returns null and caches a short negative result when nothing exists", async () => {
    mockFiles({});

    await expect(getReadmeFallback("empty", "1.0.0")).resolves.toBeNull();

    expect(cacheSet).toHaveBeenCalledWith(
      "v1:readme:empty@1.0.0",
      { readme: null, truncated: false },
      3_600,
    );
  });

  it("ignores HTML responses", async () => {
    fetchMock.mockResolvedValue(
      textResponse("<!DOCTYPE html><html><body>not found</body></html>"),
    );

    await expect(getReadmeFallback("spa", "1.0.0")).resolves.toBeNull();
  });

  it("serves a cached readme without fetching", async () => {
    vi.mocked(cacheGetEntry).mockResolvedValue({
      data: { readme: "# Cached", truncated: false },
      cachedAt: Date.now(),
    });

    await expect(getReadmeFallback("react", "19.3.1")).resolves.toEqual({
      readme: "# Cached",
      truncated: false,
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(backgroundTasks).toHaveLength(0);
  });

  it("refreshes a stale cached readme in the background", async () => {
    vi.mocked(cacheGetEntry).mockResolvedValue({
      data: { readme: "# Old", truncated: false },
      cachedAt: Date.now() - (CACHE_HARD_TTL.readme - 60) * 1_000,
    });
    mockFiles({ "README.md": "# New" });

    await expect(getReadmeFallback("react", "19.3.1")).resolves.toEqual({
      readme: "# Old",
      truncated: false,
    });
    expect(backgroundTasks).toHaveLength(1);

    await backgroundTasks[0]();
    expect(cacheSet).toHaveBeenCalledWith(
      "v1:readme:react@19.3.1",
      { readme: "# New", truncated: false },
      CACHE_HARD_TTL.readme,
    );
  });
});
