import { describe, expect, it } from "vitest";
import { computeWellVolumeLiters } from "./wellVolume";

describe("computeWellVolumeLiters", () => {
  it("computes the purge volume of a cylindrical water column", () => {
    // 10m well, 4" diameter, water at 6m -> 4m water column.
    // radius = (4 * 0.0254) / 2 = 0.0508 m
    // volume = pi * r^2 * height * 1000 (m^3 -> liters)
    const expected = Math.PI * 0.0508 ** 2 * 4 * 1000;
    expect(computeWellVolumeLiters(10, 4, 6)).toBeCloseTo(expected);
  });

  it("clamps the column height to zero when water is at or below the well bottom", () => {
    expect(computeWellVolumeLiters(10, 4, 10)).toBe(0);
    expect(computeWellVolumeLiters(10, 4, 15)).toBe(0);
  });

  it("scales linearly with column height", () => {
    const shallow = computeWellVolumeLiters(10, 4, 8);
    const deep = computeWellVolumeLiters(10, 4, 6);
    expect(deep).toBeCloseTo(shallow * 2);
  });
});
