"use client";

import type { FieldHistoryStats } from "./fieldHistory";

interface FieldHistoryHintProps {
  stats: FieldHistoryStats | null;
  /** Pass true only when history was actually looked up for this field (not just omitted). */
  enabled?: boolean;
}

/** Inline "last 6 months" min/max/avg/count/last-date summary shown next to a numeric field. */
export function FieldHistoryHint({ stats, enabled = true }: FieldHistoryHintProps) {
  if (!enabled) return null;
  if (!stats) return <span className="hint">אין מספיק נתונים היסטוריים</span>;
  return (
    <span className="hint">
      6 חודשים אחרונים: מינ&apos; {stats.min.toFixed(1)} · מקס&apos; {stats.max.toFixed(1)} · ממוצע {stats.avg.toFixed(1)} ·{" "}
      {stats.count} מדידות · אחרונה: {stats.lastDate}
    </span>
  );
}
