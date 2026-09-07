"use client";

import { useState } from "react";
import { ref, update } from "firebase/database";
import type { SystemType, TreatmentSystem } from "@/lib/types";
import { logStructureChange, newId, useCollection } from "@/lib/rtdb-collection";
import { useAuth } from "@/lib/auth-context";
import { getFirebaseDb } from "@/lib/firebase";
import { defaultParametersFor } from "@/lib/defaultParameters";
import { StructureAuditLog } from "./StructureAuditLog";

const CFM_PATTERN = /^\d+\s*CFM$/i;

interface TreatmentSystemsPanelProps {
  siteId: string;
  selectedSystemId: string | null;
  onSelect: (systemId: string) => void;
}

export function TreatmentSystemsPanel({ siteId, selectedSystemId, onSelect }: TreatmentSystemsPanelProps) {
  const { appUser } = useAuth();
  const changedBy = appUser?.username ?? "לא ידוע";
  const { items: allSystems, remove } = useCollection<TreatmentSystem>("treatmentSystems");
  const systems = allSystems.filter((s) => s.siteId === siteId);

  const [showForm, setShowForm] = useState(false);
  const [systemType, setSystemType] = useState<SystemType>("SVE");
  const [systemLabel, setSystemLabel] = useState("");

  const labelValid = systemType === "SVE" ? CFM_PATTERN.test(systemLabel.trim()) : systemLabel.trim().length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!labelValid) return;
    const id = newId();
    const label = systemLabel.trim();
    const system: TreatmentSystem = { id, siteId, systemType, systemLabel: label };
    // System + its suggested default parameters land together — a system
    // is never left momentarily without the readings its type always has.
    const writes: Record<string, unknown> = { [`treatmentSystems/${id}`]: system };
    for (const param of defaultParametersFor(id, systemType, changedBy)) {
      writes[`parameterConfigs/${param.id}`] = param;
    }
    await update(ref(getFirebaseDb()), writes);
    await logStructureChange("treatmentSystem", siteId, `[${systemType}] ${label}`, "created", changedBy);
    setSystemLabel("");
    setShowForm(false);
  }

  async function handleRemove(system: TreatmentSystem) {
    await remove(system);
    await logStructureChange("treatmentSystem", siteId, `[${system.systemType}] ${system.systemLabel}`, "deleted", changedBy);
  }

  return (
    <section className="panel">
      <h2>מערכות טיפול (SVE / Bio-venting)</h2>
      <ul className="entity-list">
        {systems.map((system) => (
          <li key={system.id}>
            <button
              type="button"
              className={system.id === selectedSystemId ? "entity-row selected" : "entity-row"}
              onClick={() => onSelect(system.id)}
            >
              [{system.systemType}] {system.systemLabel}
            </button>
            <button type="button" className="danger-link" onClick={() => handleRemove(system)}>
              מחק
            </button>
          </li>
        ))}
        {systems.length === 0 && <li className="empty-hint">אין עדיין מערכות טיפול באתר זה</li>}
      </ul>

      <StructureAuditLog entityType="treatmentSystem" scopeId={siteId} />

      {showForm ? (
        <form onSubmit={handleSubmit} className="inline-form stacked">
          <label>
            סוג מערכת
            <select
              value={systemType}
              onChange={(e) => {
                setSystemType(e.target.value as SystemType);
                setSystemLabel("");
              }}
            >
              <option value="SVE">SVE</option>
              <option value="bioVenting">Bio-venting</option>
            </select>
          </label>
          <p className="hint">
            {systemType === "SVE"
              ? "מערכת SVE כוללת תמיד ממיר קטליטי (קבוע)."
              : "מערכת Bio-venting אינה כוללת ממיר קטליטי."}
          </p>
          <label>
            {systemType === "SVE" ? "גודל מערכת" : "שם מערכת"}
            <input
              value={systemLabel}
              onChange={(e) => setSystemLabel(e.target.value)}
              placeholder={systemType === "SVE" ? "גודל מערכת, למשל \"300 CFM\"" : "שם המערכת, למשל \"מערכת המלאכה\""}
              required
            />
          </label>
          {systemType === "SVE" && !labelValid && systemLabel.length > 0 && (
            <p className="field-error">פורמט מצופה: מספר ואחריו CFM, למשל &quot;300 CFM&quot;</p>
          )}
          <div>
            <button type="submit" disabled={!labelValid}>
              שמור
            </button>
            <button type="button" onClick={() => setShowForm(false)}>
              ביטול
            </button>
          </div>
        </form>
      ) : (
        <button type="button" onClick={() => setShowForm(true)}>
          + מערכת חדשה
        </button>
      )}
    </section>
  );
}
