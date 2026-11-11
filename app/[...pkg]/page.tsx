import { notFound } from "next/navigation";
import { PackageView } from "@/app/components/package-view";
import { parsePackagePath } from "@/app/lib/package-path";

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
