"use client";

import type { FieldHistoryStats } from "./fieldHistory";

interface FieldHistoryHintProps {
  stats: FieldHistoryStats | null;
}

/** Inline "last 6 months" min/max/avg summary shown next to a numeric field. */
export function FieldHistoryHint({ stats }: FieldHistoryHintProps) {
  if (!stats) return null;
  return (
    <span className="hint">
      6 חודשים אחרונים: מינ&apos; {stats.min.toFixed(1)} · מקס&apos; {stats.max.toFixed(1)} · ממוצע {stats.avg.toFixed(1)}
    </span>
  );
}
