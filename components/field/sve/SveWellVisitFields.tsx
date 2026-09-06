"use client";

import type { TreatmentWell } from "@/lib/types";
import { NotMeasuredNumberField } from "../NotMeasuredNumberField";
import type { NotMeasuredDraft } from "../notMeasured";

export interface SveWellDraft {
  vacuum: NotMeasuredDraft;
  pid: NotMeasuredDraft;
  waterDepth: NotMeasuredDraft;
  productDepth: NotMeasuredDraft;
  bottomDepth: NotMeasuredDraft;
}

interface SveWellVisitFieldsProps {
  well: TreatmentWell;
  draft: SveWellDraft;
  onChange: (patch: Partial<SveWellDraft>) => void;
}

/** Only collected during a "large"/"baseline" visit. */
export function SveWellVisitFields({ well, draft, onChange }: SveWellVisitFieldsProps) {
  return (
    <details className="well-visit-details">
      <summary>{well.code}</summary>
      <div className="field-row">
        <NotMeasuredNumberField label="וואקום" draft={draft.vacuum} onChange={(patch) => onChange({ vacuum: { ...draft.vacuum, ...patch } })} />
        <NotMeasuredNumberField label="PID" draft={draft.pid} onChange={(patch) => onChange({ pid: { ...draft.pid, ...patch } })} />
      </div>
      <div className="field-row">
        <NotMeasuredNumberField
          label="מפלס מים"
          draft={draft.waterDepth}
          onChange={(patch) => onChange({ waterDepth: { ...draft.waterDepth, ...patch } })}
        />
        <NotMeasuredNumberField
          label="עומק עדשה"
          draft={draft.productDepth}
          onChange={(patch) => onChange({ productDepth: { ...draft.productDepth, ...patch } })}
        />
        <NotMeasuredNumberField
          label="תחתית"
          draft={draft.bottomDepth}
          onChange={(patch) => onChange({ bottomDepth: { ...draft.bottomDepth, ...patch } })}
        />
      </div>
    </details>
  );
}
