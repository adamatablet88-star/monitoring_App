"use client";

import { useState } from "react";
import type { GroundwaterVisit, GroundwaterWell, StabilizationReading } from "@/lib/types";
import { ConflictError, saveWithConflictCheck } from "@/lib/rtdb-collection";
import { useAuth } from "@/lib/auth-context";
import { computeWellVolumeLiters } from "@/lib/wellVolume";
import { isStabilized } from "./stabilization";
import { COMMON_LAB_TESTS, containerFor } from "./labTests";

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

function emptyReading(sequence: number): StabilizationReading {
  return { sequence, temp: 0, ph: 0, redox: 0, ec: 0, turbidity: 0, dissolvedOxygen: 0 };
}

interface GroundwaterVisitFormProps {
  well: GroundwaterWell;
  existingVisit: GroundwaterVisit | null;
  onDone: () => void;
}

export function GroundwaterVisitForm({ well, existingVisit, onDone }: GroundwaterVisitFormProps) {
  const { firebaseUser } = useAuth();
  // Frozen at mount — what this form actually loaded, for conflict detection on save.
  const [baseUpdatedAt] = useState<number | null>(existingVisit?.updatedAt ?? null);
  const [conflictError, setConflictError] = useState<string | null>(null);

  const [capIntegrity, setCapIntegrity] = useState<"ok" | "not_ok">(existingVisit?.condition.capIntegrity ?? "ok");
  const [casingIntegrity, setCasingIntegrity] = useState<"ok" | "not_ok">(
    existingVisit?.condition.casingIntegrity ?? "ok",
  );

  const [waterDepth, setWaterDepth] = useState(existingVisit?.waterDepth?.toString() ?? "");
  const [productLensPresent, setProductLensPresent] = useState(existingVisit?.productLens?.present ?? false);
  const [productLensThickness, setProductLensThickness] = useState(existingVisit?.productLens?.thickness?.toString() ?? "");

  // null until the technician edits it directly — until then it tracks
  // waterDepth + 1 automatically, computed during render rather than via
  // an effect + setState (see docs on deriving state instead of syncing it).
  const [manualSamplingDepth, setManualSamplingDepth] = useState<string | null>(
    existingVisit ? existingVisit.suggestedSamplingDepth.toString() : null,
  );

  const [stabilizationLog, setStabilizationLog] = useState<StabilizationReading[]>(existingVisit?.stabilizationLog ?? []);

  const [selectedLabTests, setSelectedLabTests] = useState<string[]>(existingVisit?.labTests ?? []);
  const [customLabTest, setCustomLabTest] = useState("");

  const waterDepthNum = waterDepth.trim() ? Number(waterDepth) : null;
  const samplingDepth = manualSamplingDepth ?? (waterDepthNum !== null ? (waterDepthNum + 1).toFixed(2) : "");

  const wellVolumeLiters =
    waterDepthNum !== null ? computeWellVolumeLiters(well.wellDepth, well.wellDiameter, waterDepthNum) : null;

  const stabilized = isStabilized(stabilizationLog);

  function addReading() {
    setStabilizationLog((prev) => [...prev, emptyReading(prev.length + 1)]);
  }
  function updateReading(index: number, patch: Partial<StabilizationReading>) {
    setStabilizationLog((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }
  function removeReading(index: number) {
    setStabilizationLog((prev) => prev.filter((_, i) => i !== index).map((r, i) => ({ ...r, sequence: i + 1 })));
  }

  function toggleCommonTest(test: string) {
    setSelectedLabTests((prev) => (prev.includes(test) ? prev.filter((t) => t !== test) : [...prev, test]));
  }
  function addCustomTest() {
    const trimmed = customLabTest.trim();
    if (!trimmed || selectedLabTests.includes(trimmed)) return;
    setSelectedLabTests((prev) => [...prev, trimmed]);
    setCustomLabTest("");
  }
  function removeTest(test: string) {
    setSelectedLabTests((prev) => prev.filter((t) => t !== test));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!firebaseUser) return;
    setConflictError(null);

    const visitDate = existingVisit?.visitDate ?? todayString();
    // Date.now() here runs inside a submit handler, not render — the
    // purity rule can't distinguish the two in this shape of code.
    // eslint-disable-next-line react-hooks/purity
    const createdAt = existingVisit?.createdAt ?? Date.now();
    // eslint-disable-next-line react-hooks/purity
    const updatedAt = Date.now();
    const payload: GroundwaterVisit = {
      // Deterministic, not random — see FuelLensVisitForm's id comment.
      id: existingVisit?.id ?? `${well.id}_${visitDate}`,
      wellId: well.id,
      visitDate,
      createdBy: existingVisit?.createdBy ?? firebaseUser.uid,
      createdAt,
      updatedAt,
      condition: { capIntegrity, casingIntegrity },
      waterDepth: waterDepthNum ?? 0,
      productLens: productLensPresent ? { present: true, thickness: Number(productLensThickness) || 0 } : undefined,
      wellVolume: wellVolumeLiters ?? 0,
      suggestedSamplingDepth: Number(samplingDepth) || 0,
      stabilizationLog,
      labTests: selectedLabTests,
    };

    try {
      await saveWithConflictCheck("groundwaterVisits", payload, baseUpdatedAt);
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
      <h2>ביקור דיגום מי תהום — {well.code}</h2>

      <form onSubmit={handleSubmit} className="inline-form stacked">
        <fieldset>
          <legend>זהות ומצב קידוח</legend>
          <div className="field-row">
            <label>
              תקינות פקק
              <select value={capIntegrity} onChange={(e) => setCapIntegrity(e.target.value as "ok" | "not_ok")}>
                <option value="ok">תקין</option>
                <option value="not_ok">לא תקין</option>
              </select>
            </label>
            <label>
              תקינות צינור הקידוח
              <select value={casingIntegrity} onChange={(e) => setCasingIntegrity(e.target.value as "ok" | "not_ok")}>
                <option value="ok">תקין</option>
                <option value="not_ok">לא תקין</option>
              </select>
            </label>
          </div>
          <label>
            עומק מי תהום (מ&apos;)
            <input type="number" step="any" value={waterDepth} onChange={(e) => setWaterDepth(e.target.value)} required />
          </label>
          <label className="checkbox-label">
            <input type="checkbox" checked={productLensPresent} onChange={(e) => setProductLensPresent(e.target.checked)} />
            נוכחות עדשת מוצר
          </label>
          {productLensPresent && (
            <label>
              עובי עדשה
              <input
                type="number"
                step="any"
                value={productLensThickness}
                onChange={(e) => setProductLensThickness(e.target.value)}
              />
            </label>
          )}
        </fieldset>

        <fieldset>
          <legend>שדות מחושבים אוטומטית</legend>
          <p className="hint">נפח מים בבאר: {wellVolumeLiters !== null ? `${wellVolumeLiters.toFixed(1)} ליטר` : "—"}</p>
          <label>
            עומק דיגום מוצע (מפלס מים + 1 מ&apos;, ניתן לעריכה)
            <input
              type="number"
              step="any"
              value={samplingDepth}
              onChange={(e) => setManualSamplingDepth(e.target.value)}
            />
          </label>
        </fieldset>

        <fieldset>
          <legend>שאיבה ולוג ייצוב</legend>
          <p className="hint">
            כלל ייצוב: 3 קריאות רצופות בטווח לכל פרמטר (PH ±0.1, Redox ±10mV, EC ±3%, עכירות ±10% מעל 10 NTU, DO
            ±0.3 מ&quot;ג/ל).
          </p>
          {stabilizationLog.map((reading, index) => (
            <div className="field-row stabilization-row" key={index}>
              <span className="sequence-badge">#{reading.sequence}</span>
              <label>
                טמפ&apos;
                <input
                  type="number"
                  step="any"
                  value={reading.temp}
                  onChange={(e) => updateReading(index, { temp: Number(e.target.value) })}
                />
              </label>
              <label>
                PH
                <input
                  type="number"
                  step="any"
                  value={reading.ph}
                  onChange={(e) => updateReading(index, { ph: Number(e.target.value) })}
                />
              </label>
              <label>
                Redox
                <input
                  type="number"
                  step="any"
                  value={reading.redox}
                  onChange={(e) => updateReading(index, { redox: Number(e.target.value) })}
                />
              </label>
              <label>
                EC
                <input
                  type="number"
                  step="any"
                  value={reading.ec}
                  onChange={(e) => updateReading(index, { ec: Number(e.target.value) })}
                />
              </label>
              <label>
                עכירות
                <input
                  type="number"
                  step="any"
                  value={reading.turbidity}
                  onChange={(e) => updateReading(index, { turbidity: Number(e.target.value) })}
                />
              </label>
              <label>
                DO
                <input
                  type="number"
                  step="any"
                  value={reading.dissolvedOxygen}
                  onChange={(e) => updateReading(index, { dissolvedOxygen: Number(e.target.value) })}
                />
              </label>
              <button type="button" className="danger-link" onClick={() => removeReading(index)}>
                הסר
              </button>
            </div>
          ))}
          <button type="button" onClick={addReading}>
            + הוסף קריאה
          </button>
          <p className={stabilized ? "status-badge done" : "status-badge pending"}>
            {stabilized ? "✓ התייצב — ניתן לדגום" : "טרם התייצב"}
          </p>
        </fieldset>

        <fieldset>
          <legend>דגימה למעבדה</legend>
          {COMMON_LAB_TESTS.map((test) => (
            <label key={test} className="checkbox-label">
              <input type="checkbox" checked={selectedLabTests.includes(test)} onChange={() => toggleCommonTest(test)} />
              {test}
            </label>
          ))}
          <div className="field-row">
            <label>
              בדיקה נוספת
              <input value={customLabTest} onChange={(e) => setCustomLabTest(e.target.value)} placeholder="למשל: קוטגניט" />
            </label>
            <button type="button" onClick={addCustomTest}>
              + הוסף
            </button>
          </div>
          {selectedLabTests.length > 0 && (
            <ul className="entity-list">
              {selectedLabTests.map((test) => (
                <li key={test}>
                  <span className="entity-row static">
                    {test} — <span className="hint">{containerFor(test)}</span>
                  </span>
                  <button type="button" className="danger-link" onClick={() => removeTest(test)}>
                    הסר
                  </button>
                </li>
              ))}
            </ul>
          )}
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
