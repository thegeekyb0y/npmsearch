import { getSigilCells, type ProfilePalette } from "@/app/lib/profile-art";

export function ProfileSigil({
  name,
  palette,
}: {
  name: string;
  palette: ProfilePalette;
}) {
  const cells = getSigilCells(name);

  return (
    <svg
      viewBox="0 0 84 84"
      aria-hidden="true"
      className="h-full w-full"
    >
      <rect width="84" height="84" fill="var(--surface-code)" />
      {cells.map((cell) => (
        <rect
          key={`${cell.x}-${cell.y}`}
          x={cell.x * 12 + 1}
          y={cell.y * 12 + 1}
          width="10"
          height="10"
          rx="1.5"
          fill={
            cell.tone === 0
              ? palette.a
              : cell.tone === 1
                ? palette.b
                : "var(--border-strong)"
          }
          opacity={cell.tone === 2 ? 0.4 : 0.9}
        />
      ))}
      <path
        d="M4 10V4h6M80 74v6h-6"
        fill="none"
        stroke="var(--border-strong)"
        strokeWidth="1"
      />
    </svg>
  );
}
