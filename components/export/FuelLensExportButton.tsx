"use client";

import { useState } from "react";
import type { FuelLensVisit, Site, Tank, Well } from "@/lib/types";
import { useCollection } from "@/lib/rtdb-collection";
import { quarterKey } from "@/components/trends/timeRange";

interface FuelLensExportButtonProps {
  siteId: string;
}

/** Structured Excel export matching the quarterly regulatory report exactly. */
export function FuelLensExportButton({ siteId }: FuelLensExportButtonProps) {
  const { items: sites } = useCollection<Site>("sites");
  const { items: wells } = useCollection<Well>("wells");
  const { items: tanks } = useCollection<Tank>("tanks");
  const { items: visits } = useCollection<FuelLensVisit>("fuelLensVisits");

  const site = sites.find((s) => s.id === siteId) ?? null;
  const siteWells = wells.filter((w) => w.siteId === siteId);
  const siteWellIds = new Set(siteWells.map((w) => w.id));
  const siteVisits = visits.filter((v) => siteWellIds.has(v.wellId));
  const siteTanks = tanks.filter((t) => t.siteId === siteId);

  const availableQuarters = Array.from(new Set(siteVisits.map((v) => quarterKey(v.visitDate)))).sort().reverse();
  const [reportQuarter, setReportQuarter] = useState(availableQuarters[0] ?? quarterKey(new Date().toISOString().slice(0, 10)));
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    if (!site) return;
    setExporting(true);
    try {
      // exceljs is sizeable and only ever needed here — loaded on demand
      // so the rest of the app doesn't pay for it upfront.
      const { buildFuelLensWorkbook, downloadWorkbookBuffer } = await import("./fuelLensExcelExport");
      const buffer = await buildFuelLensWorkbook({
        site,
        wells: siteWells,
        tanks: siteTanks,
        visits: siteVisits,
        reportQuarter,
      });
      downloadWorkbookBuffer(buffer, `דוח-עדשת-דלק-${site.name}-${reportQuarter}.xlsx`);
    } finally {
      setExporting(false);
    }
  }

  if (!site) return null;

  return (
    <div className="export-panel">
      <h3>ייצוא לדוח רגולטורי (Excel)</h3>
      <label>
        תקופת דוח (טבלה 2 — ניטור רבעוני; הנספח תמיד כולל את כל ההיסטוריה)
        <select value={reportQuarter} onChange={(e) => setReportQuarter(e.target.value)}>
          {availableQuarters.length === 0 && <option value={reportQuarter}>{reportQuarter}</option>}
          {availableQuarters.map((q) => (
            <option key={q} value={q}>
              {q}
            </option>
          ))}
        </select>
      </label>
      <button type="button" onClick={handleExport} disabled={exporting || siteWells.length === 0}>
        {exporting ? "מייצא..." : "ייצוא Excel"}
      </button>
      {siteWells.length === 0 && <p className="empty-hint">אין קידוחי עדשת דלק באתר זה לייצוא.</p>}
    </div>
  );
}
