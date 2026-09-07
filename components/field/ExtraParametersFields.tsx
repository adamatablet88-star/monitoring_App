"use client";

import type { ParameterConfig, ParameterReading } from "@/lib/types";
import { useCollection } from "@/lib/rtdb-collection";
import { isOutOfRange, toDisplayValue, toStorageValue } from "@/lib/parameterMath";
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
 * Renders every admin-configured, active ParameterConfig for this system —
 * the "add a gauge with no code change" extensibility hatch. Handles the
 * soft-warning range hint, the generic critical-threshold banner, the
 * generic vacuum sign-flip (invertSign: technician always types a positive
 * magnitude, the stored value is negated), and the 6-month historical
 * context. This is also where SVE's fixed vacuum/PID/catalytic-converter
 * fields and Bio-venting's vacuumIntakeLine now live — the spec's
 * suggested defaults, seeded per system, rather than hardcoded form fields.
 */
export function ExtraParametersFields({ systemId, readings, onChange, pastVisits }: ExtraParametersFieldsProps) {
  const { items: allParameters } = useCollection<ParameterConfig>("parameterConfigs");
  const parameters = allParameters
    .filter((p) => p.systemId === systemId && p.active)
    .sort((a, b) => a.order - b.order);

  if (parameters.length === 0) return null;

  function storedValueFor(parameterId: string): number | null {
    const reading = readings.find((r) => r.parameterId === parameterId);
    return reading ? reading.value : null;
  }

  /** What the technician sees/types — sign-flipped back to positive for invertSign parameters. */
  function displayValueFor(param: ParameterConfig): string {
    const stored = storedValueFor(param.id);
    if (stored === null) return "";
    return String(toDisplayValue(stored, param.invertSign));
  }

  function setValue(param: ParameterConfig, raw: string) {
    const rest = readings.filter((r) => r.parameterId !== param.id);
    if (!raw.trim()) {
      onChange(rest);
      return;
    }
    const stored = toStorageValue(Number(raw), param.invertSign);
    const note = readings.find((r) => r.parameterId === param.id)?.note;
    onChange([...rest, { parameterId: param.id, value: stored, note }]);
  }

  function setNote(param: ParameterConfig, note: string) {
    const current = readings.find((r) => r.parameterId === param.id);
    if (!current) return;
    const rest = readings.filter((r) => r.parameterId !== param.id);
    onChange([...rest, { ...current, note: note.trim() || undefined }]);
  }

  /** Most recent past visit that actually carried a reading for this parameter — not just the most recent visit. */
  function previousValueFor(param: ParameterConfig): number | null {
    if (!pastVisits) return null;
    const withReading = pastVisits
      .filter((v) => v.extraReadings.some((r) => r.parameterId === param.id))
      .sort((a, b) => (a.visitDate < b.visitDate ? 1 : -1));
    if (withReading.length === 0) return null;
    const raw = withReading[0].extraReadings.find((r) => r.parameterId === param.id)!.value;
    return toDisplayValue(raw, param.invertSign);
  }

  return (
    <fieldset>
      <legend>פרמטרים נוספים</legend>
      {parameters.map((param) => {
        const stored = storedValueFor(param.id);
        const display = displayValueFor(param);
        const outOfRange = stored !== null && isOutOfRange(stored, param.minValue, param.maxValue);
        const critical = isCriticalTriggered(stored, param);
        // Both compared in display-space (sign-flipped back to positive for
        // invertSign parameters) — stored is in storage-space and would
        // otherwise be compared against the wrong sign for a hypothetical
        // parameter that's both invertSign and monotonicIncreasing.
        const currentDisplay = stored !== null ? toDisplayValue(stored, param.invertSign) : null;
        const previousValue = param.monotonicIncreasing ? previousValueFor(param) : null;
        const decreased = previousValue !== null && currentDisplay !== null && currentDisplay < previousValue;
        const currentNote = readings.find((r) => r.parameterId === param.id)?.note ?? "";
        const history = pastVisits
          ? computeFieldHistory(
              pastVisits,
              (v) => v.visitDate,
              (v) => {
                const value = v.extraReadings.find((r) => r.parameterId === param.id)?.value;
                if (value === undefined) return undefined;
                return toDisplayValue(value, param.invertSign);
              },
            )
          : null;
        return (
          <div key={param.id} className="parameter-reading-row">
            <label>
              {param.label} {param.unit && `(${param.unit})`}
              <input
                type="number"
                step="any"
                value={display}
                onChange={(e) => setValue(param, e.target.value)}
                title={param.helpText || undefined}
              />
            </label>
            {param.helpText && <span className="hint">{param.helpText}</span>}
            {(param.minValue !== null || param.maxValue !== null) && (
              <span className="hint">
                טווח תקין: {param.minValue ?? "—"}–{param.maxValue ?? "—"}
                {outOfRange ? " (חריגה מהטווח)" : ""}
              </span>
            )}
            <FieldHistoryHint stats={history} enabled={pastVisits !== undefined} />
            {critical && <CriticalBanner message={param.criticalMessage} />}
            {decreased && (
              <div className="field-warning">
                <p>הערך ירד לעומת הקריאה הקודמת ({previousValue}) — מד זה אמור להיות מצטבר. נא להסביר:</p>
                <input value={currentNote} onChange={(e) => setNote(param, e.target.value)} placeholder="הסבר לירידה" />
              </div>
            )}
          </div>
        );
      })}
    </fieldset>
  );
}
