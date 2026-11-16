import { isValidPackageName, isValidVersion } from "./registry";

const RESERVED = new Set(["api", "package", "search"]);

/**
 * Crawler/metadata file requests that are not packages. Checked before any
 * cache key is created or the registry is called.
 */
const RESERVED_FILES = new Set([
  "robots.txt",
  "sitemap.xml",
  "sitemap_index.xml",
  "favicon.ico",
  "manifest.webmanifest",
  "manifest.json",
  "browserconfig.xml",
  "ads.txt",
  "security.txt",
  "humans.txt",
]);

/**
 * Only extensions that never appear as a real npm package suffix. `.js`,
 * `.css`, `.json`, `.md`, `.io`, `.ts` and friends are deliberately absent so
 * `highlight.js`, `normalize.css`, `socket.io` and `lodash.merge` still work.
 */
const REJECTED_EXTENSIONS = new Set([
  ".txt",
  ".xml",
  ".ico",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".svg",
  ".webp",
  ".avif",
  ".map",
  ".woff",
  ".woff2",
  ".ttf",
  ".otf",
  ".eot",
  ".pdf",
  ".zip",
  ".gz",
  ".tgz",
  ".html",
  ".htm",
  ".php",
  ".asp",
  ".aspx",
  ".jsp",
  ".cgi",
  ".env",
  ".yml",
  ".yaml",
  ".toml",
  ".ini",
  ".conf",
  ".lock",
  ".log",
  ".bak",
  ".sql",
]);

export type PackagePath = {
  name: string;
  version?: string;
};

/** True for static-file style paths such as `/robots.txt` or `/og.png`. */
export function isReservedPath(name: string): boolean {
  const value = name.trim().toLowerCase();

  if (!value) return false;
  if (RESERVED_FILES.has(value)) return true;

  const extension = /\.[a-z0-9]+$/i.exec(value)?.[0].toLowerCase();

  return extension !== undefined && REJECTED_EXTENSIONS.has(extension);
}

/**
 * Parses `/<pkg>` and `/<pkg>@<version>` path segments, including scoped names
 * (`/@scope/name`, `/@scope/name@1.2.3`). Reserved and static-file paths are
 * rejected before validation, caching, or any registry access.
 */
export function parsePackagePath(segments: string[]): PackagePath | null {
  const parts = segments
    .map((segment) => {
      try {
        return decodeURIComponent(segment).trim();
      } catch {
        return segment.trim();
      }
    })
    .filter(Boolean);

  if (parts.length === 0 || parts.length > 2) return null;

  const joined = parts.join("/");
  const first = parts[0].toLowerCase();

  if (RESERVED.has(first)) return null;

  const scoped = first.startsWith("@");

  if (!scoped && isReservedPath(joined)) return null;

  const versionIndex = joined.lastIndexOf("@");
  const name = versionIndex > 0 ? joined.slice(0, versionIndex) : joined;
  const version = versionIndex > 0 ? joined.slice(versionIndex + 1) : "";

  if (!isValidPackageName(name.toLowerCase())) return null;
  if (version && !isValidVersion(version)) return null;

  return { name, version: version || undefined };
}
