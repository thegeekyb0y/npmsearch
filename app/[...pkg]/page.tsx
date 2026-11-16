import { notFound } from "next/navigation";
import { PackageView } from "@/app/components/package-view";
import { parsePackagePath } from "@/app/lib/package-path";

// Registry data is refreshed every minute; the rendered page is served from the CDN.
// Must stay a literal: Next requires statically analyzable segment config.
// Kept in sync with PAGE_REVALIDATE_SECONDS by tests/unit/freshness.test.ts.
export const revalidate = 60;
export const dynamicParams = true;

export async function generateStaticParams() {
  // Short package paths are generated on demand and cached, never prerendered.
  return [];
}

export default async function ShortPackagePage({
  params,
}: {
  params: Promise<{ pkg: string[] }>;
}) {
  const { pkg } = await params;
  const parsed = parsePackagePath(pkg ?? []);

  if (!parsed) {
    notFound();
  }

  return <PackageView name={parsed.name} version={parsed.version} />;
}
