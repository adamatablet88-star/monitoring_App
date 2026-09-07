import type { FuelLensVisit, Tank, Well } from "@/lib/types";
import { computeTankAccumulation } from "@/lib/tankAccumulation";
import type { TrendSeries } from "./TrendChart";
import { SERIES_COLORS } from "./TrendChart";
import { quarterKey } from "./timeRange";

export type FuelLensMetric = "waterDepth" | "lensThickness" | "ratio";

export const FUEL_LENS_METRIC_LABELS: Record<FuelLensMetric, string> = {
  waterDepth: "עומק מים (מ')",
  lensThickness: "עובי עדשה (מ')",
  ratio: "יחס עדשה/מים",
};

function metricValue(visit: FuelLensVisit, metric: FuelLensMetric): number | null {
  if (metric === "waterDepth") return visit.waterDepth;
  if (metric === "lensThickness") return visit.lensThickness;
  if (visit.waterDepth === null || visit.lensThickness === null || visit.waterDepth === 0) return null;
  return visit.lensThickness / visit.waterDepth;
}

export function fuelLensSeriesFor(
  wells: Array<{ id: string; code: string }>,
  visitsByWell: Map<string, FuelLensVisit[]>,
  metric: FuelLensMetric,
): TrendSeries[] {
  return wells.map((well, i) => {
    const visits = (visitsByWell.get(well.id) ?? []).slice().sort((a, b) => a.visitDate.localeCompare(b.visitDate));
    return {
      id: well.id,
      label: well.code,
      color: SERIES_COLORS[i % SERIES_COLORS.length],
      points: visits.map((v) => ({ date: v.visitDate, value: metricValue(v, metric) })),
    };
  });
}

export interface EvacuationQuarterSummary {
  quarter: string;
  byMethod: Record<string, number>;
  absorbentReplacedCount: number;
}

export interface TankAccumulationRow {
  tankId: string;
  label: string;
  wellCodes: string;
  currentVolume: number | null;
  totalCollected: number;
  readingsCount: number;
}

/** Spec section 8 — shared-tank accumulated volume, site-wide (not scoped to the well comparison selector above). */
export function tankAccumulationRows(tanks: Tank[], wells: Well[], visits: FuelLensVisit[]): TankAccumulationRow[] {
  const rows: TankAccumulationRow[] = [];
  for (const tank of tanks) {
    const tankWells = wells.filter((w) => w.recoveryMethod === "active_skimmer" && w.tankId === tank.id);
    if (tankWells.length === 0) continue;
    const tankWellIds = new Set(tankWells.map((w) => w.id));
    const accumulation = computeTankAccumulation(visits.filter((v) => tankWellIds.has(v.wellId)));
    rows.push({
      tankId: tank.id,
      label: tank.label,
      wellCodes: tankWells.map((w) => w.code).join(", "),
      currentVolume: accumulation.currentVolume,
      totalCollected: accumulation.totalCollected,
      readingsCount: accumulation.readingsCount,
    });
  }
  return rows;
}

/** "כמות שפונתה בפועל לפי שיטה" + "סופחים שהוחלפו". */
export function fuelLensQuarterlySummary(visits: FuelLensVisit[]): EvacuationQuarterSummary[] {
  const byQuarter = new Map<string, EvacuationQuarterSummary>();
  for (const visit of visits) {
    const q = quarterKey(visit.visitDate);
    const summary = byQuarter.get(q) ?? { quarter: q, byMethod: {}, absorbentReplacedCount: 0 };
    for (const ev of visit.evacuations) {
      summary.byMethod[ev.method] = (summary.byMethod[ev.method] ?? 0) + ev.liters;
    }
    if (visit.absorbentCheck?.replaced) summary.absorbentReplacedCount += 1;
    byQuarter.set(q, summary);
  }
  return Array.from(byQuarter.values()).sort((a, b) => a.quarter.localeCompare(b.quarter));
}
