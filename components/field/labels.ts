import type { NotMeasuredReason } from "@/lib/types";

export const NOT_MEASURED_REASON_LABELS: Record<NotMeasuredReason, string> = {
  valve_closed: "שסתום סגור",
  access_blocked: "גישה חסומה",
  equipment_fault: "ציוד תקול",
  other: "אחר",
};
