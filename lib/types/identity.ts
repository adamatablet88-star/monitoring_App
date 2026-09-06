/**
 * Physical identity fields shared by every well, whether it stands alone
 * (fuel lens monitoring) or sits under a treatment system. Fixed at
 * construction time, unchanged between visits.
 *
 * Ported from field-monitoring-app/packages/shared/src/identity.ts.
 */
export interface WellIdentity {
  id: string;
  code: string;
  x: number;
  y: number;
  z: number;
  manhole: {
    material: "concrete" | "iron";
    size: string;
  };
  wellDepth: number;
  wellDiameter: number;
  screenInterval: {
    from: number;
    to: number;
  };
}
