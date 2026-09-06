"use client";

import { useState } from "react";
import type { BioVentingSystemVisit, SveSystemVisit, SystemType, TreatmentSystem } from "@/lib/types";
import { useCollection } from "@/lib/rtdb-collection";
import { SveVisitForm } from "./sve/SveVisitForm";
import { BioVentingVisitForm } from "./bioVenting/BioVentingVisitForm";

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

interface TreatmentSystemListProps {
  siteId: string;
  systemType: SystemType;
}

/** Shared list/status screen for both SVE and Bio-venting systems at a site. */
export function TreatmentSystemList({ siteId, systemType }: TreatmentSystemListProps) {
  const { items: allSystems } = useCollection<TreatmentSystem>("treatmentSystems");
  const systems = allSystems.filter((s) => s.siteId === siteId && s.systemType === systemType);

  const sveVisits = useCollection<SveSystemVisit>("sveSystemVisits").items;
  const bioVentingVisits = useCollection<BioVentingSystemVisit>("bioVentingSystemVisits").items;

  const [selectedSystemId, setSelectedSystemId] = useState<string | null>(null);

  const today = todayString();
  function hasTodaysVisit(systemId: string): boolean {
    if (systemType === "SVE") {
      return sveVisits.some((v) => v.systemId === systemId && v.visitDate === today);
    }
    return bioVentingVisits.some((v) => v.systemId === systemId && v.visitDate === today);
  }

  const selectedSystem = systems.find((s) => s.id === selectedSystemId) ?? null;

  if (selectedSystem) {
    const onDone = () => setSelectedSystemId(null);
    return systemType === "SVE" ? (
      <SveVisitForm system={selectedSystem} onDone={onDone} />
    ) : (
      <BioVentingVisitForm system={selectedSystem} onDone={onDone} />
    );
  }

  return (
    <section className="panel">
      <h2>מערכות {systemType === "SVE" ? "SVE" : "Bio-venting"}</h2>
      <ul className="entity-list">
        {systems.map((system) => (
          <li key={system.id}>
            <button type="button" className="entity-row" onClick={() => setSelectedSystemId(system.id)}>
              <span className={hasTodaysVisit(system.id) ? "status-badge done" : "status-badge pending"}>
                {hasTodaysVisit(system.id) ? "✓ בוצע" : "טרם בוצע"}
              </span>{" "}
              {system.systemLabel}
            </button>
          </li>
        ))}
        {systems.length === 0 && <li className="empty-hint">אין עדיין מערכות מסוג זה באתר.</li>}
      </ul>
    </section>
  );
}
