"use client";

import { useState } from "react";
import type { EvacuationMethod, FuelLensVisit, NotMeasuredReason, Tank, Well } from "@/lib/types";
import { ConflictError, saveWithConflictCheck, useCollection } from "@/lib/rtdb-collection";
import { useAuth } from "@/lib/auth-context";
import { NOT_MEASURED_REASON_LABELS } from "./labels";

const EVACUATION_METHOD_LABELS: Record<EvacuationMethod, string> = {
  skimmer: "סקימר",
  bailer: "ביילר",
  external_pump: "משאבה חיצונית",
  other: "אחר",
};

const SKIMMER_FOUND_LABELS = {
  empty: "ריק",
  fuel_only: "דלק בלבד",
  fuel_and_water: "דלק ומים",
} as const;

const AUTO_SUGGESTED_REASON_LABELS = {
  not_calibrated: "לא מכוון",
  level_below_skimmer: "מפלס ירד מתחת לסקימר",
} as const;

interface EvacuationDraft {
  method: EvacuationMethod;
  liters: string;
}

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

interface FuelLensVisitFormProps {
  well: Well;
  existingVisit: FuelLensVisit | null;
  onDone: () => void;
}

export function FuelLensVisitForm({ well, existingVisit, onDone }: FuelLensVisitFormProps) {
  const { firebaseUser } = useAuth();
  const { items: tanks } = useCollection<Tank>("tanks");
  const tank = well.tankId ? tanks.find((t) => t.id === well.tankId) : null;

  // Frozen at mount — what this form actually loaded, for conflict detection on save.
  const [baseUpdatedAt] = useState<number | null>(existingVisit?.updatedAt ?? null);
  const [conflictError, setConflictError] = useState<string | null>(null);

  const [notMeasuredFlag, setNotMeasuredFlag] = useState(existingVisit?.notMeasured.flag ?? false);
  const [notMeasuredReason, setNotMeasuredReason] = useState<NotMeasuredReason | "">(
    existingVisit?.notMeasured.reason ?? "",
  );
  const [waterDepth, setWaterDepth] = useState(existingVisit?.waterDepth?.toString() ?? "");
  const [productDepth, setProductDepth] = useState(existingVisit?.productDepth?.toString() ?? "");
  const [wellBottomDepth, setWellBottomDepth] = useState(existingVisit?.wellBottomDepth?.toString() ?? "");

  const [skimmerFound, setSkimmerFound] = useState<"" | "empty" | "fuel_only" | "fuel_and_water">(
    existingVisit?.skimmerCheck?.found ?? "",
  );
  const [skimmerFuelAmount, setSkimmerFuelAmount] = useState(existingVisit?.skimmerCheck?.fuelAmount?.toString() ?? "");
  const [skimmerWaterAmount, setSkimmerWaterAmount] = useState(
    existingVisit?.skimmerCheck?.waterAmount?.toString() ?? "",
  );
  const [skimmerAutoSuggestedReason, setSkimmerAutoSuggestedReason] = useState<
    "" | "not_calibrated" | "level_below_skimmer"
  >(existingVisit?.skimmerCheck?.autoSuggestedReason ?? "");
  const [skimmerRecalibrated, setSkimmerRecalibrated] = useState(existingVisit?.skimmerCheck?.recalibrated ?? false);

  const [absorbentCondition, setAbsorbentCondition] = useState(existingVisit?.absorbentCheck?.condition ?? "");
  const [absorbentReplaced, setAbsorbentReplaced] = useState(existingVisit?.absorbentCheck?.replaced ?? false);

  const [tankCurrentVolume, setTankCurrentVolume] = useState(existingVisit?.tankReading?.currentVolume?.toString() ?? "");
  const [tankEmptiedSincePrevious, setTankEmptiedSincePrevious] = useState(
    existingVisit?.tankReading?.emptiedSincePrevious ?? false,
  );

  const [evacuations, setEvacuations] = useState<EvacuationDraft[]>(
    existingVisit?.evacuations.map((e) => ({ method: e.method, liters: String(e.liters) })) ?? [],
  );

  const waterDepthNum = waterDepth.trim() ? Number(waterDepth) : null;
  const productDepthNum = productDepth.trim() ? Number(productDepth) : null;
  const lensThickness =
    !notMeasuredFlag && waterDepthNum !== null && productDepthNum !== null ? waterDepthNum - productDepthNum : null;

  const showAutoSuggestion =
    well.recoveryMethod === "passive_skimmer" && skimmerFound === "empty" && lensThickness !== null && lensThickness > 0;

  function addEvacuation() {
    setEvacuations((prev) => [...prev, { method: "skimmer", liters: "" }]);
  }
  function updateEvacuation(index: number, patch: Partial<EvacuationDraft>) {
    setEvacuations((prev) => prev.map((e, i) => (i === index ? { ...e, ...patch } : e)));
  }
  function removeEvacuation(index: number) {
    setEvacuations((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (notMeasuredFlag && !notMeasuredReason) return;
    if (!firebaseUser) return;
    setConflictError(null);

    const visitDate = existingVisit?.visitDate ?? todayString();
    const payload: FuelLensVisit = {
      // Deterministic, not random: two technicians opening this same
      // well/day independently must collide on the same id, or the
      // conflict check below can't catch a double "create" — each would
      // otherwise get their own random id and both writes would silently
      // succeed as separate, orphaned visits.
      id: existingVisit?.id ?? `${well.id}_${visitDate}`,
      wellId: well.id,
      visitDate,
      createdBy: existingVisit?.createdBy ?? firebaseUser.uid,
      createdAt: existingVisit?.createdAt ?? Date.now(),
      updatedAt: Date.now(),
      waterDepth: notMeasuredFlag ? null : waterDepthNum,
      productDepth: notMeasuredFlag ? null : productDepthNum,
      lensThickness,
      notMeasured: { flag: notMeasuredFlag, reason: notMeasuredFlag ? (notMeasuredReason as NotMeasuredReason) : null },
      wellBottomDepth: wellBottomDepth.trim() ? Number(wellBottomDepth) : undefined,
      evacuations: evacuations.filter((ev) => ev.liters.trim()).map((ev) => ({ method: ev.method, liters: Number(ev.liters) })),
    };

    if (well.recoveryMethod === "passive_skimmer" && skimmerFound) {
      payload.skimmerCheck = {
        found: skimmerFound,
        fuelAmount: skimmerFuelAmount.trim() ? Number(skimmerFuelAmount) : undefined,
        waterAmount: skimmerWaterAmount.trim() ? Number(skimmerWaterAmount) : undefined,
        autoSuggestedReason: skimmerAutoSuggestedReason || undefined,
        recalibrated: skimmerRecalibrated,
      };
    }
    if (well.recoveryMethod === "absorbent") {
      payload.absorbentCheck = { condition: absorbentCondition.trim(), replaced: absorbentReplaced };
    }
    if (well.recoveryMethod === "active_skimmer") {
      payload.tankReading = {
        currentVolume: tankCurrentVolume.trim() ? Number(tankCurrentVolume) : 0,
        emptiedSincePrevious: tankEmptiedSincePrevious,
      };
    }

    try {
      await saveWithConflictCheck("fuelLensVisits", payload, baseUpdatedAt);
      onDone();
    } catch (err) {
      if (err instanceof ConflictError) {
        setConflictError(err.message);
        return;
      }
      throw err;
    }
  }

  return (
    <section className="panel">
      <button type="button" className="back-link" onClick={onDone}>
        ← חזרה לרשימת הקידוחים
      </button>
      <h2>ביקור — {well.code}</h2>

      <form onSubmit={handleSubmit} className="inline-form stacked">
        <label className="checkbox-label">
          <input type="checkbox" checked={notMeasuredFlag} onChange={(e) => setNotMeasuredFlag(e.target.checked)} />
          לא נמדד
        </label>

        {notMeasuredFlag ? (
          <label>
            סיבה
            <select value={notMeasuredReason} onChange={(e) => setNotMeasuredReason(e.target.value as NotMeasuredReason)} required>
              <option value="">— בחר סיבה —</option>
              {(Object.keys(NOT_MEASURED_REASON_LABELS) as NotMeasuredReason[]).map((reason) => (
                <option key={reason} value={reason}>
                  {NOT_MEASURED_REASON_LABELS[reason]}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <>
            <div className="field-row">
              <label>
                עומק מים (מ&apos;)
                <input type="number" step="any" value={waterDepth} onChange={(e) => setWaterDepth(e.target.value)} />
              </label>
              <label>
                עומק מוצר צף (מ&apos;)
                <input type="number" step="any" value={productDepth} onChange={(e) => setProductDepth(e.target.value)} />
              </label>
            </div>
            <p className="hint">עובי עדשה מחושב: {lensThickness !== null ? `${lensThickness.toFixed(2)} מ'` : "—"}</p>
            <label>
              עומק תחתית קידוח (מ&apos;) — נמדד רק מדי פעם
              <input type="number" step="any" value={wellBottomDepth} onChange={(e) => setWellBottomDepth(e.target.value)} />
            </label>
          </>
        )}

        {well.recoveryMethod === "passive_skimmer" && (
          <fieldset>
            <legend>סקימר פאסיבי</legend>
            <label>
              מה נמצא בסקימר
              <select
                value={skimmerFound}
                onChange={(e) => setSkimmerFound(e.target.value as typeof skimmerFound)}
              >
                <option value="">— בחר —</option>
                {(Object.keys(SKIMMER_FOUND_LABELS) as Array<keyof typeof SKIMMER_FOUND_LABELS>).map((key) => (
                  <option key={key} value={key}>
                    {SKIMMER_FOUND_LABELS[key]}
                  </option>
                ))}
              </select>
            </label>
            {(skimmerFound === "fuel_only" || skimmerFound === "fuel_and_water") && (
              <div className="field-row">
                <label>
                  כמות דלק
                  <input type="number" step="any" value={skimmerFuelAmount} onChange={(e) => setSkimmerFuelAmount(e.target.value)} />
                </label>
                {skimmerFound === "fuel_and_water" && (
                  <label>
                    כמות מים
                    <input type="number" step="any" value={skimmerWaterAmount} onChange={(e) => setSkimmerWaterAmount(e.target.value)} />
                  </label>
                )}
              </div>
            )}
            {showAutoSuggestion && (
              <div className="suggestion-box">
                <p>עדשה קיימת והסקימר נמצא ריק — סיבה אפשרית:</p>
                {(Object.keys(AUTO_SUGGESTED_REASON_LABELS) as Array<keyof typeof AUTO_SUGGESTED_REASON_LABELS>).map((key) => (
                  <button
                    type="button"
                    key={key}
                    className={skimmerAutoSuggestedReason === key ? "suggestion-chip selected" : "suggestion-chip"}
                    onClick={() => setSkimmerAutoSuggestedReason(key)}
                  >
                    {AUTO_SUGGESTED_REASON_LABELS[key]}
                  </button>
                ))}
              </div>
            )}
            <label className="checkbox-label">
              <input type="checkbox" checked={skimmerRecalibrated} onChange={(e) => setSkimmerRecalibrated(e.target.checked)} />
              כויל מחדש
            </label>
          </fieldset>
        )}

        {well.recoveryMethod === "absorbent" && (
          <fieldset>
            <legend>סופח</legend>
            <label>
              מצב הסופח
              <input value={absorbentCondition} onChange={(e) => setAbsorbentCondition(e.target.value)} />
            </label>
            <label className="checkbox-label">
              <input type="checkbox" checked={absorbentReplaced} onChange={(e) => setAbsorbentReplaced(e.target.checked)} />
              הוחלף
            </label>
          </fieldset>
        )}

        {well.recoveryMethod === "active_skimmer" && (
          <fieldset>
            <legend>מיכל משותף{tank ? ` — ${tank.label}` : ""}</legend>
            <label>
              נפח נוכחי
              <input type="number" step="any" value={tankCurrentVolume} onChange={(e) => setTankCurrentVolume(e.target.value)} />
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={tankEmptiedSincePrevious}
                onChange={(e) => setTankEmptiedSincePrevious(e.target.checked)}
              />
              המיכל רוקן מאז הביקור הקודם
            </label>
          </fieldset>
        )}

        <fieldset>
          <legend>פינוי דלק (אפס, אחת או יותר)</legend>
          {evacuations.map((ev, index) => (
            <div className="field-row" key={index}>
              <label>
                שיטה
                <select value={ev.method} onChange={(e) => updateEvacuation(index, { method: e.target.value as EvacuationMethod })}>
                  {(Object.keys(EVACUATION_METHOD_LABELS) as EvacuationMethod[]).map((method) => (
                    <option key={method} value={method}>
                      {EVACUATION_METHOD_LABELS[method]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                כמות (ליטר)
                <input type="number" step="any" value={ev.liters} onChange={(e) => updateEvacuation(index, { liters: e.target.value })} />
              </label>
              <button type="button" className="danger-link" onClick={() => removeEvacuation(index)}>
                הסר
              </button>
            </div>
          ))}
          <button type="button" onClick={addEvacuation}>
            + הוסף פינוי
          </button>
        </fieldset>

        {conflictError && <p className="field-error">{conflictError}</p>}
        <div>
          <button type="submit">שמור ביקור</button>
          <button type="button" onClick={onDone}>
            ביטול
          </button>
        </div>
      </form>
    </section>
  );
}
