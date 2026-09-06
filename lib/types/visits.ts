/** Ported from field-monitoring-app/packages/shared/src/visits.ts. */
export type NotMeasuredReason = "valve_closed" | "access_blocked" | "equipment_fault" | "other";
export type EvacuationMethod = "skimmer" | "bailer" | "external_pump" | "other";

export interface NotMeasuredField<T> {
  value?: T;
  notMeasured?: { flag: boolean; reason: NotMeasuredReason | null };
}

// ---------------------------------------------------------------------------
// Fuel lens monitoring
// ---------------------------------------------------------------------------

export interface FuelLensVisit {
  id: string;
  wellId: string;
  visitDate: string;
  /** Stamped from auth on create — see lib/auth.ts / database.rules.json. */
  createdBy: string;
  createdAt: number;
  /** Bumped on every save; used for optimistic-concurrency conflict detection — see lib/rtdb-collection.ts's saveWithConflictCheck. */
  updatedAt: number;
  waterDepth: number | null;
  productDepth: number | null;
  /** Computed live: waterDepth - productDepth. */
  lensThickness: number | null;
  notMeasured: { flag: boolean; reason: NotMeasuredReason | null };
  wellBottomDepth?: number;

  skimmerCheck?: {
    found: "empty" | "fuel_only" | "fuel_and_water";
    fuelAmount?: number;
    waterAmount?: number;
    /** Suggested when a lens is present and the skimmer was found empty. */
    autoSuggestedReason?: "not_calibrated" | "level_below_skimmer";
    recalibrated: boolean;
  };
  absorbentCheck?: { condition: string; replaced: boolean };

  /** Zero, one, or more evacuation actions per visit. */
  evacuations: Array<{ method: EvacuationMethod; liters: number }>;

  /** Only for active-skimmer wells; tracked at the shared Tank level. */
  tankReading?: {
    currentVolume: number;
    /** Resets the cumulative count whenever set to true. */
    emptiedSincePrevious: boolean;
  };
}

/**
 * One reading against a system's admin-defined ParameterConfig — the
 * extensibility hatch that lets a new gauge be added, critical threshold
 * included, with zero code change.
 */
export interface ParameterReading {
  parameterId: string;
  value: number;
}

// ---------------------------------------------------------------------------
// SVE
// ---------------------------------------------------------------------------

export type SveVisitType = "small" | "large" | "baseline";

/** Only collected during a "large" or "baseline" visit, per treatment-type TreatmentWell. */
export interface SveWellVisit {
  id: string;
  treatmentWellId: string;
  vacuum?: NotMeasuredField<number>;
  pid?: NotMeasuredField<number>;
  waterDepth?: NotMeasuredField<number>;
  productDepth?: NotMeasuredField<number>;
  bottomDepth?: NotMeasuredField<number>;
}

export interface SveSystemVisit {
  id: string;
  systemId: string;
  visitDate: string;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
  visitType: SveVisitType;

  statusOnArrival: "running" | "off";
  /** Fault is a UI flag only — no active alert channel to the admin yet. */
  startupAttempt?: { succeeded: boolean; faultFlagged: boolean };

  operatingHours?: number;
  catalystTemp?: { inlet: number; internal: number; outlet: number };

  /** "All unchanged" pre-fills from the previous visit; technician edits only what changed. */
  manifold: Array<{ treatmentWellId: string; openPercent: number }>;

  vacuumOverall: number;
  flowOverall: number;
  vacuumMoistureSeparator: number;

  /** 1 = atmosphere only, 5 = wells only. */
  vcv: 1 | 2 | 3 | 4 | 5;
  catalyticConverterInlet?: { pressure: number; temp: number };

  pidBeforeConverter: number;
  /** Validated against the generic critical-threshold mechanism (default: above 50). */
  pidAfterConverter: number;
  efficiencyPercent: number;

  to15?: { done: boolean; date: string; canisterNumber: string; sampleTime: string };

  /** Extra admin-configured parameters beyond the fixed fields above. */
  extraReadings: ParameterReading[];

  /** Only populated when visitType is "large" or "baseline". */
  wellVisits: SveWellVisit[];
}

// ---------------------------------------------------------------------------
// Bio-venting
// ---------------------------------------------------------------------------

export interface MonitoringPointDepthReading {
  depth: number;
  o2: number;
  co2: number;
  ch4: number;
  pid: number;
  vacuum: number;
}

/** A monitoring point can have a variable number of depths — flexible per-point config. */
export interface MonitoringPointReading {
  id: string;
  pointCode: string;
  depths: MonitoringPointDepthReading[];
}

export interface BioVentingSystemVisit {
  id: string;
  systemId: string;
  visitDate: string;
  createdBy: string;
  createdAt: number;
  updatedAt: number;

  statusOnArrival: "working" | "not_working";
  /** "recommend_replace" raises an admin-facing flag, display-only, like SVE's fault flag. */
  filterStatus: "checked_ok" | "cleaned_now" | "recommend_replace";

  vacuumIntakeLine: number;
  flowOverall: number;
  pressureOverall: number;

  wells: Array<{ treatmentWellId: string; openPercent: number }>;
  /** Equivalent of SVE's VCV, but expressed as a percentage. */
  dilutionValvePercent: number;

  annualOxygenTest?: { done: boolean; date: string };

  extraReadings: ParameterReading[];
  monitoringPoints: MonitoringPointReading[];
}

// ---------------------------------------------------------------------------
// Groundwater sampling
// ---------------------------------------------------------------------------

export interface WellCondition {
  capIntegrity: "ok" | "not_ok";
  casingIntegrity: "ok" | "not_ok";
}

export interface StabilizationReading {
  sequence: number;
  /** Recorded but has no stabilization criterion of its own. */
  temp: number;
  /** Criterion: +/- 0.1 units. */
  ph: number;
  /** Criterion: +/- 10 mV. */
  redox: number;
  /** Criterion: +/- 3%. */
  ec: number;
  /** Criterion: +/- 10% (when turbidity is above 10 NTU). */
  turbidity: number;
  /** Criterion: +/- 0.3 mg/L. */
  dissolvedOxygen: number;
}

export interface GroundwaterVisit {
  id: string;
  wellId: string;
  visitDate: string;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
  condition: WellCondition;
  waterDepth: number;
  productLens?: { present: boolean; thickness: number };

  /** Computed automatically from well depth and diameter. */
  wellVolume: number;
  /** Default: water level + 1m, manually editable. */
  suggestedSamplingDepth: number;

  /** Stabilization rule: 3 consecutive in-range readings across every criterion-bearing parameter. */
  stabilizationLog: StabilizationReading[];

  /** Chosen per visit, not a fixed list (VOC, metals, TPH, PFAS, anions, ...). */
  labTests: string[];
}
