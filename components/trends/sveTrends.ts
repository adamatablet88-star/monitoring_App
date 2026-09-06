import type { SveSystemVisit } from "@/lib/types";
import type { TrendSeries } from "./TrendChart";
import { SERIES_COLORS } from "./TrendChart";

export type SveMetric = "efficiencyPercent" | "vacuumOverall" | "pidAfterConverter";

export const SVE_METRIC_LABELS: Record<SveMetric, string> = {
  efficiencyPercent: "יעילות (%)",
  vacuumOverall: "ואקום כללי",
  pidAfterConverter: "PID אחרי ממיר",
};

export function sveSeriesFor(
  systems: Array<{ id: string; systemLabel: string }>,
  visitsBySystem: Map<string, SveSystemVisit[]>,
  metric: SveMetric,
): TrendSeries[] {
  return systems.map((system, i) => {
    const visits = (visitsBySystem.get(system.id) ?? []).slice().sort((a, b) => a.visitDate.localeCompare(b.visitDate));
    return {
      id: system.id,
      label: system.systemLabel,
      color: SERIES_COLORS[i % SERIES_COLORS.length],
      points: visits.map((v) => ({ date: v.visitDate, value: v[metric] })),
    };
  });
}
