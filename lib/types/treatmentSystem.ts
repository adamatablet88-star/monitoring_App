import type { WellIdentity } from "./identity";

/** Ported from field-monitoring-app/packages/shared/src/treatmentSystem.ts. */
export type SystemType = "SVE" | "bioVenting";
export type CriticalDirection = "none" | "above" | "below";

/**
 * Generic dynamic parameter configuration engine, shared by SVE and
 * Bio-venting systems. Each parameter can carry its own critical-threshold
 * layer beyond the normal soft-warning range — PID > 50ppm after treatment
 * is the default instance of this mechanism, not a hardcoded rule.
 */
export interface ParameterConfig {
  id: string;
  systemId: string;
  label: string;
  unit: string;
  minValue: number | null;
  maxValue: number | null;
  required: boolean;
  order: number;

  criticalDirection: CriticalDirection;
  criticalValue: number | null;
  criticalMessage: string;
}

export interface TreatmentSystem {
  id: string;
  siteId: string;
  systemType: SystemType;
  /**
   * For SVE this is a system-size value like "300 CFM"; for Bio-venting
   * it's a free-form system name. A single text field — only the form/
   * validation differ by systemType.
   */
  systemLabel: string;
}

export type TreatmentWellType = "treatment" | "monitoring" | "groundwater";

/**
 * Wells under a treatment system are not split into separate collections
 * — one shape per system, discriminated by wellType.
 *   treatment   — connected to the manifold/extraction
 *   monitoring  — monitoring well (e.g. from a pilot installation)
 *   groundwater — groundwater monitoring well for impact assessment
 */
export interface TreatmentWell extends WellIdentity {
  systemId: string;
  wellType: TreatmentWellType;
}
