import { describe, expect, it } from "vitest";
import { computeSveEfficiencyPercent } from "./sveEfficiency";

describe("computeSveEfficiencyPercent", () => {
  it("computes percent reduction across the converter", () => {
    expect(computeSveEfficiencyPercent(100, 25)).toBeCloseTo(75);
  });

  it("returns 0% when the converter has no effect", () => {
    expect(computeSveEfficiencyPercent(100, 100)).toBeCloseTo(0);
  });

  it("can be negative when the after-reading is higher than before", () => {
    expect(computeSveEfficiencyPercent(50, 75)).toBeCloseTo(-50);
  });

  it("returns null when either reading is missing", () => {
    expect(computeSveEfficiencyPercent(null, 25)).toBeNull();
    expect(computeSveEfficiencyPercent(100, null)).toBeNull();
  });

  it("returns null when pidBefore is zero or negative (division guard)", () => {
    expect(computeSveEfficiencyPercent(0, 0)).toBeNull();
    expect(computeSveEfficiencyPercent(-5, 0)).toBeNull();
  });
});
