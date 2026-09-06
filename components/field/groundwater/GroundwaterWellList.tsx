"use client";

import { useState } from "react";
import type { GroundwaterVisit, GroundwaterWell } from "@/lib/types";
import { useCollection } from "@/lib/rtdb-collection";
import { GroundwaterVisitForm } from "./GroundwaterVisitForm";

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

interface GroundwaterWellListProps {
  siteId: string;
}

export function GroundwaterWellList({ siteId }: GroundwaterWellListProps) {
  const { items: allWells } = useCollection<GroundwaterWell>("groundwaterWells");
  const { items: allVisits } = useCollection<GroundwaterVisit>("groundwaterVisits");
  const wells = allWells.filter((w) => w.siteId === siteId);

  const [selectedWellId, setSelectedWellId] = useState<string | null>(null);

  const today = todayString();
  function todaysVisit(wellId: string): GroundwaterVisit | null {
    return allVisits.find((v) => v.wellId === wellId && v.visitDate === today) ?? null;
  }

  const selectedWell = wells.find((w) => w.id === selectedWellId) ?? null;

  if (selectedWell) {
    return (
      <GroundwaterVisitForm
        well={selectedWell}
        existingVisit={todaysVisit(selectedWell.id)}
        onDone={() => setSelectedWellId(null)}
      />
    );
  }

  return (
    <section className="panel">
      <h2>קידוחי ניטור מי תהום</h2>
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
        {wells.length === 0 && <li className="empty-hint">אין עדיין קידוחי ניטור מי תהום באתר זה.</li>}
      </ul>
    </section>
  );
}
