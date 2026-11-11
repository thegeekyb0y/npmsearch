import { isValidPackageName, isValidVersion } from "./registry";

const RESERVED = new Set(["api", "package", "search"]);

export type PackagePath = {
  name: string;
  version?: string;
};

/**
 * Parses `/<pkg>` and `/<pkg>@<version>` path segments, including scoped names
 * (`/@scope/name`, `/@scope/name@1.2.3`).
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

  if (RESERVED.has(parts[0].toLowerCase())) return null;

  const versionIndex = joined.lastIndexOf("@");
  const name = versionIndex > 0 ? joined.slice(0, versionIndex) : joined;
  const version = versionIndex > 0 ? joined.slice(versionIndex + 1) : "";

  if (!isValidPackageName(name.toLowerCase())) return null;
  if (version && !isValidVersion(version)) return null;

  return { name, version: version || undefined };
}
