"use client";

import { useState } from "react";
import type { ActiveStatus, Site, TreatmentSystem } from "@/lib/types";
import { newId, useCollection } from "@/lib/rtdb-collection";
import { useAuth } from "@/lib/auth-context";
import { scopeEquals, siteScope, systemScope } from "./scope";

const SOURCE_LABELS = { technician: "טכנאי (מתוך ביקור)", admin: "מנהל (עדכון ידני)" } as const;

interface ScopeRow {
  key: string;
  label: string;
  scope: ReturnType<typeof siteScope>;
}

interface ActiveStatusPanelProps {
  siteId: string;
}

export function ActiveStatusPanel({ siteId }: ActiveStatusPanelProps) {
  const { appUser } = useAuth();
  const { items: allStatuses, save } = useCollection<ActiveStatus>("activeStatuses");
  const { items: allSystems } = useCollection<TreatmentSystem>("treatmentSystems");
  const { items: allSites } = useCollection<Site>("sites");
  const site = allSites.find((s) => s.id === siteId);
  const systems = allSystems.filter((s) => s.siteId === siteId);

  const rows: ScopeRow[] = [
    { key: "site-fuelLens", label: "האתר (עדשת דלק)", scope: siteScope(siteId, "fuelLens") },
    ...(site?.protocolTypes.includes("groundwater")
      ? [{ key: "site-groundwater", label: "האתר (דיגום מי תהום)", scope: siteScope(siteId, "groundwater") }]
      : []),
    ...systems.map((s) => ({ key: s.id, label: `מערכת: [${s.systemType}] ${s.systemLabel}`, scope: systemScope(s.id) })),
  ];

  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [active, setActive] = useState(true);
  const [reason, setReason] = useState("");

  function startEdit(key: string, existing: ActiveStatus | null) {
    setEditingKey(key);
    setActive(existing?.active ?? true);
    setReason("");
  }

  async function handleSubmit(e: React.FormEvent, row: ScopeRow, existing: ActiveStatus | null) {
    e.preventDefault();
    if (!reason.trim()) return;
    // database.rules.json validates that `source` matches the writer's
    // actual role — there's no server to stamp it authoritatively, so
    // this must already be correct on write, not just cosmetically so.
    const source = appUser?.role === "admin" ? "admin" : "technician";
    await save({ id: existing?.id ?? newId(), scope: row.scope, active, source, reason: reason.trim() });
    setEditingKey(null);
  }

  return (
    <section className="panel">
      <h2>סטטוס פעיל / לא-פעיל</h2>
      <ul className="entity-list">
        {rows.map((row) => {
          const existing = allStatuses.find((s) => scopeEquals(s.scope, row.scope)) ?? null;
          return (
            <li key={row.key} className="stacked-item">
              <div className="entity-row static">
                <strong>{row.label}</strong> —{" "}
                {existing ? (
                  <>
                    <span className={existing.active ? "status-badge done" : "status-badge pending"}>
                      {existing.active ? "פעיל" : "לא פעיל"}
                    </span>{" "}
                    ({SOURCE_LABELS[existing.source]}: {existing.reason})
                  </>
                ) : (
                  "לא סומן (ברירת מחדל: פעיל)"
                )}
              </div>

              {editingKey === row.key ? (
                <form onSubmit={(e) => handleSubmit(e, row, existing)} className="inline-form">
                  <label className="checkbox-label">
                    <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
                    פעיל
                  </label>
                  <label>
                    סיבה
                    <input value={reason} onChange={(e) => setReason(e.target.value)} required />
                  </label>
                  <button type="submit">שמור</button>
                  <button type="button" onClick={() => setEditingKey(null)}>
                    ביטול
                  </button>
                </form>
              ) : (
                <button type="button" onClick={() => startEdit(row.key, existing)}>
                  עדכן סטטוס
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
