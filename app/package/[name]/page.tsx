import { PackageView } from "@/app/components/package-view";
import { normalizePackageName } from "@/app/lib/registry";

export default async function PackagePage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  return <PackageView name={normalizePackageName(name)} />;
}
