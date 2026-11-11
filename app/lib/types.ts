export type PackageLinks = {
  npm: string;
  homepage?: string;
  repository?: string;
};

export type PackageSummary = {
  name: string;
  version: string;
  description?: string;
  links: PackageLinks;
  weeklyDownloads?: number;
  publishedAt?: string;
  exact?: boolean;
  keywords?: string[];
};

export type SearchResults = {
  total: number;
  results: PackageSummary[];
  from: number;
  size: number;
};

export type DownloadPoint = {
  day?: string;
  downloads: number;
};

export type RecentVersion = {
  version: string;
  publishedAt: string;
  tag?: string;
};

export type LatestVersionInfo = {
  license?: string;
  dependencies: Record<string, string>;
  dist?: { unpackedSize?: number };
  engines?: { node?: string };
  keywords: string[];
  type?: string;
  types?: string;
  main?: string;
  module?: string;
};

export type GithubStats = {
  stars?: number;
  forks?: number;
  issues?: number;
  url: string;
};

export type PackageDetail = {
  name: string;
  description?: string;
  readme?: string;
  readmeTruncated: boolean;
  license?: string;
  homepage?: string;
  keywords: string[];
  maintainers: Array<{ name: string; email?: string }>;
  repository?: { url?: string };
  latestVersion: string;
  latestVersionInfo?: LatestVersionInfo;
  recentVersions: RecentVersion[];
  weeklyDownloads?: number;
  downloadTrend: DownloadPoint[];
  downloadRange?: { start?: string; end?: string };
  publishedAt?: string;
  github?: GithubStats;
};

export type MetaItem = {
  label: string;
  value: string;
  hint?: string;
};

export type TabItem = {
  href: string;
  label: string;
  keyHint?: string;
  active?: boolean;
};
