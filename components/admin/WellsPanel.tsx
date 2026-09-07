"use client";

import { useState } from "react";
import type { RecoveryMethod, Well, Tank } from "@/lib/types";
import { newId, useCollection } from "@/lib/rtdb-collection";
import { IdentityFields } from "./IdentityFields";
import { emptyIdentityDraft, draftToIdentity, isIdentityDraftValid, type IdentityDraft } from "./identityForm";

const RECOVERY_LABELS: Record<RecoveryMethod, string> = {
  none: "ללא אמצעי",
  passive_skimmer: "סקימר פאסיבי",
  absorbent: "סופח",
  active_skimmer: "סקימר אקטיבי",
};

interface WellsPanelProps {
  siteId: string;
}

export function WellsPanel({ siteId }: WellsPanelProps) {
  const { items: allWells, save, remove } = useCollection<Well>("wells");
  const { items: allTanks } = useCollection<Tank>("tanks");
  const wells = allWells.filter((w) => w.siteId === siteId);
  const tanks = allTanks.filter((t) => t.siteId === siteId);

  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState<IdentityDraft>(emptyIdentityDraft);

  function startCreate() {
    setDraft(emptyIdentityDraft);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isIdentityDraftValid(draft)) return;
    // אמצעי הפינוי אינו נבחר כאן — הטכנאי מדווח/מעדכן אותו בכל ביקור
    // (ראו FuelLensVisitForm), והערך מתחיל ב"ללא אמצעי" עד לביקור הראשון.
    await save({
      id: newId(),
      siteId,
      ...draftToIdentity(draft),
      recoveryMethod: "none",
    });
    setShowForm(false);
  }

  return (
    <section className="panel">
      <h2>קידוחי עדשת דלק</h2>
      <ul className="entity-list">
        {wells.map((well) => (
          <li key={well.id}>
            <span className="entity-row static">
              {well.code} — {RECOVERY_LABELS[well.recoveryMethod]}
              {well.tankId && ` · מיכל: ${tanks.find((t) => t.id === well.tankId)?.label ?? well.tankId}`}
            </span>
            <button type="button" className="danger-link" onClick={() => remove(well)}>
              מחק
            </button>
          </li>
        ))}
        {wells.length === 0 && <li className="empty-hint">אין עדיין קידוחי עדשת דלק באתר זה</li>}
      </ul>

      {showForm ? (
        <form onSubmit={handleSubmit} className="inline-form stacked">
          <IdentityFields draft={draft} onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))} />

          <p className="hint">אמצעי הפינוי ומיכל האיסוף נקבעים בשטח, בדיווח הטכנאי — לא כאן.</p>

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
