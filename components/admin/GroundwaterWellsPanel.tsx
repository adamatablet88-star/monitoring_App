"use client";

import { useState } from "react";
import type { GroundwaterWell } from "@/lib/types";
import { newId, useCollection } from "@/lib/rtdb-collection";
import { IdentityFields } from "./IdentityFields";
import { emptyIdentityDraft, draftToIdentity, isIdentityDraftValid, type IdentityDraft } from "./identityForm";

interface GroundwaterWellsPanelProps {
  siteId: string;
}

/** Standalone groundwater-monitoring wells for a site — independent of any treatment system. */
export function GroundwaterWellsPanel({ siteId }: GroundwaterWellsPanelProps) {
  const { items: allWells, save, remove } = useCollection<GroundwaterWell>("groundwaterWells");
  const wells = allWells.filter((w) => w.siteId === siteId);

  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState<IdentityDraft>(emptyIdentityDraft);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isIdentityDraftValid(draft)) return;
    await save({ id: newId(), siteId, ...draftToIdentity(draft) });
    setShowForm(false);
  }

  return (
    <section className="panel">
      <h2>קידוחי ניטור מי תהום</h2>
      <ul className="entity-list">
        {wells.map((well) => (
          <li key={well.id}>
            <span className="entity-row static">{well.code}</span>
            <button type="button" className="danger-link" onClick={() => remove(well)}>
              מחק
            </button>
          </li>
        ))}
        {wells.length === 0 && <li className="empty-hint">אין עדיין קידוחי ניטור מי תהום באתר זה</li>}
      </ul>

      {showForm ? (
        <form onSubmit={handleSubmit} className="inline-form stacked">
          <IdentityFields draft={draft} onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))} />
          <div>
            <button type="submit">שמור</button>
            <button type="button" onClick={() => setShowForm(false)}>
              ביטול
            </button>
          </div>
        </form>
      ) : (
        <button type="button" onClick={() => setShowForm(true)}>
          + קידוח חדש
        </button>
      )}
    </section>
  );
}
