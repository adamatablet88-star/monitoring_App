/**
 * Canonical set of monitoring frequencies — a closed set (not free text)
 * so "what's due this month" can compute a due date instead of parsing a
 * Hebrew string. Ported from field-monitoring-app/packages/shared/src/frequency.ts.
 */
export type FrequencyValue = "monthly" | "quarterly" | "semiannual" | "annual";

export const FREQUENCY_DAYS: Record<FrequencyValue, number> = {
  monthly: 30,
  quarterly: 91,
  semiannual: 182,
  annual: 365,
};

export const FREQUENCY_LABELS: Record<FrequencyValue, string> = {
  monthly: "חודשי",
  quarterly: "רבעוני",
  semiannual: "חצי שנתי",
  annual: "שנתי",
};
