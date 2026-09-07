import { describe, expect, it } from "vitest";
import { isOutOfRange, toDisplayValue, toStorageValue } from "./parameterMath";

describe("toStorageValue / toDisplayValue (invertSign convention)", () => {
  it("negates a positive typed value for invertSign parameters", () => {
    expect(toStorageValue(5, true)).toBe(-5);
  });

  it("negates the absolute value even if the technician types a negative number", () => {
    expect(toStorageValue(-5, true)).toBe(-5);
  });

  it("leaves the value unchanged for non-invertSign parameters", () => {
    expect(toStorageValue(5, false)).toBe(5);
    expect(toStorageValue(-5, false)).toBe(-5);
  });

  it("displays a stored negative value as a positive magnitude for invertSign parameters", () => {
    expect(toDisplayValue(-5, true)).toBe(5);
  });

  it("round-trips through storage and back to the same display value", () => {
    const typed = 3.7;
    expect(toDisplayValue(toStorageValue(typed, true), true)).toBeCloseTo(typed);
  });

  it("leaves the value unchanged for non-invertSign display", () => {
    expect(toDisplayValue(-5, false)).toBe(-5);
  });
});

describe("isOutOfRange", () => {
  it("flags a value below the minimum", () => {
    expect(isOutOfRange(1, 5, 10)).toBe(true);
  });

  it("flags a value above the maximum", () => {
    expect(isOutOfRange(15, 5, 10)).toBe(true);
  });

  it("does not flag a value within range", () => {
    expect(isOutOfRange(7, 5, 10)).toBe(false);
  });

  it("does not flag boundary values", () => {
    expect(isOutOfRange(5, 5, 10)).toBe(false);
    expect(isOutOfRange(10, 5, 10)).toBe(false);
  });

  it("ignores a null bound", () => {
    expect(isOutOfRange(-1000, null, 10)).toBe(false);
    expect(isOutOfRange(1000, 5, null)).toBe(false);
    expect(isOutOfRange(0, null, null)).toBe(false);
  });
});
