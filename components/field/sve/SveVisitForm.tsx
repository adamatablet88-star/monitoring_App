"use client";

import { useState } from "react";
import type { ParameterReading, SveSystemVisit, SveVisitType, SveWellVisit, TreatmentSystem, TreatmentWell } from "@/lib/types";
import { ConflictError, newId, saveWithConflictCheck, useCollection } from "@/lib/rtdb-collection";
import { SVE_PARAMETER_KEYS } from "@/lib/defaultParameters";
import { computeSveEfficiencyPercent } from "@/lib/sveEfficiency";
import { useAuth } from "@/lib/auth-context";
import { ExtraParametersFields } from "../ExtraParametersFields";
import { computeFieldHistory } from "../fieldHistory";
import { FieldHistoryHint } from "../FieldHistoryHint";
import { notMeasuredFieldToDraft, draftToNotMeasuredField } from "../notMeasured";
import { SveWellVisitFields, type SveWellDraft } from "./SveWellVisitFields";

const VISIT_TYPE_LABELS: Record<SveVisitType, string> = {
  small: "טיפול קטן",
  large: "טיפול גדול",
  baseline: "Baseline",
};

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

function wellDraftFromVisit(wellVisit: SveWellVisit | undefined): SveWellDraft {
  return {
    vacuum: notMeasuredFieldToDraft(wellVisit?.vacuum),
    pid: notMeasuredFieldToDraft(wellVisit?.pid),
    waterDepth: notMeasuredFieldToDraft(wellVisit?.waterDepth),
    productDepth: notMeasuredFieldToDraft(wellVisit?.productDepth),
    bottomDepth: notMeasuredFieldToDraft(wellVisit?.bottomDepth),
  };
}

/** PID before/after now live in extraReadings (seeded parameters) — efficiency is still derived from them at save time. */
function readingValue(readings: ParameterReading[], systemId: string, key: string): number | null {
  return readings.find((r) => r.parameterId === `${systemId}__${key}`)?.value ?? null;
}

interface SveVisitFormProps {
  system: TreatmentSystem;
  onDone: () => void;
}

