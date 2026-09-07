import type { WellIdentity } from "./identity";

/** Ported from field-monitoring-app/packages/shared/src/well.ts. */
export type RecoveryMethod = "none" | "passive_skimmer" | "absorbent" | "active_skimmer";

/** A fuel-lens monitoring well, standalone (not under a treatment system). */
export interface Well extends WellIdentity {
  siteId: string;
  /**
   * Field-derived, not admin-set: the technician reports/updates this on
   * every fuel-lens visit (see FuelLensVisit.recoveryMethod), and the form
   * writes the latest value back here as a cache for admin screens/exports
   * that need "current recovery method" without scanning every visit.
   * New wells start at "none" until the first visit is logged.
   */
  recoveryMethod: RecoveryMethod;
  /** Only meaningful when recoveryMethod === "active_skimmer". */
  tankId?: string;
}

/** A shared collection tank fed by an active skimmer, many-to-one from wells. */
export interface Tank {
  id: string;
  siteId: string;
  label: string;
}

/**
 * A standalone groundwater-monitoring well, scoped to a site rather than
 * a treatment system — a site can run a groundwater sampling program
 * independently of whether it also has an SVE/Bio-venting system.
 */
export interface GroundwaterWell extends WellIdentity {
  siteId: string;
}
