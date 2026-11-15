import type { DownloadPoint } from "./types";

export type ProfilePalette = {
  name: string;
  a: string;
  b: string;
};

const PALETTES: ProfilePalette[] = [
  { name: "signal", a: "#5eead4", b: "#7aa2ff" },
  { name: "ember", a: "#ff7a1a", b: "#b6a4ff" },
  { name: "field", a: "#4ade80", b: "#5eead4" },
  { name: "void", a: "#b6a4ff", b: "#7aa2ff" },
  { name: "rust", a: "#ff7a1a", b: "#4ade80" },
];

export function hashString(value: string): number {
  let hash = 0x811c9dc5;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return hash >>> 0;
}

function mulberry32(seed: number) {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function getProfileSeed(name: string): string {
  return hashString(name.toLowerCase())
    .toString(16)
    .toUpperCase()
    .padStart(8, "0")
    .slice(0, 4);
}

export function getProfilePalette(name: string): ProfilePalette {
  const index = hashString(name.toLowerCase()) % PALETTES.length;
  return PALETTES[index] ?? PALETTES[0];
}

export type SigilCell = {
  x: number;
  y: number;
  tone: 0 | 1 | 2;
};

export function getSigilCells(name: string, size = 7): SigilCell[] {
  const half = Math.ceil(size / 2);
  const random = mulberry32(hashString(`sigil:${name.toLowerCase()}`));
  const cells: SigilCell[] = [];

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < half; x += 1) {
      if (random() < 0.42) continue;

      const tone = Math.floor(random() * 3) as 0 | 1 | 2;
      cells.push({ x, y, tone });

      const mirror = size - 1 - x;
      if (mirror !== x) cells.push({ x: mirror, y, tone });
    }
  }

  if (cells.length === 0) {
    const middle = Math.floor(size / 2);
    cells.push({ x: middle, y: middle, tone: 0 });
  }

  return cells;
}

export function getSignalBars(name: string, count = 36): number[] {
  const random = mulberry32(hashString(`bars:${name.toLowerCase()}`));
  return Array.from({ length: count }, () => 3 + Math.floor(random() * 18));
}

export type ArtPackage = {
  name: string;
  weeklyDownloads?: number;
};

export type ConstellationNode = {
  name: string;
  downloads: number;
  x: number;
  y: number;
  r: number;
};

export type ConstellationLink = {
  from: ConstellationNode;
  to: ConstellationNode;
};

export function getConstellation(
  name: string,
  packages: ArtPackage[],
  limit = 12,
): { nodes: ConstellationNode[]; links: ConstellationLink[] } {
  const items = packages.slice(0, limit);

  if (items.length === 0) return { nodes: [], links: [] };

  const seed = hashString(`constellation:${name.toLowerCase()}`);
  const random = mulberry32(seed);
  const maxDownloads = Math.max(
    ...items.map((item) => item.weeklyDownloads ?? 0),
    1,
  );
  const maxLog = Math.log10(maxDownloads + 1) || 1;
  const offset = (seed % 360) * (Math.PI / 180);

  const nodes = items.map((item, index) => {
    const angle = index * 2.399963229728653 + offset;
    const radius =
      Math.sqrt((index + 0.55) / items.length) * 105 +
      (random() - 0.5) * 14;
    const downloads = item.weeklyDownloads ?? 0;

    return {
      name: item.name,
      downloads,
      x: 200 + Math.cos(angle) * radius,
      y: 150 + Math.sin(angle) * radius * 0.7,
      r: 3.5 + (Math.log10(downloads + 1) / maxLog) * 9,
    };
  });

  const links: ConstellationLink[] = [];
  const seen = new Set<string>();

  for (let index = 0; index < nodes.length; index += 1) {
    let nearest = -1;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (let other = 0; other < nodes.length; other += 1) {
      if (other === index) continue;

      const dx = nodes[index].x - nodes[other].x;
      const dy = nodes[index].y - nodes[other].y;
      const distance = dx * dx + dy * dy;

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = other;
      }
    }

    if (nearest < 0) continue;

    const key =
      index < nearest ? `${index}:${nearest}` : `${nearest}:${index}`;
    if (seen.has(key)) continue;

    seen.add(key);
    links.push({ from: nodes[index], to: nodes[nearest] });
  }

  return { nodes, links };
}

export function aggregateTrends(trends: DownloadPoint[][]): DownloadPoint[] {
  const totals = new Map<string, number>();

  for (const trend of trends) {
    for (const point of trend) {
      if (!point.day) continue;
      totals.set(point.day, (totals.get(point.day) ?? 0) + point.downloads);
    }
  }

  return Array.from(totals.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([day, downloads]) => ({ day, downloads }));
}
