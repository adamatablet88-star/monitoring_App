"use client";

import { useState } from "react";
import type { Tank, Well } from "@/lib/types";
import { newId, useCollection } from "@/lib/rtdb-collection";

interface TanksPanelProps {
  siteId: string;
}

export function TanksPanel({ siteId }: TanksPanelProps) {
  const { items: allTanks, save, remove } = useCollection<Tank>("tanks");
  const { items: allWells } = useCollection<Well>("wells");
  const tanks = allTanks.filter((t) => t.siteId === siteId);
  const wells = allWells.filter((w) => w.siteId === siteId);

  const [showForm, setShowForm] = useState(false);
  const [label, setLabel] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim()) return;
    await save({ id: newId(), siteId, label: label.trim() });
    setLabel("");
    setShowForm(false);
  }

  return (
    <section className="panel">
      <h2>מיכלי איסוף משותפים</h2>
      <p className="hint">שיוך קידוח למיכל נעשה מתוך טופס הקידוח (אמצעי פינוי: סקימר אקטיבי) — לא כאן.</p>
      <ul className="entity-list">
        {tanks.map((tank) => {
          const assignedWells = wells.filter((w) => w.tankId === tank.id);
          return (
            <li key={tank.id}>
              <span className="entity-row static">
                {tank.label}
                {assignedWells.length > 0 && ` · ${assignedWells.map((w) => w.code).join(", ")}`}
              </span>
              <button type="button" className="danger-link" onClick={() => remove(tank)}>
                מחק
              </button>
            </li>
          );
        })}
        {tanks.length === 0 && <li className="empty-hint">אין עדיין מיכלים באתר זה</li>}
      </ul>

      {showForm ? (
        <form onSubmit={handleSubmit} className="inline-form">
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder='למשל "NW-2 + A"' required autoFocus />
          <button type="submit">שמור</button>
          <button type="button" onClick={() => setShowForm(false)}>
            ביטול
          </button>
        </form>
      ) : (
        <button type="button" onClick={() => setShowForm(true)}>
          + מיכל חדש
        </button>
      )}
    </section>
  );
}
