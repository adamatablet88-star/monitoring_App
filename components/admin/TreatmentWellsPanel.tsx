"use client";

import { useState } from "react";
import type { TreatmentWell, TreatmentWellType } from "@/lib/types";
import { newId, useCollection } from "@/lib/rtdb-collection";
import { IdentityFields } from "./IdentityFields";
import { emptyIdentityDraft, draftToIdentity, isIdentityDraftValid, type IdentityDraft } from "./identityForm";

const WELL_TYPE_LABELS: Record<TreatmentWellType, string> = {
  treatment: "קידוח טיפול",
  monitoring: "קידוח ניטור",
  groundwater: "ניטור מי תהום",
};

interface TreatmentWellsPanelProps {
  systemId: string;
}

export function TreatmentWellsPanel({ systemId }: TreatmentWellsPanelProps) {
  const { items: allWells, save, remove } = useCollection<TreatmentWell>("treatmentWells");
  const wells = allWells.filter((w) => w.systemId === systemId);

  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState<IdentityDraft>(emptyIdentityDraft);
  const [wellType, setWellType] = useState<TreatmentWellType>("treatment");

  function startCreate() {
    setDraft(emptyIdentityDraft);
    setWellType("treatment");
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isIdentityDraftValid(draft)) return;
    await save({ id: newId(), systemId, ...draftToIdentity(draft), wellType });
    setShowForm(false);
  }

  return (
    <section className="panel nested">
      <h3>קידוחים תחת המערכת</h3>
      <p className="hint">טבלה אחודה אחת — מסווגת לפי סוג הקידוח, לא מחולקת לקבוצות נפרדות.</p>
      <ul className="entity-list">
        {wells.map((well) => (
          <li key={well.id}>
            <span className="entity-row static">
              {well.code} — {WELL_TYPE_LABELS[well.wellType]}
            </span>
            <button type="button" className="danger-link" onClick={() => remove(well)}>
              מחק
            </button>
          </li>
        ))}
        {wells.length === 0 && <li className="empty-hint">אין עדיין קידוחים תחת מערכת זו</li>}
      </ul>

      {showForm ? (
        <form onSubmit={handleSubmit} className="inline-form stacked">
          <IdentityFields draft={draft} onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))} />
          <label>
            סוג קידוח
            <select value={wellType} onChange={(e) => setWellType(e.target.value as TreatmentWellType)}>
              {(Object.keys(WELL_TYPE_LABELS) as TreatmentWellType[]).map((type) => (
                <option key={type} value={type}>
                  {WELL_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </label>
          <div>
            <button type="submit">שמור</button>
            <button type="button" onClick={() => setShowForm(false)}>
              ביטול
            </button>
          </div>
        </form>
      ) : (
        <button type="button" onClick={startCreate}>
          + קידוח חדש
        </button>
      )}
    </section>
  );
}
