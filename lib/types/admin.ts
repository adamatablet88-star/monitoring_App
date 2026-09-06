import type { FrequencyValue } from "./frequency";

/** Ported from field-monitoring-app/packages/shared/src/admin.ts. */
export type FrequencyScope = { siteId: string } | { systemId: string };

export interface FrequencyChangeRecord {
  changedBy: string;
  changedAt: string;
  reason: string;
  previousValue: FrequencyValue;
}

export interface FrequencySetting {
  id: string;
  scope: FrequencyScope;
  defaultFrequency: FrequencyValue;
  currentFrequency: FrequencyValue;
  /** Every change appended here — never overwritten silently (Audit Trail). */
  history: FrequencyChangeRecord[];
}

export interface ActiveStatus {
  id: string;
  scope: FrequencyScope;
  active: boolean;
  /**
   * Who reported this. There's no server to stamp it, so
   * database.rules.json *validates* that this matches the actual role
   * of the authenticated writer instead — never trusted purely from the
   * client's own claim.
   */
  source: "technician" | "admin";
  reason: string;
}

export type RegulatoryReportType = "fuel_lens" | "treatment_systems";
export type RegulatoryReportStatus = "not_started" | "in_progress" | "submitted";

export interface RegulatoryReport {
  id: string;
  siteId: string;
  /** fuel_lens: quarterly. treatment_systems: semi-annual. */
  type: RegulatoryReportType;
  period: string;
  status: RegulatoryReportStatus;
}

export type SpecialTestType = "TO-15" | "annual_oxygen_consumption";
export type SpecialTestFrequency = "quarterly" | "semiannual" | "annual";

export interface ScheduledSpecialTest {
  id: string;
  scope: { systemId: string };
  testType: SpecialTestType;
  frequency: SpecialTestFrequency;
}
