import { DownloadChart } from "@/app/components/download-chart";
import { getMaintainerTrend } from "@/app/lib/profiles";
import type { PackageSummary } from "@/app/lib/types";

export async function MaintainerReach({
  name,
  packages,
  accent,
}: {
  name: string;
  packages: PackageSummary[];
  accent: string;
}) {
  const trend = await getMaintainerTrend(name, packages);

  if (!trend) {
    return (
      <p className="m-0 text-[12px] leading-5 text-text-secondary">
        Aggregate download data is unavailable right now.
      </p>
    );
  }

  return (
    <DownloadChart
      points={trend.points}
      weekly={trend.weekly}
      monthly={trend.monthly}
      label="Aggregate download trend"
      accent={accent}
    />
  );
}
