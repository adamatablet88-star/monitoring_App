"use client";

import { useState } from "react";
import type { TreatmentSystem } from "@/lib/types";
import { useCollection } from "@/lib/rtdb-collection";
import { ClientsPanel } from "./ClientsPanel";
import { SitesPanel } from "./SitesPanel";
import { WellsPanel } from "./WellsPanel";
import { TanksPanel } from "./TanksPanel";
import { TreatmentSystemsPanel } from "./TreatmentSystemsPanel";
import { TreatmentSystemDetail } from "./TreatmentSystemDetail";
import { GroundwaterWellsPanel } from "./GroundwaterWellsPanel";
import { UsersPanel } from "./UsersPanel";
import { FrequencySettingsPanel } from "./FrequencySettingsPanel";
import { ActiveStatusPanel } from "./ActiveStatusPanel";
import { RegulatoryReportsPanel } from "./RegulatoryReportsPanel";
import { ScheduledSpecialTestsPanel } from "./ScheduledSpecialTestsPanel";
import "./admin.css";

type Tab = "wells" | "tanks" | "systems" | "groundwater";
type Section = "structure" | "compliance" | "users";

export function AdminApp() {
  const [section, setSection] = useState<Section>("structure");
  const [clientId, setClientId] = useState<string | null>(null);
  const [siteId, setSiteId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("wells");
  const [selectedSystemId, setSelectedSystemId] = useState<string | null>(null);

  // Independent client/site selection for the compliance section, so
  // switching tabs there doesn't disturb where the user was in "מבנה אתרים".
  const [complianceClientId, setComplianceClientId] = useState<string | null>(null);
  const [complianceSiteId, setComplianceSiteId] = useState<string | null>(null);

  const { items: treatmentSystems } = useCollection<TreatmentSystem>("treatmentSystems");
  const selectedSystem = treatmentSystems.find((s) => s.id === selectedSystemId) ?? null;

  function selectClient(id: string) {
    setClientId(id);
    setSiteId(null);
    setSelectedSystemId(null);
  }

  function selectSite(id: string) {
    setSiteId(id);
    setSelectedSystemId(null);
  }

  function selectComplianceClient(id: string) {
    setComplianceClientId(id);
    setComplianceSiteId(null);
  }

  return (
    <div className="admin-app">
      <h1>הקמת אתר</h1>

      <nav className="tab-bar">
        <button type="button" className={section === "structure" ? "active" : ""} onClick={() => setSection("structure")}>
          מבנה אתרים
        </button>
        <button
          type="button"
          className={section === "compliance" ? "active" : ""}
          onClick={() => setSection("compliance")}
        >
          תדירויות ודוחות
        </button>
        <button type="button" className={section === "users" ? "active" : ""} onClick={() => setSection("users")}>
          משתמשים
        </button>
      </nav>

      {section === "users" && <UsersPanel />}

      {section === "compliance" && (
        <>
          <ClientsPanel selectedClientId={complianceClientId} onSelect={selectComplianceClient} />
          {complianceClientId && (
            <SitesPanel clientId={complianceClientId} selectedSiteId={complianceSiteId} onSelect={setComplianceSiteId} />
          )}
          {complianceClientId && complianceSiteId && (
            <>
              <FrequencySettingsPanel siteId={complianceSiteId} />
              <ActiveStatusPanel siteId={complianceSiteId} />
              <RegulatoryReportsPanel siteId={complianceSiteId} />
              <ScheduledSpecialTestsPanel siteId={complianceSiteId} />
            </>
          )}
        </>
      )}

      {section === "structure" && (
        <>
          <ClientsPanel selectedClientId={clientId} onSelect={selectClient} />

          {clientId && <SitesPanel clientId={clientId} selectedSiteId={siteId} onSelect={selectSite} />}

          {clientId && siteId && (
            <>
              <nav className="tab-bar">
                <button
                  type="button"
                  className={activeTab === "wells" ? "active" : ""}
                  onClick={() => setActiveTab("wells")}
                >
                  קידוחי עדשת דלק
                </button>
                <button
                  type="button"
                  className={activeTab === "tanks" ? "active" : ""}
                  onClick={() => setActiveTab("tanks")}
                >
                  מיכלים
                </button>
                <button
                  type="button"
                  className={activeTab === "systems" ? "active" : ""}
                  onClick={() => setActiveTab("systems")}
                >
                  מערכות טיפול
                </button>
                <button
                  type="button"
                  className={activeTab === "groundwater" ? "active" : ""}
                  onClick={() => setActiveTab("groundwater")}
                >
                  ניטור מי תהום
                </button>
              </nav>

              {activeTab === "wells" && <WellsPanel siteId={siteId} />}
              {activeTab === "tanks" && <TanksPanel siteId={siteId} />}
              {activeTab === "systems" && (
                <>
                  <TreatmentSystemsPanel
                    siteId={siteId}
                    selectedSystemId={selectedSystemId}
                    onSelect={setSelectedSystemId}
                  />
                  {selectedSystem && <TreatmentSystemDetail system={selectedSystem} />}
                </>
              )}
              {activeTab === "groundwater" && <GroundwaterWellsPanel siteId={siteId} />}
            </>
          )}
        </>
      )}
    </div>
  );
}
