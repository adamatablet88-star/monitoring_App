import type { BioVentingSystemVisit } from "@/lib/types";
import { BIO_VENTING_PARAMETER_KEYS } from "@/lib/defaultParameters";
import type { TrendSeries } from "./TrendChart";
import { SERIES_COLORS } from "./TrendChart";
import { average } from "./timeRange";

export type BioVentingMetric = "o2" | "co2" | "vacuumIntakeLine";

export const BIO_VENTING_METRIC_LABELS: Record<BioVentingMetric, string> = {
  o2: "O2 ממוצע (%)",
  co2: "CO2 ממוצע (%)",
  vacuumIntakeLine: "ואקום קו יניקה",
};

/**
 * A monitoring point can carry several depths — a per-visit trend needs
 * one number, so O2/CO2 are averaged across every depth of every point
 * that visit. A reasonable simplification for a system-level trend line.
 */
function metricValue(visit: BioVentingSystemVisit, metric: BioVentingMetric): number | null {
  if (metric === "vacuumIntakeLine") {
    const key = `${visit.systemId}__${BIO_VENTING_PARAMETER_KEYS.vacuumIntakeLine}`;
    return visit.extraReadings.find((r) => r.parameterId === key)?.value ?? null;
  }
  const readings = visit.monitoringPoints.flatMap((p) => p.depths.map((d) => d[metric]));
  return average(readings);
}

export function bioVentingSeriesFor(
  systems: Array<{ id: string; systemLabel: string }>,
  visitsBySystem: Map<string, BioVentingSystemVisit[]>,
  metric: BioVentingMetric,
): TrendSeries[] {
  return systems.map((system, i) => {
    const visits = (visitsBySystem.get(system.id) ?? []).slice().sort((a, b) => a.visitDate.localeCompare(b.visitDate));
    return {
      id: system.id,
      label: system.systemLabel,
      color: SERIES_COLORS[i % SERIES_COLORS.length],
      points: visits.map((v) => ({ date: v.visitDate, value: metricValue(v, metric) })),
    };
  });
}
