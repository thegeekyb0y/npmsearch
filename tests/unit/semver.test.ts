import { describe, expect, it } from "vitest";
import {
  compareVersions,
  isOutdated,
  matchesRange,
  parseVersion,
} from "../../app/lib/semver";

describe("parseVersion", () => {
  it("parses release versions and ignores build metadata", () => {
    expect(parseVersion("1.2.3")).toEqual({ major: 1, minor: 2, patch: 3 });
    expect(parseVersion("v1.2.3-beta.1")).toEqual({
      major: 1,
      minor: 2,
      patch: 3,
    });
    expect(parseVersion("not-a-version")).toBeNull();
  });
});

describe("compareVersions", () => {
  it("orders releases by major, minor, then patch", () => {
    expect(compareVersions("1.2.3", "1.2.3")).toBe(0);
    expect(compareVersions("2.0.0", "1.9.9")).toBeGreaterThan(0);
    expect(compareVersions("1.2.10", "1.2.9")).toBeGreaterThan(0);
    expect(compareVersions("1.0.0", "2.0.0")).toBeLessThan(0);
    expect(compareVersions("nope", "1.0.0")).toBeNull();
  });
});

describe("matchesRange", () => {
  it("handles caret ranges for stable and 0.x releases", () => {
    expect(matchesRange("^1.2.3", "1.9.9")).toBe("yes");
    expect(matchesRange("^1.2.3", "2.0.0")).toBe("no");
    expect(matchesRange("^0.2.3", "0.2.9")).toBe("yes");
    expect(matchesRange("^0.2.3", "0.3.0")).toBe("no");
  });

  it("handles tilde, comparator and wildcard ranges", () => {
    expect(matchesRange("~1.2.3", "1.2.9")).toBe("yes");
    expect(matchesRange("~1.2.3", "1.3.0")).toBe("no");
    expect(matchesRange(">=1.2.0 <2.0.0", "1.5.0")).toBe("yes");
    expect(matchesRange(">=1.2.0 <2.0.0", "2.0.0")).toBe("no");
    expect(matchesRange(">= 1.2.0 < 2.0.0", "1.5.0")).toBe("yes");
    expect(matchesRange("1.x", "1.9.0")).toBe("yes");
    expect(matchesRange("1.x", "2.0.0")).toBe("no");
    expect(matchesRange("1.2.x", "1.2.7")).toBe("yes");
    expect(matchesRange("1.2.x", "1.3.0")).toBe("no");
    expect(matchesRange("1.2", "1.2.7")).toBe("yes");
    expect(matchesRange("*", "99.0.0")).toBe("yes");
  });

  it("handles alternatives and hyphen ranges", () => {
    expect(matchesRange("^1.0.0 || ^3.0.0", "3.1.0")).toBe("yes");
    expect(matchesRange("^1.0.0 || ^3.0.0", "2.0.0")).toBe("no");
    expect(matchesRange("1.2.3 - 2.3.4", "2.0.0")).toBe("yes");
    expect(matchesRange("1.2.3 - 2.3.4", "2.4.0")).toBe("no");
  });

  it("reports unsupported ranges as unknown", () => {
    expect(matchesRange("workspace:*", "1.0.0")).toBe("unknown");
    expect(matchesRange("file:../local", "1.0.0")).toBe("unknown");
    expect(matchesRange("", "1.0.0")).toBe("unknown");
  });
});

describe("isOutdated", () => {
  it("flags releases outside the declared range", () => {
    expect(isOutdated("^1.2.3", "1.9.0")).toBe(false);
    expect(isOutdated("^1.2.3", "2.0.0")).toBe(true);
    expect(isOutdated("~2.0.0", "2.1.0")).toBe(true);
    expect(isOutdated("2.0.0", "2.0.0")).toBe(false);
  });

  it("does not flag wildcard or unsupported ranges", () => {
    expect(isOutdated("*", "9.9.9")).toBe(false);
    expect(isOutdated("latest", "9.9.9")).toBe(false);
    expect(isOutdated("workspace:*", "9.9.9")).toBe(false);
  });

  it("does not flag a latest release older than the range", () => {
    expect(isOutdated(">=2.0.0", "1.5.0")).toBe(false);
  });
});
