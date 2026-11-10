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
