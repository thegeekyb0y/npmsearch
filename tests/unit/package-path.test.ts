import { describe, expect, it } from "vitest";
import { isReservedPath, parsePackagePath } from "../../app/lib/package-path";

describe("parsePackagePath", () => {
  it("parses unscoped and scoped package names", () => {
    expect(parsePackagePath(["react"])).toEqual({ name: "react" });
    expect(parsePackagePath(["@scope", "name"])).toEqual({
      name: "@scope/name",
    });
    expect(parsePackagePath(["%40scope%2Fname"])).toEqual({
      name: "@scope/name",
    });
  });

  it("parses versions for both name shapes", () => {
    expect(parsePackagePath(["react@19.3.1"])).toEqual({
      name: "react",
      version: "19.3.1",
    });
    expect(parsePackagePath(["@scope", "name@1.2.3"])).toEqual({
      name: "@scope/name",
      version: "1.2.3",
    });
    expect(parsePackagePath(["@scope/name@1.2.3"])).toEqual({
      name: "@scope/name",
      version: "1.2.3",
    });
    expect(parsePackagePath(["react@next"])).toEqual({
      name: "react",
      version: "next",
    });
  });

  it("treats a trailing @ as the latest version", () => {
    expect(parsePackagePath(["react@"])).toEqual({ name: "react" });
  });

  it("rejects reserved, invalid and over-segmented paths", () => {
    expect(parsePackagePath(["package"])).toBeNull();
    expect(parsePackagePath(["search"])).toBeNull();
    expect(parsePackagePath(["api"])).toBeNull();
    expect(parsePackagePath([])).toBeNull();
    expect(parsePackagePath(["@scope"])).toBeNull();
    expect(parsePackagePath(["foo", "bar", "baz"])).toBeNull();
    expect(parsePackagePath(["not a valid name!"])).toBeNull();
    expect(parsePackagePath(["react@1.0.0/extra"])).toBeNull();
  });

  it("rejects crawler and static-file paths before any registry access", () => {
    expect(parsePackagePath(["robots.txt"])).toBeNull();
    expect(parsePackagePath(["sitemap.xml"])).toBeNull();
    expect(parsePackagePath(["favicon.ico"])).toBeNull();
    expect(parsePackagePath(["og.png"])).toBeNull();
    expect(parsePackagePath(["index.html"])).toBeNull();
    expect(parsePackagePath(["readme.md"])).toEqual({ name: "readme.md" });
  });

  it("keeps real packages that contain a dot", () => {
    expect(parsePackagePath(["normalize.css"])).toEqual({ name: "normalize.css" });
    expect(parsePackagePath(["sanitize.css"])).toEqual({ name: "sanitize.css" });
    expect(parsePackagePath(["highlight.js"])).toEqual({ name: "highlight.js" });
    expect(parsePackagePath(["socket.io"])).toEqual({ name: "socket.io" });
    expect(parsePackagePath(["lodash.merge"])).toEqual({ name: "lodash.merge" });
    expect(parsePackagePath(["@scope/pkg"])).toEqual({ name: "@scope/pkg" });
  });
});

describe("isReservedPath", () => {
  it("flags metadata and asset filenames", () => {
    expect(isReservedPath("robots.txt")).toBe(true);
    expect(isReservedPath("sitemap.xml")).toBe(true);
    expect(isReservedPath("favicon.ico")).toBe(true);
    expect(isReservedPath("styles.css")).toBe(false);
    expect(isReservedPath("highlight.js")).toBe(false);
    expect(isReservedPath("react")).toBe(false);
  });
});
