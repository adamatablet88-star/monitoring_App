/**
 * Trimmed-down version of the previous project's WellIdentity
 * (packages/shared/src/identity.ts in field-monitoring-app) — same core
 * physical-identity fields for a monitoring point, without the manhole/
 * screen-interval detail, kept basic per this app's current scope.
 */
export interface MonitoringPoint {
  id: string;
  code: string;
  x: number;
  y: number;
  z: number;
  wellDepth: number;
  wellDiameter: number;
}

export type NewMonitoringPoint = Omit<MonitoringPoint, "id">;
