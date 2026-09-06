"use client";

import { useState } from "react";
import type { Client, ProtocolType, Site } from "@/lib/types";
import { useCollection } from "@/lib/rtdb-collection";
import { ActiveStatusPanel } from "@/components/admin/ActiveStatusPanel";
import { FuelLensWellList } from "./FuelLensWellList";
import { TreatmentSystemList } from "./TreatmentSystemList";
import { GroundwaterWellList } from "./groundwater/GroundwaterWellList";
import "@/components/admin/admin.css";
import "./field.css";

const PROTOCOL_TAB_LABELS: Record<ProtocolType, string> = {
  fuelLens: "עדשת דלק",
  SVE: "SVE",
  bioVenting: "Bio-venting",
  groundwater: "מי תהום",
};

export function FieldApp() {
  const { items: sites } = useCollection<Site>("sites");
  const { items: clients } = useCollection<Client>("clients");
  const [siteId, setSiteId] = useState<string | null>(null);
  const [activeProtocol, setActiveProtocol] = useState<ProtocolType | null>(null);

  const selectedSite = sites.find((s) => s.id === siteId) ?? null;

  function selectSite(site: Site) {
    setSiteId(site.id);
    setActiveProtocol(site.protocolTypes[0] ?? null);
  }

  if (selectedSite) {
    return (
      <div className="field-app">
        <button
          type="button"
          className="back-link"
          onClick={() => {
            setSiteId(null);
            setActiveProtocol(null);
          }}
        >
          ← חזרה לרשימת האתרים
        </button>
        <h1>{selectedSite.name}</h1>

        <details className="active-status-details">
          <summary>עדכון סטטוס פעיל / לא-פעיל (מתוך ביקור בפועל)</summary>
          <ActiveStatusPanel siteId={selectedSite.id} />
        </details>

        {selectedSite.protocolTypes.length > 1 && (
          <nav className="tab-bar">
            {selectedSite.protocolTypes.map((protocol) => (
              <button
                type="button"
                key={protocol}
                className={activeProtocol === protocol ? "active" : ""}
                onClick={() => setActiveProtocol(protocol)}
              >
                {PROTOCOL_TAB_LABELS[protocol]}
              </button>
            ))}
          </nav>
        )}

        {activeProtocol === "fuelLens" && <FuelLensWellList siteId={selectedSite.id} />}
        {activeProtocol === "SVE" && <TreatmentSystemList siteId={selectedSite.id} systemType="SVE" />}
        {activeProtocol === "bioVenting" && <TreatmentSystemList siteId={selectedSite.id} systemType="bioVenting" />}
        {activeProtocol === "groundwater" && <GroundwaterWellList siteId={selectedSite.id} />}
      </div>
    );
  }

  return (
    <div className="field-app">
      <h1>טפסי שטח — בחירת אתר</h1>
      <ul className="entity-list">
        {sites.map((site) => (
          <li key={site.id}>
            <button type="button" className="entity-row" onClick={() => selectSite(site)}>
              {site.name} <span className="tag-list">{clients.find((c) => c.id === site.clientId)?.name}</span>
            </button>
          </li>
        ))}
        {sites.length === 0 && <li className="empty-hint">אין עדיין אתרים — יש להקים אתר תחת &quot;הקמת אתר&quot;.</li>}
      </ul>
    </div>
  );
}
