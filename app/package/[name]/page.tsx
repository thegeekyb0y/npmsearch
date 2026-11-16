import { PackageView } from "@/app/components/package-view";
import { normalizePackageName } from "@/app/lib/registry";

// Registry data is refreshed every minute; the rendered page is served from the CDN.
// Must stay a literal: Next requires statically analyzable segment config.
// Kept in sync with PAGE_REVALIDATE_SECONDS by tests/unit/freshness.test.ts.
export const revalidate = 60;
export const dynamicParams = true;

export async function generateStaticParams() {
  // Package pages are generated on demand and cached, never prerendered en masse.
  return [];
}

export default async function PackagePage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  return <PackageView name={normalizePackageName(name)} />;
}
