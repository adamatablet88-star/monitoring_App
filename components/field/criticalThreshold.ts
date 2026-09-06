import type { CriticalDirection } from "@/lib/types";

export interface CriticalThresholdConfig {
  criticalDirection: CriticalDirection;
  criticalValue: number | null;
  criticalMessage: string;
}

/**
 * Generic critical-threshold check, independent of the normal soft-warning
 * range — a caller decides what config to check a value against (an
 * admin-defined ParameterConfig, or a sensible built-in default like
 * PID-after-treatment > 50ppm).
 */
export function isCriticalTriggered(value: number | null, config: CriticalThresholdConfig): boolean {
  if (value === null || config.criticalDirection === "none" || config.criticalValue === null) return false;
  return config.criticalDirection === "above" ? value > config.criticalValue : value < config.criticalValue;
}
