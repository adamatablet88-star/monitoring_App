"use client";

import { useState } from "react";
import type { BioVentingSystemVisit, ParameterReading, TreatmentSystem, TreatmentWell } from "@/lib/types";
import { ConflictError, saveWithConflictCheck, useCollection } from "@/lib/rtdb-collection";
import { useAuth } from "@/lib/auth-context";
import { ExtraParametersFields } from "../ExtraParametersFields";
import { computeFieldHistory } from "../fieldHistory";
import { FieldHistoryHint } from "../FieldHistoryHint";
import { MonitoringPointFields, type MonitoringPointDraft } from "./MonitoringPointFields";

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

interface BioVentingVisitFormProps {
  system: TreatmentSystem;
  onDone: () => void;
}

export function BioVentingVisitForm({ system, onDone }: BioVentingVisitFormProps) {
  const { firebaseUser } = useAuth();
  const { items: visits } = useCollection<BioVentingSystemVisit>("bioVentingSystemVisits");
  const { items: allTreatmentWells } = useCollection<TreatmentWell>("treatmentWells");
  const wells = allTreatmentWells.filter((w) => w.systemId === system.id);

  const today = todayString();
  const existingVisit = visits.find((v) => v.systemId === system.id && v.visitDate === today) ?? null;
  const previousVisit = visits
    .filter((v) => v.systemId === system.id && v.id !== existingVisit?.id)
    .sort((a, b) => (a.visitDate < b.visitDate ? 1 : -1))[0];

  // Excludes today's own (possibly still-being-edited) visit from its own history.
  const pastVisits = visits.filter((v) => v.systemId === system.id && v.id !== existingVisit?.id);
  const flowOverallHistory = computeFieldHistory(pastVisits, (v) => v.visitDate, (v) => v.flowOverall);
  const pressureOverallHistory = computeFieldHistory(pastVisits, (v) => v.visitDate, (v) => v.pressureOverall);

  // Frozen at mount — what this form actually loaded, for conflict detection on save.
  const [baseUpdatedAt] = useState<number | null>(existingVisit?.updatedAt ?? null);
  const [conflictError, setConflictError] = useState<string | null>(null);

  const [statusOnArrival, setStatusOnArrival] = useState<"working" | "not_working">(existingVisit?.statusOnArrival ?? "working");
  const [filterStatus, setFilterStatus] = useState<"checked_ok" | "cleaned_now" | "recommend_replace">(
    existingVisit?.filterStatus ?? "checked_ok",
  );

  const [flowOverall, setFlowOverall] = useState(existingVisit?.flowOverall?.toString() ?? "");
  const [pressureOverall, setPressureOverall] = useState(existingVisit?.pressureOverall?.toString() ?? "");

  const [wellPercentages, setWellPercentages] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    existingVisit?.wells.forEach((w) => {
      map[w.treatmentWellId] = String(w.openPercent);
    });
    return map;
  });

  const [dilutionValvePercent, setDilutionValvePercent] = useState(existingVisit?.dilutionValvePercent?.toString() ?? "");

  const [oxygenTestDone, setOxygenTestDone] = useState(existingVisit?.annualOxygenTest?.done ?? false);
  const [oxygenTestDate, setOxygenTestDate] = useState(existingVisit?.annualOxygenTest?.date ?? "");
  const [oxygenTestNote, setOxygenTestNote] = useState(existingVisit?.annualOxygenTest?.note ?? "");

  const [extraReadings, setExtraReadings] = useState<ParameterReading[]>(existingVisit?.extraReadings ?? []);
  const [monitoringPoints, setMonitoringPoints] = useState<MonitoringPointDraft[]>(
    existingVisit?.monitoringPoints.map((p) => ({ id: p.id, pointCode: p.pointCode, depths: p.depths })) ?? [],
  );

  function applyUnchangedWells() {
    if (!previousVisit) return;
    const map: Record<string, string> = {};
    previousVisit.wells.forEach((w) => {
      map[w.treatmentWellId] = String(w.openPercent);
    });
    setWellPercentages(map);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!firebaseUser) return;
    setConflictError(null);

    // Date.now() here runs inside a submit handler, not render — the
    // purity rule can't distinguish the two in this shape of code.
    // eslint-disable-next-line react-hooks/purity
    const createdAt = existingVisit?.createdAt ?? Date.now();
    // eslint-disable-next-line react-hooks/purity
    const updatedAt = Date.now();
    const payload: BioVentingSystemVisit = {
      // Deterministic, not random — see FuelLensVisitForm's id comment.
      id: existingVisit?.id ?? `${system.id}_${today}`,
      systemId: system.id,
      visitDate: existingVisit?.visitDate ?? today,
      createdBy: existingVisit?.createdBy ?? firebaseUser.uid,
      createdAt,
      updatedAt,
      statusOnArrival,
      filterStatus,
      flowOverall: Number(flowOverall) || 0,
      pressureOverall: Number(pressureOverall) || 0,
      wells: wells
        .filter((w) => wellPercentages[w.id]?.trim())
        .map((w) => ({ treatmentWellId: w.id, openPercent: Number(wellPercentages[w.id]) })),
      dilutionValvePercent: Number(dilutionValvePercent) || 0,
      annualOxygenTest: oxygenTestDone ? { done: true, date: oxygenTestDate, note: oxygenTestNote.trim() || undefined } : undefined,
      extraReadings,
      monitoringPoints: monitoringPoints
        .filter((p) => p.pointCode.trim())
        .map((p) => ({ id: p.id, pointCode: p.pointCode.trim(), depths: p.depths })),
    };

    try {
      await saveWithConflictCheck("bioVentingSystemVisits", payload, baseUpdatedAt);
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
        ← חזרה לרשימת המערכות
      </button>
      <h2>ביקור Bio-venting — {system.systemLabel}</h2>

      <form onSubmit={handleSubmit} className="inline-form stacked">
        <label>
          מצב בהגעה
          <select value={statusOnArrival} onChange={(e) => setStatusOnArrival(e.target.value as "working" | "not_working")}>
            <option value="working">עובדת</option>
            <option value="not_working">לא עובדת</option>
          </select>
        </label>

        <label>
          מצב פילטר
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}>
            <option value="checked_ok">נבדק ותקין</option>
            <option value="cleaned_now">נוקה כעת</option>
            <option value="recommend_replace">ממליץ להחליף</option>
          </select>
        </label>
        {filterStatus === "recommend_replace" && (
          <p className="hint">דגל למנהל יוצג בממשק הניהול (הצגה בלבד, בדומה ל-SVE).</p>
        )}

        <div className="field-row">
          <label>
            ספיקה כללית
            <input type="number" step="any" value={flowOverall} onChange={(e) => setFlowOverall(e.target.value)} />
            <FieldHistoryHint stats={flowOverallHistory} />
          </label>
          <label>
            לחץ כללי
            <input type="number" step="any" value={pressureOverall} onChange={(e) => setPressureOverall(e.target.value)} />
            <FieldHistoryHint stats={pressureOverallHistory} />
          </label>
        </div>

        {wells.length > 0 && (
          <fieldset>
            <legend>מצב קידוחים — אחוז פתיחה</legend>
            {previousVisit && (
              <button type="button" onClick={applyUnchangedWells}>
                הכל ללא שינוי
              </button>
            )}
            {wells.map((well) => (
              <label key={well.id} className="manifold-row">
                {well.code}
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={wellPercentages[well.id] ?? ""}
                  onChange={(e) => setWellPercentages((prev) => ({ ...prev, [well.id]: e.target.value }))}
                />
                %
              </label>
            ))}
          </fieldset>
        )}

        <label>
          ברז דילול (%)
          <input type="number" min="0" max="100" value={dilutionValvePercent} onChange={(e) => setDilutionValvePercent(e.target.value)} />
        </label>

        <fieldset>
          <legend>מבחן צריכת חמצן שנתי</legend>
          <label className="checkbox-label">
            <input type="checkbox" checked={oxygenTestDone} onChange={(e) => setOxygenTestDone(e.target.checked)} />
            בוצע
          </label>
          {oxygenTestDone && (
            <>
              <label>
                תאריך
                <input type="date" value={oxygenTestDate} onChange={(e) => setOxygenTestDate(e.target.value)} />
              </label>
              <label>
                הערה
                <input value={oxygenTestNote} onChange={(e) => setOxygenTestNote(e.target.value)} />
              </label>
            </>
          )}
        </fieldset>

        {/* וואקום בקו היניקה ו-O2/CO2 (ברמת המערכת) נטענים כפרמטרים
            ברירת-מחדל מוגדרים-מראש ומוצגים כאן, לא כשדות קבועים. */}
        <ExtraParametersFields systemId={system.id} readings={extraReadings} onChange={setExtraReadings} pastVisits={pastVisits} />

        <MonitoringPointFields points={monitoringPoints} onChange={setMonitoringPoints} />

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
