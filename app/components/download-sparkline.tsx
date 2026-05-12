type SparklinePoint = {
  day?: string;
  downloads: number;
};

function buildPath(points: SparklinePoint[], width: number, height: number) {
  if (points.length === 0) return "";

  const values = points.map((point) => point.downloads);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(max - min, 1);

  return points
    .map((point, index) => {
      const x = (index / Math.max(points.length - 1, 1)) * width;
      const y = height - ((point.downloads - min) / range) * height;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

export function DownloadSparkline({
  points,
  className = "",
}: {
  points: SparklinePoint[];
  className?: string;
}) {
  const width = 220;
  const height = 56;
  const path = buildPath(points, width, height);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      role="img"
      aria-label="Weekly download trend"
    >
      <defs>
        <linearGradient id="sparkline-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="rgb(245 110 15 / 0.18)" />
          <stop offset="100%" stopColor="rgb(245 110 15 / 0)" />
        </linearGradient>
      </defs>
      <path
        d={`M 0 ${height} ${path ? `${path} L ${width} ${height}` : ""} Z`}
        fill="url(#sparkline-fill)"
      />
      <path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
