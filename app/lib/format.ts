export function formatDownloads(num?: number) {
  if (typeof num !== "number" || Number.isNaN(num)) return "Downloads unavailable";
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M / wk`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K / wk`;
  return `${num} / wk`;
}

export function formatBytes(value?: number) {
  if (!value) return "Unknown";
  if (value >= 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  if (value >= 1024) return `${(value / 1024).toFixed(1)} kB`;
  return `${value} B`;
}

export function formatCompactNumber(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) return "Unknown";
  return new Intl.NumberFormat("en-US", { notation: "compact" }).format(value);
}

export function formatDate(value?: string) {
  if (!value) return "Unknown";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function formatRangeLabel(start?: string, end?: string) {
  if (!start || !end) return "Last 7 days";
  return `${formatDate(start)} to ${formatDate(end)}`;
}

export function normalizeRepositoryUrl(url?: string) {
  if (!url) return undefined;
  return url.replace(/^git\+/, "").replace(/\.git$/, "");
}
