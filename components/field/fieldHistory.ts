/**
 * "הקשר היסטורי" (spec section 4.2): next to every numeric field in the
 * SVE/Bio-venting visit forms, a textual summary of the last 6 months —
 * minimum, maximum, average — so a technician can spot an unusual
 * reading without leaving the form to check the trends dashboard.
 */
export interface FieldHistoryStats {
  min: number;
  max: number;
  avg: number;
  count: number;
  /** visitDate of the most recent measurement within the window. */
  lastDate: string;
}

export function sixMonthsAgoDate(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 6);
  return d.toISOString().slice(0, 10);
}

export function computeFieldHistory<V>(
  visits: V[],
  visitDateOf: (v: V) => string,
  valueOf: (v: V) => number | null | undefined,
  cutoffDate: string = sixMonthsAgoDate(),
): FieldHistoryStats | null {
  const withDates = visits
    .filter((v) => visitDateOf(v) >= cutoffDate)
    .map((v) => ({ date: visitDateOf(v), value: valueOf(v) }))
    .filter((v): v is { date: string; value: number } => typeof v.value === "number" && !Number.isNaN(v.value));

  if (withDates.length === 0) return null;
  const values = withDates.map((v) => v.value);
  return {
    min: Math.min(...values),
    max: Math.max(...values),
    avg: values.reduce((a, b) => a + b, 0) / values.length,
    count: values.length,
    lastDate: withDates.reduce((latest, v) => (v.date > latest ? v.date : latest), withDates[0].date),
  };
}
