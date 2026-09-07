/** Treatment efficiency: percent reduction in PID reading across the catalytic converter. */
export function computeSveEfficiencyPercent(pidBefore: number | null, pidAfter: number | null): number | null {
  if (pidBefore === null || pidAfter === null || pidBefore <= 0) return null;
  return ((pidBefore - pidAfter) / pidBefore) * 100;
}
