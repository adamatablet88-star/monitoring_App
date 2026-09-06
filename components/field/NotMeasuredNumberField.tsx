"use client";

import type { NotMeasuredReason } from "@/lib/types";
import type { NotMeasuredDraft } from "./notMeasured";
import { NOT_MEASURED_REASON_LABELS } from "./labels";

interface NotMeasuredNumberFieldProps {
  label: string;
  draft: NotMeasuredDraft;
  onChange: (patch: Partial<NotMeasuredDraft>) => void;
}

/** A number field with the "לא נמדד + סיבה" pattern. */
export function NotMeasuredNumberField({ label, draft, onChange }: NotMeasuredNumberFieldProps) {
  return (
    <div className="not-measured-field">
      <label>
        {label}
        <input
          type="number"
          step="any"
          value={draft.value}
          disabled={draft.notMeasured}
          onChange={(e) => onChange({ value: e.target.value })}
        />
      </label>
      <label className="checkbox-label small">
        <input
          type="checkbox"
          checked={draft.notMeasured}
          onChange={(e) => onChange({ notMeasured: e.target.checked, value: "" })}
        />
        לא נמדד
      </label>
      {draft.notMeasured && (
        <select value={draft.reason} onChange={(e) => onChange({ reason: e.target.value as NotMeasuredReason })}>
          <option value="">— סיבה —</option>
          {(Object.keys(NOT_MEASURED_REASON_LABELS) as NotMeasuredReason[]).map((reason) => (
            <option key={reason} value={reason}>
              {NOT_MEASURED_REASON_LABELS[reason]}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
