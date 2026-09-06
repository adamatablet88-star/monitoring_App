"use client";

import { useState } from "react";
import type { BioVentingSystemVisit, ParameterReading, TreatmentSystem, TreatmentWell } from "@/lib/types";
import { newId, useCollection } from "@/lib/rtdb-collection";
import { useAuth } from "@/lib/auth-context";
import { ExtraParametersFields } from "../ExtraParametersFields";
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
  const { items: visits, save } = useCollection<BioVentingSystemVisit>("bioVentingSystemVisits");
  const { items: allTreatmentWells } = useCollection<TreatmentWell>("treatmentWells");
  const wells = allTreatmentWells.filter((w) => w.systemId === system.id);

  const today = todayString();
  const existingVisit = visits.find((v) => v.systemId === system.id && v.visitDate === today) ?? null;
  const previousVisit = visits
    .filter((v) => v.systemId === system.id && v.id !== existingVisit?.id)
    .sort((a, b) => (a.visitDate < b.visitDate ? 1 : -1))[0];

  const [statusOnArrival, setStatusOnArrival] = useState<"working" | "not_working">(existingVisit?.statusOnArrival ?? "working");
  const [filterStatus, setFilterStatus] = useState<"checked_ok" | "cleaned_now" | "recommend_replace">(
    existingVisit?.filterStatus ?? "checked_ok",
  );

  const [vacuumIntakeLine, setVacuumIntakeLine] = useState(existingVisit?.vacuumIntakeLine?.toString() ?? "");
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

    // Date.now() here runs inside a submit handler, not render — the
    // purity rule can't distinguish the two in this shape of code.
    // eslint-disable-next-line react-hooks/purity
    const createdAt = existingVisit?.createdAt ?? Date.now();
    const payload: BioVentingSystemVisit = {
      id: existingVisit?.id ?? newId(),
      systemId: system.id,
      visitDate: existingVisit?.visitDate ?? today,
      createdBy: existingVisit?.createdBy ?? firebaseUser.uid,
      createdAt,
      statusOnArrival,
      filterStatus,
      vacuumIntakeLine: -Math.abs(Number(vacuumIntakeLine) || 0),
      flowOverall: Number(flowOverall) || 0,
      pressureOverall: Number(pressureOverall) || 0,
      wells: wells
        .filter((w) => wellPercentages[w.id]?.trim())
        .map((w) => ({ treatmentWellId: w.id, openPercent: Number(wellPercentages[w.id]) })),
      dilutionValvePercent: Number(dilutionValvePercent) || 0,
      annualOxygenTest: oxygenTestDone ? { done: true, date: oxygenTestDate } : undefined,
      extraReadings,
      monitoringPoints: monitoringPoints
        .filter((p) => p.pointCode.trim())
        .map((p) => ({ id: p.id, pointCode: p.pointCode.trim(), depths: p.depths })),
    };

    await save(payload);
    onDone();
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
            וואקום בקו היניקה
            <input type="number" step="any" value={vacuumIntakeLine} onChange={(e) => setVacuumIntakeLine(e.target.value)} />
          </label>
          <label>
            ספיקה כללית
            <input type="number" step="any" value={flowOverall} onChange={(e) => setFlowOverall(e.target.value)} />
          </label>
          <label>
            לחץ כללי
            <input type="number" step="any" value={pressureOverall} onChange={(e) => setPressureOverall(e.target.value)} />
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
            <label>
              תאריך
              <input type="date" value={oxygenTestDate} onChange={(e) => setOxygenTestDate(e.target.value)} />
            </label>
          )}
        </fieldset>

        <ExtraParametersFields systemId={system.id} readings={extraReadings} onChange={setExtraReadings} />

        <MonitoringPointFields points={monitoringPoints} onChange={setMonitoringPoints} />

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
