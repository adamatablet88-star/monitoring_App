import { describe, expect, it } from "vitest";
import { computeLensThickness } from "./fuelLens";

describe("computeLensThickness", () => {
  it("subtracts product depth from water depth", () => {
    expect(computeLensThickness(3, 2.5)).toBeCloseTo(0.5);
  });

  it("returns null when water depth is missing", () => {
    expect(computeLensThickness(null, 2.5)).toBeNull();
  });

  it("returns null when product depth is missing", () => {
    expect(computeLensThickness(3, null)).toBeNull();
  });

  it("returns null when both are missing", () => {
    expect(computeLensThickness(null, null)).toBeNull();
  });

  it("can be negative when the product reading sits below the water reading", () => {
    expect(computeLensThickness(2, 3)).toBe(-1);
  });
});