export function SveVisitForm({ system, onDone }: SveVisitFormProps) {
  const { firebaseUser } = useAuth();
  const { items: visits } = useCollection<SveSystemVisit>("sveSystemVisits");
  const { items: allTreatmentWells } = useCollection<TreatmentWell>("treatmentWells");
  const treatmentWells = allTreatmentWells.filter((w) => w.systemId === system.id && w.wellType === "treatment");

  const today = todayString();
  const existingVisit = visits.find((v) => v.systemId === system.id && v.visitDate === today) ?? null;
  const previousVisit = visits
    .filter((v) => v.systemId === system.id && v.id !== existingVisit?.id)
    .sort((a, b) => (a.visitDate < b.visitDate ? 1 : -1))[0];

  // Excludes today's own (possibly still-being-edited) visit from its own history.
  const pastVisits = visits.filter((v) => v.systemId === system.id && v.id !== existingVisit?.id);
  const flowOverallHistory = computeFieldHistory(pastVisits, (v) => v.visitDate, (v) => v.flowOverall);

  // Frozen at mount — what this form actually loaded, for conflict detection on save.
  const [baseUpdatedAt] = useState<number | null>(existingVisit?.updatedAt ?? null);
  const [conflictError, setConflictError] = useState<string | null>(null);

  const [visitType, setVisitType] = useState<SveVisitType>(existingVisit?.visitType ?? "small");
  const [statusOnArrival, setStatusOnArrival] = useState<"running" | "off">(existingVisit?.statusOnArrival ?? "running");
  const [attemptedStartup, setAttemptedStartup] = useState(!!existingVisit?.startupAttempt);
  const [startupSucceeded, setStartupSucceeded] = useState(existingVisit?.startupAttempt?.succeeded ?? false);
  const [startupFaultFlagged, setStartupFaultFlagged] = useState(existingVisit?.startupAttempt?.faultFlagged ?? false);

  const [catalystInlet, setCatalystInlet] = useState(existingVisit?.catalystTemp?.inlet?.toString() ?? "");
  const [catalystInternal, setCatalystInternal] = useState(existingVisit?.catalystTemp?.internal?.toString() ?? "");
  const [catalystOutlet, setCatalystOutlet] = useState(existingVisit?.catalystTemp?.outlet?.toString() ?? "");

  const [manifold, setManifold] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    existingVisit?.manifold.forEach((m) => {
      map[m.treatmentWellId] = String(m.openPercent);
    });
    return map;
  });

  const [flowOverall, setFlowOverall] = useState(existingVisit?.flowOverall?.toString() ?? "");

  const [to15Done, setTo15Done] = useState(existingVisit?.to15?.done ?? false);
  const [to15Date, setTo15Date] = useState(existingVisit?.to15?.date ?? "");
  const [to15Canister, setTo15Canister] = useState(existingVisit?.to15?.canisterNumber ?? "");
  const [to15Time, setTo15Time] = useState(existingVisit?.to15?.sampleTime ?? "");

  const [extraReadings, setExtraReadings] = useState<ParameterReading[]>(existingVisit?.extraReadings ?? []);

  // Only holds drafts the technician has actually edited this session — a
  // well not yet touched falls back (in draftFor, below) to its saved
  // value from existingVisit, computed at render time rather than synced
  // in via an effect. treatmentWells can still arrive after existingVisit
  // (independent RTDB subscriptions), so the fallback must recompute from
  // existingVisit every render, not just once at mount.
  const [wellDrafts, setWellDrafts] = useState<Record<string, SveWellDraft>>({});

  function draftFor(well: TreatmentWell): SveWellDraft {
    return wellDrafts[well.id] ?? wellDraftFromVisit(existingVisit?.wellVisits.find((wv) => wv.treatmentWellId === well.id));
  }

  const pidBeforeNum = readingValue(extraReadings, system.id, SVE_PARAMETER_KEYS.pidBeforeConverter);
  const pidAfterNum = readingValue(extraReadings, system.id, SVE_PARAMETER_KEYS.pidAfterConverter);
  const efficiencyPercent = computeSveEfficiencyPercent(pidBeforeNum, pidAfterNum);

  const showRunningFields = statusOnArrival === "running" || (attemptedStartup && startupSucceeded);
  const showWellForms = visitType === "large" || visitType === "baseline";

  function applyUnchangedManifold() {
    if (!previousVisit) return;
    const map: Record<string, string> = {};
    previousVisit.manifold.forEach((m) => {
      map[m.treatmentWellId] = String(m.openPercent);
    });
    setManifold(map);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!firebaseUser) return;
    setConflictError(null);

    const payload: SveSystemVisit = {
      // Deterministic, not random — see FuelLensVisitForm's id comment.
      id: existingVisit?.id ?? `${system.id}_${today}`,
      systemId: system.id,
      visitDate: existingVisit?.visitDate ?? today,
      createdBy: existingVisit?.createdBy ?? firebaseUser.uid,
      // Date.now() here runs inside a submit handler, not render — the
      // purity rule can't distinguish the two in this shape of code.
      // eslint-disable-next-line react-hooks/purity
      createdAt: existingVisit?.createdAt ?? Date.now(),
      // eslint-disable-next-line react-hooks/purity
      updatedAt: Date.now(),
      visitType,
      statusOnArrival,
      startupAttempt: statusOnArrival === "off" && attemptedStartup ? { succeeded: startupSucceeded, faultFlagged: startupFaultFlagged } : undefined,
      catalystTemp:
        showRunningFields && catalystInlet.trim() && catalystInternal.trim() && catalystOutlet.trim()
          ? { inlet: Number(catalystInlet), internal: Number(catalystInternal), outlet: Number(catalystOutlet) }
          : undefined,
      manifold: treatmentWells
        .filter((w) => manifold[w.id]?.trim())
        .map((w) => ({ treatmentWellId: w.id, openPercent: Number(manifold[w.id]) })),
      flowOverall: Number(flowOverall) || 0,
      efficiencyPercent: efficiencyPercent ?? 0,
      to15: to15Done ? { done: true, date: to15Date, canisterNumber: to15Canister, sampleTime: to15Time } : undefined,
      extraReadings,
      wellVisits: showWellForms
        ? treatmentWells.map((well) => {
            const draft = draftFor(well);
            return {
              id: existingVisit?.wellVisits.find((wv) => wv.treatmentWellId === well.id)?.id ?? newId(),
              treatmentWellId: well.id,
              vacuum: draftToNotMeasuredField(draft.vacuum),
              pid: draftToNotMeasuredField(draft.pid),
              waterDepth: draftToNotMeasuredField(draft.waterDepth),
              productDepth: draftToNotMeasuredField(draft.productDepth),
              bottomDepth: draftToNotMeasuredField(draft.bottomDepth),
            };
          })
        : [],
    };

    try {
      await saveWithConflictCheck("sveSystemVisits", payload, baseUpdatedAt);
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
      <h2>ביקור SVE — {system.systemLabel}</h2>

      <form onSubmit={handleSubmit} className="inline-form stacked">
        <label>
          סוג ביקור
          <select value={visitType} onChange={(e) => setVisitType(e.target.value as SveVisitType)}>
            {(Object.keys(VISIT_TYPE_LABELS) as SveVisitType[]).map((type) => (
              <option key={type} value={type}>
                {VISIT_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </label>

        <label>
          מצב בהגעה
          <select value={statusOnArrival} onChange={(e) => setStatusOnArrival(e.target.value as "running" | "off")}>
            <option value="running">פעלה</option>
            <option value="off">כבויה</option>
          </select>
        </label>

        {statusOnArrival === "off" && (
          <fieldset>
            <legend>ניסיון הפעלה</legend>
            <label className="checkbox-label">
              <input type="checkbox" checked={attemptedStartup} onChange={(e) => setAttemptedStartup(e.target.checked)} />
              נעשה ניסיון הפעלה
            </label>
            {attemptedStartup && (
              <div className="field-row">
                <label className="checkbox-label">
                  <input type="checkbox" checked={startupSucceeded} onChange={(e) => setStartupSucceeded(e.target.checked)} />
                  ההפעלה הצליחה
                </label>
                {!startupSucceeded && (
                  <label className="checkbox-label">
                    <input type="checkbox" checked={startupFaultFlagged} onChange={(e) => setStartupFaultFlagged(e.target.checked)} />
                    סמן כתקול (דגל בממשק בלבד)
                  </label>
                )}
              </div>
            )}
          </fieldset>
        )}

        {showRunningFields && (
          <fieldset>
            <legend>טמפ&apos; קטליסט</legend>
            <div className="field-row">
              <label>
                טמפ&apos; כניסה
                <input type="number" step="any" value={catalystInlet} onChange={(e) => setCatalystInlet(e.target.value)} />
              </label>
              <label>
                טמפ&apos; פנימי
                <input type="number" step="any" value={catalystInternal} onChange={(e) => setCatalystInternal(e.target.value)} />
              </label>
              <label>
                טמפ&apos; יציאה
                <input type="number" step="any" value={catalystOutlet} onChange={(e) => setCatalystOutlet(e.target.value)} />
              </label>
            </div>
          </fieldset>
        )}

        {treatmentWells.length > 0 && (
          <fieldset>
            <legend>סעפת — אחוז פתיחה לכל קידוח טיפול</legend>
            {previousVisit && (
              <button type="button" onClick={applyUnchangedManifold}>
                הכל ללא שינוי
              </button>
            )}
            {treatmentWells.map((well) => (
              <label key={well.id} className="manifold-row">
                {well.code}
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={manifold[well.id] ?? ""}
                  onChange={(e) => setManifold((prev) => ({ ...prev, [well.id]: e.target.value }))}
                />
                %
              </label>
            ))}
          </fieldset>
        )}

        <label>
          ספיקה כללית
          <input type="number" step="any" value={flowOverall} onChange={(e) => setFlowOverall(e.target.value)} />
          <FieldHistoryHint stats={flowOverallHistory} />
        </label>

        <p className="hint">יעילות מחושבת: {efficiencyPercent !== null ? `${efficiencyPercent.toFixed(1)}%` : "—"}</p>

        <fieldset>
          <legend>TO-15</legend>
          <label className="checkbox-label">
            <input type="checkbox" checked={to15Done} onChange={(e) => setTo15Done(e.target.checked)} />
            בוצע בביקור זה
          </label>
          {to15Done && (
            <div className="field-row">
              <label>
                תאריך
                <input type="date" value={to15Date} onChange={(e) => setTo15Date(e.target.value)} />
              </label>
              <label>
                מספר קניסטר
                <input value={to15Canister} onChange={(e) => setTo15Canister(e.target.value)} />
              </label>
              <label>
                שעת דגימה
                <input type="time" value={to15Time} onChange={(e) => setTo15Time(e.target.value)} />
              </label>
            </div>
          )}
        </fieldset>

        {/* וואקום סעפת, וואקום מפריד לחות, VCV, לחץ כניסה לממיר קטליטי,
            PID לפני/אחרי ממיר, ושעות עבודה נמצאים כאן — פרמטרים שנזרעו
            כברירת מחדל למערכת SVE, לא שדות קבועים. ראה lib/defaultParameters.ts. */}
        <ExtraParametersFields systemId={system.id} readings={extraReadings} onChange={setExtraReadings} pastVisits={pastVisits} />

        {showWellForms && treatmentWells.length > 0 && (
          <fieldset>
            <legend>קידוחי טיפול</legend>
            {treatmentWells.map((well) => (
              <SveWellVisitFields
                key={well.id}
                well={well}
                draft={draftFor(well)}
                onChange={(patch) => setWellDrafts((prev) => ({ ...prev, [well.id]: { ...draftFor(well), ...patch } }))}
              />
            ))}
          </fieldset>
        )}

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
