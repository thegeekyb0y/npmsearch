import {
  getConstellation,
  type ConstellationNode,
  type ProfilePalette,
} from "@/app/lib/profile-art";
import type { PackageSummary } from "@/app/lib/types";

function shortName(name: string) {
  return name.length > 16 ? `${name.slice(0, 15)}…` : name;
}

function NodeLabel({ node }: { node: ConstellationNode }) {
  const dx = node.x - 200;
  const dy = node.y - 150;
  const distance = Math.hypot(dx, dy) || 1;
  const offset = node.r + 7;
  const anchor = Math.abs(dx) < 24 ? "middle" : dx > 0 ? "start" : "end";

  return (
    <text
      x={node.x + (dx / distance) * offset}
      y={node.y + (dy / distance) * offset + 2.5}
      textAnchor={anchor}
      fill="var(--text-secondary)"
      stroke="var(--surface)"
      strokeWidth="3"
      paintOrder="stroke"
      fontSize="8.5"
      fontFamily="var(--font-geist-mono)"
    >
      {shortName(node.name)}
    </text>
  );
}

export function PackageConstellation({
  name,
  packages,
  palette,
}: {
  name: string;
  packages: PackageSummary[];
  palette: ProfilePalette;
}) {
  const { nodes, links } = getConstellation(name, packages);

  if (nodes.length === 0) return null;

  return (
    <figure className="m-0">
      <svg
        viewBox="0 0 400 280"
        className="mx-auto h-auto w-full max-w-[520px]"
        role="group"
        aria-label={`Package constellation for ${name}`}
      >
        {[42, 76, 108].map((radius) => (
          <ellipse
            key={radius}
            cx="200"
            cy="150"
            rx={radius}
            ry={radius * 0.7}
            fill="none"
            stroke="var(--border-subtle)"
            strokeOpacity="0.5"
            strokeDasharray="2 5"
          />
        ))}

        {links.map((link, index) => (
          <line
            key={`${link.from.name}-${link.to.name}-${index}`}
            x1={link.from.x}
            y1={link.from.y}
            x2={link.to.x}
            y2={link.to.y}
            stroke="var(--border-strong)"
            strokeOpacity="0.55"
            strokeWidth="0.8"
          />
        ))}

        {nodes.map((node, index) => (
          <a
            key={node.name}
            href={`/package/${encodeURIComponent(node.name)}`}
            className="constellation-node"
            aria-label={`${node.name}: ${node.downloads.toLocaleString("en-US")} weekly downloads`}
          >
            <title>{node.name}</title>
            <circle
              cx={node.x}
              cy={node.y}
              r={node.r + 8}
              fill="transparent"
            />
            <circle
              cx={node.x}
              cy={node.y}
              r={node.r}
              fill={index === 0 ? palette.a : palette.b}
              fillOpacity={index === 0 ? 0.95 : 0.65}
              stroke={index === 0 ? palette.a : "var(--background)"}
              strokeWidth={index === 0 ? 2 : 1}
            />
            {index < 4 ? <NodeLabel node={node} /> : null}
          </a>
        ))}
      </svg>
      <figcaption className="mx-auto mt-2 flex max-w-[520px] flex-wrap items-center justify-between gap-2 font-mono text-[10px] text-text-muted">
        <span>node size = weekly downloads</span>
        <span>select a node to open</span>
      </figcaption>
    </figure>
  );
}
