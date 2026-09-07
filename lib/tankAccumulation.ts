import type { FuelLensVisit } from "./types";

export interface TankAccumulation {
  /** Total volume ever removed from the tank — sum of the reading recorded just before each "emptied" event. */
  totalCollected: number;
  /** What's currently sitting in the tank, per the latest reading. */
  currentVolume: number | null;
  /** Date of the latest reading, for display alongside currentVolume. */
  lastReadingDate: string | null;
  readingsCount: number;
}

/**
 * Spec section 8: a shared tank's accumulated volume over time, with a
 * reset whenever it's emptied. `currentVolume` alone (a single visit's
 * snapshot) only ever shows what's sitting in the tank right now — it
 * was never actually summed anywhere into "how much has this tank
 * recovered over its lifetime". `visits` should already be filtered to
 * the wells feeding one shared tank (see FuelLensVisit.tankId).
 */
export function computeTankAccumulation(visits: FuelLensVisit[]): TankAccumulation {
  const readings = visits
    .filter((v) => v.tankReading)
    .slice()
    .sort((a, b) => a.visitDate.localeCompare(b.visitDate));

  let totalCollected = 0;
  let previousVolume: number | null = null;
  for (const visit of readings) {
    const reading = visit.tankReading!;
    if (reading.emptiedSincePrevious && previousVolume !== null) {
      totalCollected += previousVolume;
    }
    previousVolume = reading.currentVolume;
  }

  return {
    totalCollected,
    currentVolume: previousVolume,
    lastReadingDate: readings.length > 0 ? readings[readings.length - 1].visitDate : null,
    readingsCount: readings.length,
  };
}
