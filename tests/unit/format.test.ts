import { describe, expect, it } from "vitest";
import {
  formatBytes,
  formatCompactNumber,
  formatDate,
  formatDownloads,
  normalizeRepositoryUrl,
} from "../../app/lib/format";

describe("formatDownloads", () => {
  it("formats millions and thousands", () => {
    expect(formatDownloads(2_400_000)).toBe("2.4M / wk");
    expect(formatDownloads(12_300)).toBe("12.3K / wk");
    expect(formatDownloads(42)).toBe("42 / wk");
  });

  it("returns a stable fallback for missing or invalid values", () => {
    expect(formatDownloads(undefined)).toBe("Downloads unavailable");
    expect(formatDownloads(Number.NaN)).toBe("Downloads unavailable");
  });
});

describe("formatBytes", () => {
  it("formats each unit", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2.0 kB");
    expect(formatBytes(2 * 1024 * 1024)).toBe("2.0 MB");
  });

  it("treats missing and zero as unknown", () => {
    expect(formatBytes(undefined)).toBe("Unknown");
    expect(formatBytes(0)).toBe("Unknown");
  });
});

describe("formatCompactNumber", () => {
  it("compacts numbers and falls back for invalid input", () => {
    expect(formatCompactNumber(1_500)).toBe("1.5K");
    expect(formatCompactNumber(undefined)).toBe("Unknown");
  });
});

describe("formatDate", () => {
  it("formats ISO dates deterministically", () => {
    expect(formatDate("2026-11-10T12:00:00Z")).toBe("Nov 10, 2026");
  });

  it("returns Unknown when missing or invalid", () => {
    expect(formatDate(undefined)).toBe("Unknown");
    expect(formatDate("not-a-date")).toBe("Unknown");
  });
});

describe("normalizeRepositoryUrl", () => {
  it("strips git prefixes and .git suffixes", () => {
    expect(normalizeRepositoryUrl("git+https://github.com/vercel/next.js.git")).toBe(
      "https://github.com/vercel/next.js",
    );
  });

  it("returns undefined for empty input", () => {
    expect(normalizeRepositoryUrl(undefined)).toBeUndefined();
  });
});
