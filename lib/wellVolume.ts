/**
 * Purge-volume calculation for a cylindrical well casing: the volume of
 * the water column above the bottom of the well, in liters. Diameter is
 * given in inches (converted to meters), depths in meters.
 */
export function computeWellVolumeLiters(wellDepth: number, wellDiameterInches: number, waterDepth: number): number {
  const columnHeight = Math.max(0, wellDepth - waterDepth);
  const radiusMeters = (wellDiameterInches * 0.0254) / 2;
  return Math.PI * radiusMeters ** 2 * columnHeight * 1000;
}
