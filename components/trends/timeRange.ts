export type TimeRange = "6m" | "1y" | "3y" | "all";

export const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  "6m": "6 חודשים אחרונים",
  "1y": "שנה אחרונה",
  "3y": "3 שנים אחרונות",
  all: "מתחילת המדידות",
};

/** Cutoff date (inclusive) for a range, or null for "all" (no filtering). */
export function cutoffDateFor(range: TimeRange, now: Date = new Date()): string | null {
  if (range === "all") return null;
  const cutoff = new Date(now);
  if (range === "6m") cutoff.setMonth(cutoff.getMonth() - 6);
  if (range === "1y") cutoff.setFullYear(cutoff.getFullYear() - 1);
  if (range === "3y") cutoff.setFullYear(cutoff.getFullYear() - 3);
  return cutoff.toISOString().slice(0, 10);
}

export function filterByRange<T extends { visitDate: string }>(items: T[], range: TimeRange): T[] {
  const cutoff = cutoffDateFor(range);
  if (!cutoff) return items;
  return items.filter((item) => item.visitDate >= cutoff);
}

/** "2026-Q3" style quarter key for a YYYY-MM-DD date string. */
export function quarterKey(visitDate: string): string {
  const [yearStr, monthStr] = visitDate.split("-");
  const quarter = Math.floor((Number(monthStr) - 1) / 3) + 1;
  return `${yearStr}-Q${quarter}`;
}

export function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export interface QuarterlyRow {
  quarter: string;
  /** Average value per series, keyed by series id — null where that series had no reading that quarter. */
  values: Record<string, number | null>;
}

/** Generic per-metric quarterly summary — averages each series' readings within each calendar quarter. */
export function quarterlyAverageTable(series: Array<{ id: string; points: Array<{ date: string; value: number | null }> }>): QuarterlyRow[] {
  const quarters = new Set<string>();
  const bucketed: Record<string, Record<string, number[]>> = {};

  for (const s of series) {
    bucketed[s.id] = {};
    for (const point of s.points) {
      if (point.value === null) continue;
      const q = quarterKey(point.date);
      quarters.add(q);
      (bucketed[s.id][q] ??= []).push(point.value);
    }
  }

  return Array.from(quarters)
    .sort()
    .map((quarter) => ({
      quarter,
      values: Object.fromEntries(series.map((s) => [s.id, average(bucketed[s.id][quarter] ?? [])])),
    }));
}
