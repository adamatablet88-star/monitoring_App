import { describe, expect, it } from "vitest";
import { computeTankAccumulation } from "./tankAccumulation";
import type { FuelLensVisit } from "./types";

function visit(visitDate: string, currentVolume: number, emptiedSincePrevious: boolean): FuelLensVisit {
  return {
    id: `v_${visitDate}`,
    wellId: "well1",
    visitDate,
    createdBy: "tech1",
    createdAt: 0,
    updatedAt: 0,
    recoveryMethod: "active_skimmer",
    waterDepth: null,
    productDepth: null,
    lensThickness: null,
    notMeasured: { flag: false, reason: null },
    evacuations: [],
    tankReading: { currentVolume, emptiedSincePrevious },
  };
}

describe("computeTankAccumulation", () => {
  it("sums the reading recorded just before each emptying event", () => {
    const visits = [
      visit("2026-01-01", 40, false),
      visit("2026-02-01", 100, false),
      visit("2026-03-01", 0, true), // emptied -> collects the 100 from the previous reading
      visit("2026-04-01", 60, false),
      visit("2026-05-01", 0, true), // emptied -> collects the 60
      visit("2026-06-01", 20, false), // current level, not yet collected
    ];
    const result = computeTankAccumulation(visits);
    expect(result.totalCollected).toBe(160);
    expect(result.currentVolume).toBe(20);
    expect(result.lastReadingDate).toBe("2026-06-01");
    expect(result.readingsCount).toBe(6);
  });

  it("returns zeroed-out stats when there are no readings", () => {
    const result = computeTankAccumulation([]);
    expect(result).toEqual({ totalCollected: 0, currentVolume: null, lastReadingDate: null, readingsCount: 0 });
  });

  it("ignores visits without a tankReading", () => {
    const withAndWithout = [
      { ...visit("2026-01-01", 10, false), tankReading: undefined },
      visit("2026-02-01", 30, false),
    ];
    const result = computeTankAccumulation(withAndWithout);
    expect(result.readingsCount).toBe(1);
    expect(result.currentVolume).toBe(30);
  });

  it("does not crash and collects nothing when the very first reading is already flagged emptied", () => {
    const result = computeTankAccumulation([visit("2026-01-01", 0, true)]);
    expect(result.totalCollected).toBe(0);
    expect(result.currentVolume).toBe(0);
  });

  it("sorts out-of-order visits by date before accumulating", () => {
    const outOfOrder = [
      visit("2026-03-01", 0, true),
      visit("2026-01-01", 40, false),
      visit("2026-02-01", 100, false),
    ];
    const result = computeTankAccumulation(outOfOrder);
    expect(result.totalCollected).toBe(100);
    expect(result.currentVolume).toBe(0);
  });
});
