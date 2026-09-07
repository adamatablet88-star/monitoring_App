import type { SveSystemVisit } from "@/lib/types";
import { SVE_PARAMETER_KEYS } from "@/lib/defaultParameters";
import type { TrendSeries } from "./TrendChart";
import { SERIES_COLORS } from "./TrendChart";

export type SveMetric = "efficiencyPercent" | "vacuumOverall" | "pidAfterConverter";

export const SVE_METRIC_LABELS: Record<SveMetric, string> = {
  efficiencyPercent: "יעילות (%)",
  vacuumOverall: "ואקום כללי",
  pidAfterConverter: "PID אחרי ממיר",
};

/**
 * vacuumOverall and pidAfterConverter live in extraReadings now (seeded
 * default parameters, see lib/defaultParameters.ts) — only
 * efficiencyPercent is still a fixed field on SveSystemVisit.
 */
function metricValue(visit: SveSystemVisit, metric: SveMetric): number | null {
  if (metric === "efficiencyPercent") return visit.efficiencyPercent;
  const key = metric === "vacuumOverall" ? SVE_PARAMETER_KEYS.vacuumManifold : SVE_PARAMETER_KEYS.pidAfterConverter;
  return visit.extraReadings.find((r) => r.parameterId === `${visit.systemId}__${key}`)?.value ?? null;
}

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
      points: visits.map((v) => ({ date: v.visitDate, value: metricValue(v, metric) })),
    };
  });
}
