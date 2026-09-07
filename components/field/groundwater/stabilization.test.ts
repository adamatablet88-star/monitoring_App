import { describe, expect, it } from "vitest";
import { isStabilized } from "./stabilization";
import type { StabilizationReading } from "@/lib/types";

function reading(overrides: Partial<StabilizationReading> = {}, sequence = 1): StabilizationReading {
  return { sequence, temp: 20, ph: 7, redox: 100, ec: 500, turbidity: 5, dissolvedOxygen: 3, ...overrides };
}

describe("isStabilized", () => {
  it("requires at least 3 readings", () => {
    expect(isStabilized([reading(), reading()])).toBe(false);
  });

  it("is stabilized when the last 3 readings satisfy every criterion", () => {
    const log = [
      reading({ ph: 7.0, redox: 100, ec: 500, turbidity: 5, dissolvedOxygen: 3.0 }, 1),
      reading({ ph: 7.05, redox: 105, ec: 505, turbidity: 5.2, dissolvedOxygen: 3.1 }, 2),
      reading({ ph: 7.02, redox: 95, ec: 495, turbidity: 4.9, dissolvedOxygen: 2.9 }, 3),
    ];
    expect(isStabilized(log)).toBe(true);
  });

  it("only looks at the last 3 readings — an early unstable reading doesn't block stabilization", () => {
    const log = [
      reading({ ph: 3, redox: -500, ec: 10, turbidity: 100, dissolvedOxygen: 20 }, 1),
      reading({ ph: 7.0, redox: 100, ec: 500, turbidity: 5, dissolvedOxygen: 3.0 }, 2),
      reading({ ph: 7.05, redox: 105, ec: 505, turbidity: 5.2, dissolvedOxygen: 3.1 }, 3),
      reading({ ph: 7.02, redox: 95, ec: 495, turbidity: 4.9, dissolvedOxygen: 2.9 }, 4),
    ];
    expect(isStabilized(log)).toBe(true);
  });

  it("fails when PH swings more than +/-0.1 across the last 3 readings", () => {
    const log = [
      reading({ ph: 7.0 }, 1),
      reading({ ph: 7.05 }, 2),
      reading({ ph: 7.2 }, 3), // spread 0.2 > 0.1
    ];
    expect(isStabilized(log)).toBe(false);
  });

  it("fails when Redox swings more than +/-10mV", () => {
    const log = [reading({ redox: 100 }, 1), reading({ redox: 105 }, 2), reading({ redox: 115 }, 3)];
    expect(isStabilized(log)).toBe(false);
  });

  it("fails when EC swings more than +/-3%", () => {
    const log = [reading({ ec: 500 }, 1), reading({ ec: 510 }, 2), reading({ ec: 520 }, 3)]; // 520 vs 500 is 4%
    expect(isStabilized(log)).toBe(false);
  });

  it("waives the turbidity +/-10% criterion when turbidity is at or below 10 NTU", () => {
    // Turbidity swings wildly but stays under 10 NTU — should not block stabilization.
    const log = [
      reading({ turbidity: 1 }, 1),
      reading({ turbidity: 9 }, 2),
      reading({ turbidity: 3 }, 3),
    ];
    expect(isStabilized(log)).toBe(true);
  });

  it("enforces the turbidity +/-10% criterion once turbidity is above 10 NTU", () => {
    const log = [reading({ turbidity: 20 }, 1), reading({ turbidity: 25 }, 2), reading({ turbidity: 30 }, 3)];
    expect(isStabilized(log)).toBe(false);
  });

  it("fails when dissolved oxygen swings more than +/-0.3 mg/L", () => {
    const log = [
      reading({ dissolvedOxygen: 3.0 }, 1),
      reading({ dissolvedOxygen: 3.2 }, 2),
      reading({ dissolvedOxygen: 3.5 }, 3),
    ];
    expect(isStabilized(log)).toBe(false);
  });
});
