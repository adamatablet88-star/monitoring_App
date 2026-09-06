"use client";

import type { TreatmentSystem } from "@/lib/types";
import { ParametersPanel } from "./ParametersPanel";
import { TreatmentWellsPanel } from "./TreatmentWellsPanel";

interface TreatmentSystemDetailProps {
  system: TreatmentSystem;
}

export function TreatmentSystemDetail({ system }: TreatmentSystemDetailProps) {
  return (
    <section className="panel">
      <h2>
        פרטי מערכת: [{system.systemType}] {system.systemLabel}
      </h2>
      <ParametersPanel systemId={system.id} />
      <TreatmentWellsPanel systemId={system.id} />
    </section>
  );
}
