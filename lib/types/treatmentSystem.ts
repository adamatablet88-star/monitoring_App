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

  /** Tooltip/explanation shown to the technician next to the field. */
  helpText: string;
  /**
   * Deactivate instead of delete — a parameter already used in past
   * measurements must never be removed (spec rule: never delete
   * historical config, only mark inactive). Admin "delete" always
   * flips this to false; ExtraParametersFields hides inactive
   * parameters from the field form but past readings stay intact.
   */
  active: boolean;
  /**
   * True for vacuum-type readings: the technician always enters a
   * positive magnitude, and the value is stored negated (spec 6.5).
   * Generic flag rather than a hardcoded field name, since which
   * parameters are "vacuum" now varies by what an admin has configured.
   */
  invertSign: boolean;

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
