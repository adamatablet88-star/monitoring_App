import type { StabilizationReading } from "@/lib/types";

function spread(values: number[]): number {
  return Math.max(...values) - Math.min(...values);
}

function isWithinAbsolute(values: number[], tolerance: number): boolean {
  return spread(values) <= tolerance;
}

function isWithinPercent(values: number[], percentTolerance: number): boolean {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  if (mean === 0) return true;
  return (spread(values) / Math.abs(mean)) * 100 <= percentTolerance;
}

/**
 * Stabilization rule: 3 consecutive readings within criteria for every
 * criterion-bearing parameter. Turbidity's ±10% only applies once
 * turbidity is above 10 NTU; temp has no criterion.
 */
export function isStabilized(log: StabilizationReading[]): boolean {
  if (log.length < 3) return false;
  const last3 = log.slice(-3);

  const phOk = isWithinAbsolute(last3.map((r) => r.ph), 0.1);
  const redoxOk = isWithinAbsolute(last3.map((r) => r.redox), 10);
  const ecOk = isWithinPercent(last3.map((r) => r.ec), 3);
  const turbidityValues = last3.map((r) => r.turbidity);
  const turbidityOk = Math.max(...turbidityValues) <= 10 || isWithinPercent(turbidityValues, 10);
  const doOk = isWithinAbsolute(last3.map((r) => r.dissolvedOxygen), 0.3);

  return phOk && redoxOk && ecOk && turbidityOk && doOk;
}
