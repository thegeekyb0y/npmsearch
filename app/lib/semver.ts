type Version = { major: number; minor: number; patch: number };

type Comparator = {
  op: "gt" | "gte" | "lt" | "lte" | "eq";
  version: Version;
};

export type RangeMatch = "yes" | "no" | "unknown";

function parsePartial(
  input: string,
): { version: Version; parts: number } | null {
  const cleaned = input
    .trim()
    .replace(/^[=v]\s*/i, "")
    .split(/[-+]/)[0];
  const parts = cleaned.split(".");

  if (parts.length === 0 || parts.length > 3) return null;

  const numbers: number[] = [];

  for (const part of parts) {
    if (!/^\d+$/.test(part)) return null;
    numbers.push(Number(part));
  }

  return {
    version: {
      major: numbers[0],
      minor: numbers[1] ?? 0,
      patch: numbers[2] ?? 0,
    },
    parts: numbers.length,
  };
}

export function parseVersion(input: string): Version | null {
  return parsePartial(input)?.version ?? null;
}

function compareParsed(left: Version, right: Version): number {
  if (left.major !== right.major) return left.major - right.major;
  if (left.minor !== right.minor) return left.minor - right.minor;
  return left.patch - right.patch;
}

export function compareVersions(left: string, right: string): number | null {
  const a = parseVersion(left);
  const b = parseVersion(right);
  if (!a || !b) return null;
  return compareParsed(a, b);
}

function expandWildcard(token: string): string | null {
  const lower = token.trim().toLowerCase();

  if (lower === "x" || lower === "*") return "*";

  const match = /^(\d+)(?:\.(\d+|x|\*))?(?:\.(\d+|x|\*))?$/.exec(lower);
  if (!match) return null;

  const [, major, minor, patch] = match;
  if (minor === undefined || minor === "x" || minor === "*") return major;
  if (patch === undefined || patch === "x" || patch === "*") {
    return `${major}.${minor}`;
  }

  return `${major}.${minor}.${patch}`;
}

function caretUpper(version: Version): Version {
  if (version.major > 0) {
    return { major: version.major + 1, minor: 0, patch: 0 };
  }
  if (version.minor > 0) {
    return { major: 0, minor: version.minor + 1, patch: 0 };
  }
  return { major: 0, minor: 0, patch: version.patch + 1 };
}

function buildComparators(token: string): Comparator[] | null {
  const match = /^(\^|~|>=|<=|>|<|=)?\s*(.+)$/.exec(token.trim());
  if (!match) return null;

  const [, operator, rawVersion] = match;
  const wildcard = expandWildcard(rawVersion);
  if (!wildcard) return null;
  if (wildcard === "*") return [];

  const parsed = parsePartial(wildcard);
  if (!parsed) return null;

  const { version, parts } = parsed;

  if (operator === "^") {
    return [
      { op: "gte", version },
      { op: "lt", version: caretUpper(version) },
    ];
  }

  if (operator === "~") {
    const upper: Version =
      parts >= 2
        ? { major: version.major, minor: version.minor + 1, patch: 0 }
        : { major: version.major + 1, minor: 0, patch: 0 };

    return [
      { op: "gte", version },
      { op: "lt", version: upper },
    ];
  }

  if (operator === ">") return [{ op: "gt", version }];
  if (operator === ">=") return [{ op: "gte", version }];
  if (operator === "<") return [{ op: "lt", version }];
  if (operator === "<=") return [{ op: "lte", version }];

  if (parts === 3) return [{ op: "eq", version }];

  // npm treats partial versions such as `1.2` as a range inside that line.
  const upper: Version =
    parts === 2
      ? { major: version.major, minor: version.minor + 1, patch: 0 }
      : { major: version.major + 1, minor: 0, patch: 0 };

  return [
    { op: "gte", version },
    { op: "lt", version: upper },
  ];
}

function parseAlternative(input: string): Comparator[] | null {
  const text = input
    .trim()
    .toLowerCase()
    .replace(/(\^|~|>=|<=|>|<|=)\s+/g, "$1");

  if (!text || text === "*" || text === "x" || text === "latest") {
    return [];
  }

  const hyphen = /^(\S+)\s+-\s+(\S+)$/.exec(text);
  if (hyphen) {
    const lower = parsePartial(expandWildcard(hyphen[1]) ?? hyphen[1]);
    const upper = expandWildcard(hyphen[2]);
    const parsedUpper = upper && upper !== "*" ? parsePartial(upper) : null;

    if (!lower) return null;

    const comparators: Comparator[] = [
      { op: "gte", version: lower.version },
    ];

    if (parsedUpper) {
      comparators.push({ op: "lte", version: parsedUpper.version });
    }

    return comparators;
  }

  const comparators: Comparator[] = [];

  for (const token of text.split(/\s+/)) {
    const built = buildComparators(token);
    if (!built) return null;
    comparators.push(...built);
  }

  return comparators;
}

function testComparator(comparator: Comparator, version: Version): boolean {
  const result = compareParsed(version, comparator.version);

  switch (comparator.op) {
    case "gt":
      return result > 0;
    case "gte":
      return result >= 0;
    case "lt":
      return result < 0;
    case "lte":
      return result <= 0;
    case "eq":
      return result === 0;
  }
}

export function matchesRange(range: string, version: string): RangeMatch {
  if (!range.trim()) return "unknown";

  const target = parseVersion(version);
  if (!target) return "unknown";

  let parsedAny = false;

  for (const alternative of range.split("||")) {
    const comparators = parseAlternative(alternative);
    if (comparators === null) continue;

    parsedAny = true;

    if (comparators.every((comparator) => testComparator(comparator, target))) {
      return "yes";
    }
  }

  return parsedAny ? "no" : "unknown";
}

function lowestMentionedVersion(range: string): Version | null {
  let lowest: Version | null = null;

  for (const token of range.split(/\s+/)) {
    const cleaned = token.replace(/^[\^~><=]+/, "");
    if (!/^\d/.test(cleaned)) continue;

    const parsed = parsePartial(expandWildcard(cleaned) ?? cleaned);
    if (!parsed) continue;

    if (!lowest || compareParsed(parsed.version, lowest) < 0) {
      lowest = parsed.version;
    }
  }

  return lowest;
}

/**
 * A dependency is outdated when the published latest version is newer than
 * the declared range and falls outside of what that range allows.
 */
export function isOutdated(range: string, latestVersion: string): boolean {
  const latest = parseVersion(latestVersion);
  if (!latest) return false;

  if (matchesRange(range, latestVersion) !== "no") return false;

  const lowest = lowestMentionedVersion(range);
  if (!lowest) return false;

  return compareParsed(latest, lowest) > 0;
}
