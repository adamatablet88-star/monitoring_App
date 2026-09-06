"use client";

import { useState } from "react";
import type { ProtocolType, Site } from "@/lib/types";
import { newId, useCollection } from "@/lib/rtdb-collection";

const PROTOCOL_LABELS: Record<ProtocolType, string> = {
  fuelLens: "עדשת דלק",
  SVE: "SVE",
  bioVenting: "Bio-venting",
  groundwater: "דיגום מי תהום",
};

interface SitesPanelProps {
  clientId: string;
  selectedSiteId: string | null;
  onSelect: (siteId: string) => void;
}

export function SitesPanel({ clientId, selectedSiteId, onSelect }: SitesPanelProps) {
  const { items: allSites, save, remove } = useCollection<Site>("sites");
  const sites = allSites.filter((s) => s.clientId === clientId);

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [protocolTypes, setProtocolTypes] = useState<ProtocolType[]>([]);

  function toggleProtocol(type: ProtocolType) {
    setProtocolTypes((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || protocolTypes.length === 0) return;
    await save({ id: newId(), clientId, name: name.trim(), location: location.trim(), protocolTypes });
    setName("");
    setLocation("");
    setProtocolTypes([]);
    setShowForm(false);
  }

  return (
    <section className="panel">
      <h2>אתרים</h2>
      <ul className="entity-list">
        {sites.map((site) => (
          <li key={site.id}>
            <button
              type="button"
              className={site.id === selectedSiteId ? "entity-row selected" : "entity-row"}
              onClick={() => onSelect(site.id)}
            >
              {site.name}{" "}
              <span className="tag-list">{site.protocolTypes.map((t) => PROTOCOL_LABELS[t]).join(" · ")}</span>
            </button>
            <button type="button" className="danger-link" onClick={() => remove(site)}>
              מחק
            </button>
          </li>
        ))}
        {sites.length === 0 && <li className="empty-hint">אין עדיין אתרים ללקוח זה</li>}
      </ul>

      {showForm ? (
        <form onSubmit={handleSubmit} className="inline-form stacked">
          <label>
            שם האתר
            <input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
          </label>
          <label>
            מיקום
            <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="קואורדינטות / תיאור" />
          </label>
          <fieldset>
            <legend>סוגי פרוטוקול באתר (ניתן לבחור כמה — אתר &quot;משולב&quot;)</legend>
            {(Object.keys(PROTOCOL_LABELS) as ProtocolType[]).map((type) => (
              <label key={type} className="checkbox-label">
                <input
                  type="checkbox"
                  checked={protocolTypes.includes(type)}
                  onChange={() => toggleProtocol(type)}
                />
                {PROTOCOL_LABELS[type]}
              </label>
            ))}
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
          + אתר חדש
        </button>
      )}
    </section>
  );
}
