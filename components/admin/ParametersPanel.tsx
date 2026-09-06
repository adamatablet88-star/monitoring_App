"use client";

import { useState } from "react";
import type { CriticalDirection, ParameterConfig } from "@/lib/types";
import { newId, useCollection } from "@/lib/rtdb-collection";

const CRITICAL_LABELS: Record<CriticalDirection, string> = {
  none: "ללא סף קריטי",
  above: "קריטי כשמעל ערך",
  below: "קריטי כשמתחת לערך",
};

interface ParametersPanelProps {
  systemId: string;
}

interface ParameterDraft {
  label: string;
  unit: string;
  minValue: string;
  maxValue: string;
  required: boolean;
  order: string;
  criticalDirection: CriticalDirection;
  criticalValue: string;
  criticalMessage: string;
}

const emptyDraft: ParameterDraft = {
  label: "",
  unit: "",
  minValue: "",
  maxValue: "",
  required: false,
  order: "0",
  criticalDirection: "none",
  criticalValue: "",
  criticalMessage: "",
};

export function ParametersPanel({ systemId }: ParametersPanelProps) {
  const { items: allParameters, save, remove } = useCollection<ParameterConfig>("parameterConfigs");
  const parameters = allParameters.filter((p) => p.systemId === systemId).sort((a, b) => a.order - b.order);

  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState<ParameterDraft>(emptyDraft);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.label.trim() || !draft.unit.trim()) return;
    await save({
      id: newId(),
      systemId,
      label: draft.label.trim(),
      unit: draft.unit.trim(),
      minValue: draft.minValue.trim() ? Number(draft.minValue) : null,
      maxValue: draft.maxValue.trim() ? Number(draft.maxValue) : null,
      required: draft.required,
      order: Number(draft.order) || 0,
      criticalDirection: draft.criticalDirection,
      criticalValue: draft.criticalDirection !== "none" && draft.criticalValue.trim() ? Number(draft.criticalValue) : null,
      criticalMessage: draft.criticalDirection !== "none" ? draft.criticalMessage.trim() : "",
    });
    setDraft(emptyDraft);
    setShowForm(false);
  }

  return (
    <section className="panel nested">
      <h3>פרמטרים (מנוע קונפיגורציה גמיש)</h3>
      <ul className="entity-list">
        {parameters.map((param) => (
          <li key={param.id}>
            <span className="entity-row static">
              {param.label} [{param.unit}]
              {param.minValue !== null || param.maxValue !== null
                ? ` · טווח תקין: ${param.minValue ?? "—"}–${param.maxValue ?? "—"}`
                : ""}
              {param.required && " · חובה"}
              {param.criticalDirection !== "none" &&
                ` · סף קריטי: ${CRITICAL_LABELS[param.criticalDirection]} ${param.criticalValue ?? ""}`}
            </span>
            <button type="button" className="danger-link" onClick={() => remove(param)}>
              מחק
            </button>
          </li>
        ))}
        {parameters.length === 0 && <li className="empty-hint">אין עדיין פרמטרים למערכת זו</li>}
      </ul>

      {showForm ? (
        <form onSubmit={handleSubmit} className="inline-form stacked">
          <div className="field-row">
            <label>
              שם המד
              <input value={draft.label} onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))} required />
            </label>
            <label>
              יחידת מידה
              <input value={draft.unit} onChange={(e) => setDraft((d) => ({ ...d, unit: e.target.value }))} required />
            </label>
          </div>
          <div className="field-row">
            <label>
              טווח תקין — מינימום
              <input
                type="number"
                step="any"
                value={draft.minValue}
                onChange={(e) => setDraft((d) => ({ ...d, minValue: e.target.value }))}
              />
            </label>
            <label>
              טווח תקין — מקסימום
              <input
                type="number"
                step="any"
                value={draft.maxValue}
                onChange={(e) => setDraft((d) => ({ ...d, maxValue: e.target.value }))}
              />
            </label>
          </div>
          <div className="field-row">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={draft.required}
                onChange={(e) => setDraft((d) => ({ ...d, required: e.target.checked }))}
              />
              שדה חובה
            </label>
            <label>
              סדר תצוגה
              <input
                type="number"
                value={draft.order}
                onChange={(e) => setDraft((d) => ({ ...d, order: e.target.value }))}
              />
            </label>
          </div>

          <fieldset>
            <legend>סף קריטי (עצמאי מהטווח התקין)</legend>
            <label>
              כיוון
              <select
                value={draft.criticalDirection}
                onChange={(e) => setDraft((d) => ({ ...d, criticalDirection: e.target.value as CriticalDirection }))}
              >
                {(Object.keys(CRITICAL_LABELS) as CriticalDirection[]).map((dir) => (
                  <option key={dir} value={dir}>
                    {CRITICAL_LABELS[dir]}
                  </option>
                ))}
              </select>
            </label>
            {draft.criticalDirection !== "none" && (
              <>
                <label>
                  ערך סף
                  <input
                    type="number"
                    step="any"
                    value={draft.criticalValue}
                    onChange={(e) => setDraft((d) => ({ ...d, criticalValue: e.target.value }))}
                    required
                  />
                </label>
                <label>
                  הודעת הבאנר הקריטי
                  <input
                    value={draft.criticalMessage}
                    onChange={(e) => setDraft((d) => ({ ...d, criticalMessage: e.target.value }))}
                    placeholder="יש להתקשר מיידית למפקח"
                    required
                  />
                </label>
              </>
            )}
          </fieldset>

          <div>
            <button type="submit">שמור</button>
            <button type="button" onClick={() => setShowForm(false)}>
              ביטול
            </button>
          </div>
        </form>
      ) : (
        <button type="button" onClick={() => setShowForm(true)}>
          + פרמטר חדש
        </button>
      )}
    </section>
  );
}
