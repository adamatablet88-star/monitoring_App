import type { FrequencyValue } from "@/lib/types";
import { FREQUENCY_DAYS } from "@/lib/types";

export type DueStatus = "overdue" | "near" | "ok" | "never";

/**
 * A site/system counts as "near due" once it has used up this fraction of
 * its required interval — e.g. 80% of the way through a quarterly (91-day)
 * cycle is ~73 days since the last visit. A reasonable judgment call so
 * "what's due this month" has somewhere to flag before something lapses.
 */
const NEAR_THRESHOLD_RATIO = 0.8;

export function computeDueStatus(lastVisitDate: string | null, frequency: FrequencyValue): DueStatus {
  if (!lastVisitDate) return "never";
  const days = FREQUENCY_DAYS[frequency];
  const elapsedDays = (Date.now() - new Date(lastVisitDate).getTime()) / (1000 * 60 * 60 * 24);
  const ratio = elapsedDays / days;
  if (ratio >= 1) return "overdue";
  if (ratio >= NEAR_THRESHOLD_RATIO) return "near";
  return "ok";
}

export const DUE_STATUS_LABELS: Record<DueStatus, string> = {
  overdue: "עבר זמן",
  near: "קרוב לזמן",
  ok: "תקין",
  never: "טרם בוצע ביקור",
};
