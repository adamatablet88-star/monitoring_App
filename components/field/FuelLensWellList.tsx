"use client";

import { useState } from "react";
import type { FuelLensVisit, Well } from "@/lib/types";
import { useCollection } from "@/lib/rtdb-collection";
import { FuelLensVisitForm } from "./FuelLensVisitForm";

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

interface FuelLensWellListProps {
  siteId: string;
}

export function FuelLensWellList({ siteId }: FuelLensWellListProps) {
  const { items: allWells } = useCollection<Well>("wells");
  const { items: allVisits } = useCollection<FuelLensVisit>("fuelLensVisits");
  const wells = allWells.filter((w) => w.siteId === siteId);

  const [selectedWellId, setSelectedWellId] = useState<string | null>(null);

  const today = todayString();
  function todaysVisit(wellId: string): FuelLensVisit | null {
    return allVisits.find((v) => v.wellId === wellId && v.visitDate === today) ?? null;
  }

  function goToNextPending() {
    const next = wells.find((w) => !todaysVisit(w.id));
    setSelectedWellId(next ? next.id : null);
  }

  const selectedWell = wells.find((w) => w.id === selectedWellId) ?? null;

  if (selectedWell) {
    return (
      <FuelLensVisitForm
        well={selectedWell}
        existingVisit={todaysVisit(selectedWell.id)}
        onDone={() => setSelectedWellId(null)}
      />
    );
  }

  const pendingCount = wells.filter((w) => !todaysVisit(w.id)).length;

  return (
    <section className="panel">
      <h2>קידוחי עדשת דלק</h2>
      {wells.length > 0 && (
        <p className="hint">
          {pendingCount === 0 ? "כל הקידוחים בוצעו היום." : `נותרו ${pendingCount} קידוחים לביצוע היום.`}
        </p>
      )}
      <ul className="entity-list">
        {wells.map((well) => {
          const visit = todaysVisit(well.id);
          return (
            <li key={well.id}>
              <button type="button" className="entity-row" onClick={() => setSelectedWellId(well.id)}>
                <span className={visit ? "status-badge done" : "status-badge pending"}>
                  {visit ? "✓ בוצע" : "טרם בוצע"}
                </span>{" "}
                {well.code}
              </button>
            </li>
          );
        })}
        {wells.length === 0 && <li className="empty-hint">אין עדיין קידוחי עדשת דלק באתר זה.</li>}
      </ul>
      {pendingCount > 0 && (
        <button type="button" onClick={goToNextPending}>
          הבא →
        </button>
      )}
    </section>
  );
}
