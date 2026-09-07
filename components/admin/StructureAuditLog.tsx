"use client";

import type { AuditEntityType, StructureAuditEntry } from "@/lib/types";
import { useCollection } from "@/lib/rtdb-collection";

const ACTION_LABELS: Record<StructureAuditEntry["action"], string> = {
  created: "נוצר",
  deleted: "נמחק",
};

interface StructureAuditLogProps {
  entityType: AuditEntityType;
  scopeId: string;
}

/** Audit Trail for well/treatment-system/site structural changes (spec 18.8) — see lib/rtdb-collection.ts's logStructureChange. */
export function StructureAuditLog({ entityType, scopeId }: StructureAuditLogProps) {
  const { items: allEntries } = useCollection<StructureAuditEntry>("structureAuditLog");
  const entries = allEntries
    .filter((e) => e.entityType === entityType && e.scopeId === scopeId)
    .sort((a, b) => (a.changedAt < b.changedAt ? 1 : -1));

  if (entries.length === 0) return null;

  return (
    <details>
      <summary>יומן שינויי מבנה ({entries.length})</summary>
      <ul className="history-list">
        {entries.map((e) => (
          <li key={e.id}>
            {new Date(e.changedAt).toLocaleString("he-IL")} — {e.changedBy}: {ACTION_LABELS[e.action]} &quot;{e.entityLabel}&quot;
          </li>
        ))}
      </ul>
    </details>
  );
}
