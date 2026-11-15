import { describe, expect, it } from "vitest";
import {
  aggregateTrends,
  getConstellation,
  getProfilePalette,
  getProfileSeed,
  getSigilCells,
  hashString,
} from "../../app/lib/profile-art";

describe("profile art", () => {
  it("generates stable seeds and palettes for a name", () => {
    expect(getProfileSeed("sindresorhus")).toBe(getProfileSeed("SindreSorhus"));
    expect(getProfileSeed("sindresorhus")).toMatch(/^[0-9A-F]{4}$/);
    expect(getProfilePalette("sindresorhus")).toEqual(
      getProfilePalette("SindreSorhus"),
    );
    expect(getProfilePalette("sindresorhus").a).toMatch(/^#[0-9a-f]{6}$/i);
    expect(hashString("a")).not.toBe(hashString("b"));
  });

  it("mirrors every sigil cell across the vertical axis", () => {
    const cells = getSigilCells("sindresorhus");

    expect(cells.length).toBeGreaterThan(0);

    for (const cell of cells) {
      expect(
        cells.some(
          (other) =>
            other.x === 6 - cell.x &&
            other.y === cell.y &&
            other.tone === cell.tone,
        ),
      ).toBe(true);
    }
  });

  it("places constellation nodes inside the viewBox and links them", () => {
    const packages = [
      { name: "chalk", weeklyDownloads: 626_000_000 },
      { name: "strip-ansi", weeklyDownloads: 690_000_000 },
      { name: "onetime", weeklyDownloads: 261_000_000 },
    ];
    const { nodes, links } = getConstellation("sindresorhus", packages);

    expect(nodes).toHaveLength(3);
    expect(links.length).toBeGreaterThan(0);

    for (const node of nodes) {
      expect(node.x).toBeGreaterThan(0);
      expect(node.x).toBeLessThan(400);
      expect(node.y).toBeGreaterThan(0);
      expect(node.y).toBeLessThan(280);
      expect(node.r).toBeGreaterThan(0);
    }
  });

  it("aggregates download trends by day", () => {
    const points = aggregateTrends([
      [
        { day: "2026-11-01", downloads: 10 },
        { day: "2026-11-02", downloads: 20 },
      ],
      [
        { day: "2026-11-01", downloads: 5 },
        { day: "2026-11-03", downloads: 7 },
      ],
    ]);

    expect(points).toEqual([
      { day: "2026-11-01", downloads: 15 },
      { day: "2026-11-02", downloads: 20 },
      { day: "2026-11-03", downloads: 7 },
    ]);
  });
});
