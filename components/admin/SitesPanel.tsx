"use client";

import { useState } from "react";
import type { ProtocolType, Site, SiteStatus } from "@/lib/types";
import { logStructureChange, newId, useCollection } from "@/lib/rtdb-collection";
import { useAuth } from "@/lib/auth-context";
import { StructureAuditLog } from "./StructureAuditLog";

const PROTOCOL_LABELS: Record<ProtocolType, string> = {
  fuelLens: "עדשת דלק",
  SVE: "SVE",
  bioVenting: "Bio-venting",
  groundwater: "דיגום מי תהום",
};

const STATUS_LABELS: Record<SiteStatus, string> = {
  active: "פעיל",
  inactive: "לא פעיל",
};

interface SitesPanelProps {
  clientId: string;
  selectedSiteId: string | null;
  onSelect: (siteId: string) => void;
}

export function SitesPanel({ clientId, selectedSiteId, onSelect }: SitesPanelProps) {
  const { appUser } = useAuth();
  const changedBy = appUser?.username ?? "לא ידוע";
  const { items: allSites, save, remove } = useCollection<Site>("sites");
  const sites = allSites.filter((s) => s.clientId === clientId);

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [status, setStatus] = useState<SiteStatus>("active");
  const [notes, setNotes] = useState("");
  const [protocolTypes, setProtocolTypes] = useState<ProtocolType[]>([]);

  function toggleProtocol(type: ProtocolType) {
    setProtocolTypes((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || protocolTypes.length === 0) return;
    const now = Date.now();
    const siteName = name.trim();
    await save({
      id: newId(),
      clientId,
      name: siteName,
      address: address.trim(),
      coordinates: { lat: Number(lat) || 0, lng: Number(lng) || 0 },
      status,
      notes: notes.trim() || undefined,
      protocolTypes,
      createdAt: now,
      updatedAt: now,
    });
    await logStructureChange("site", clientId, siteName, "created", changedBy);
    setName("");
    setAddress("");
    setLat("");
    setLng("");
    setStatus("active");
    setNotes("");
    setProtocolTypes([]);
    setShowForm(false);
  }

  async function handleRemove(site: Site) {
    await remove(site);
    await logStructureChange("site", clientId, site.name, "deleted", changedBy);
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
              {site.status === "inactive" && <span className="status-badge pending">לא פעיל</span>}{" "}
              <span className="tag-list">{site.protocolTypes.map((t) => PROTOCOL_LABELS[t]).join(" · ")}</span>
            </button>
            <button type="button" className="danger-link" onClick={() => handleRemove(site)}>
              מחק
            </button>
          </li>
        ))}
        {sites.length === 0 && <li className="empty-hint">אין עדיין אתרים ללקוח זה</li>}
      </ul>

      <StructureAuditLog entityType="site" scopeId={clientId} />

      {showForm ? (
        <form onSubmit={handleSubmit} className="inline-form stacked">
          <label>
            שם האתר
            <input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
          </label>
          <label>
            כתובת
            <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="כתובת מלאה — משמשת לניווט (Waze)" />
          </label>
          <div className="field-row">
            <label>
              קו רוחב (Lat)
              <input type="number" step="any" value={lat} onChange={(e) => setLat(e.target.value)} />
            </label>
            <label>
              קו אורך (Lng)
              <input type="number" step="any" value={lng} onChange={(e) => setLng(e.target.value)} />
            </label>
          </div>
          <label>
            סטטוס אתר
            <select value={status} onChange={(e) => setStatus(e.target.value as SiteStatus)}>
              {(Object.keys(STATUS_LABELS) as SiteStatus[]).map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </label>
          <label>
            הערות
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
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
