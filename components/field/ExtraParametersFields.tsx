"use client";

import type { ParameterConfig, ParameterReading } from "@/lib/types";
import { useCollection } from "@/lib/rtdb-collection";
import { isCriticalTriggered } from "./criticalThreshold";
import { CriticalBanner } from "./CriticalBanner";
import { computeFieldHistory } from "./fieldHistory";
import { FieldHistoryHint } from "./FieldHistoryHint";

/** Protocol-agnostic shape shared by SveSystemVisit and BioVentingSystemVisit — just enough to compute history. */
interface VisitWithExtraReadings {
  visitDate: string;
  extraReadings: ParameterReading[];
}

interface ExtraParametersFieldsProps {
  systemId: string;
  readings: ParameterReading[];
  onChange: (readings: ParameterReading[]) => void;
  /** Past visits for this system, for the last-6-months min/max/avg hint. Omit to skip the hint. */
  pastVisits?: VisitWithExtraReadings[];
}

/**
 * Renders every admin-configured ParameterConfig for this system beyond
 * the visit form's fixed fields — the "add a gauge with no code change"
 * extensibility hatch, soft-warning range hint included, critical-threshold
 * banner included, 6-month historical context included.
 */
export function ExtraParametersFields({ systemId, readings, onChange, pastVisits }: ExtraParametersFieldsProps) {
  const { items: allParameters } = useCollection<ParameterConfig>("parameterConfigs");
  const parameters = allParameters.filter((p) => p.systemId === systemId).sort((a, b) => a.order - b.order);

  if (parameters.length === 0) return null;

  function valueFor(parameterId: string): string {
    const reading = readings.find((r) => r.parameterId === parameterId);
    return reading ? String(reading.value) : "";
  }

  function setValue(parameterId: string, raw: string) {
    const rest = readings.filter((r) => r.parameterId !== parameterId);
    onChange(raw.trim() ? [...rest, { parameterId, value: Number(raw) }] : rest);
  }

  return (
    <fieldset>
      <legend>פרמטרים נוספים</legend>
      {parameters.map((param) => {
        const raw = valueFor(param.id);
        const numValue = raw.trim() ? Number(raw) : null;
        const outOfRange =
          numValue !== null &&
          ((param.minValue !== null && numValue < param.minValue) || (param.maxValue !== null && numValue > param.maxValue));
        const critical = isCriticalTriggered(numValue, param);
        const history = pastVisits
          ? computeFieldHistory(
              pastVisits,
              (v) => v.visitDate,
              (v) => v.extraReadings.find((r) => r.parameterId === param.id)?.value,
            )
          : null;
        return (
          <div key={param.id} className="parameter-reading-row">
            <label>
              {param.label} {param.unit && `(${param.unit})`}
              <input type="number" step="any" value={raw} onChange={(e) => setValue(param.id, e.target.value)} />
            </label>
            {(param.minValue !== null || param.maxValue !== null) && (
              <span className="hint">
                טווח תקין: {param.minValue ?? "—"}–{param.maxValue ?? "—"}
                {outOfRange ? " (חריגה מהטווח)" : ""}
              </span>
            )}
            <FieldHistoryHint stats={history} />
            {critical && <CriticalBanner message={param.criticalMessage} />}
          </div>
        );
      })}
    </fieldset>
  );
}
