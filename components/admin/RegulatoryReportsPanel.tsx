"use client";

import { useState } from "react";
import type { RegulatoryReport, RegulatoryReportStatus, RegulatoryReportType } from "@/lib/types";
import { newId, useCollection } from "@/lib/rtdb-collection";

const TYPE_LABELS: Record<RegulatoryReportType, string> = {
  fuel_lens: "ניטור ופינוי עדשת דלק (רבעוני)",
  treatment_systems: "מערכות טיפול (חצי-שנתי)",
};

const STATUS_LABELS: Record<RegulatoryReportStatus, string> = {
  not_started: "טרם התחיל",
  in_progress: "בהכנה",
  submitted: "הוגש",
};

interface RegulatoryReportsPanelProps {
  siteId: string;
}

export function RegulatoryReportsPanel({ siteId }: RegulatoryReportsPanelProps) {
  const { items: allReports, save, remove } = useCollection<RegulatoryReport>("regulatoryReports");
  const reports = allReports.filter((r) => r.siteId === siteId);

  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState<RegulatoryReportType>("fuel_lens");
  const [period, setPeriod] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!period.trim()) return;
    await save({ id: newId(), siteId, type, period: period.trim(), status: "not_started" });
    setPeriod("");
    setShowForm(false);
  }

  async function updateStatus(report: RegulatoryReport, status: RegulatoryReportStatus) {
    await save({ ...report, status });
  }

  return (
    <section className="panel">
      <h2>מעקב דוחות רגולטוריים</h2>
      <ul className="entity-list">
        {reports.map((report) => (
          <li key={report.id}>
            <span className="entity-row static">
              {TYPE_LABELS[report.type]} — {report.period}
            </span>
            <select value={report.status} onChange={(e) => updateStatus(report, e.target.value as RegulatoryReportStatus)}>
              {(Object.keys(STATUS_LABELS) as RegulatoryReportStatus[]).map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status]}
                </option>
              ))}
            </select>
            <button type="button" className="danger-link" onClick={() => remove(report)}>
              מחק
            </button>
          </li>
        ))}
        {reports.length === 0 && <li className="empty-hint">אין עדיין דוחות רגולטוריים לאתר זה</li>}
      </ul>

      {showForm ? (
        <form onSubmit={handleSubmit} className="inline-form stacked">
          <label>
            סוג דוח
            <select value={type} onChange={(e) => setType(e.target.value as RegulatoryReportType)}>
              {(Object.keys(TYPE_LABELS) as RegulatoryReportType[]).map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </label>
          <label>
            תקופה
            <input value={period} onChange={(e) => setPeriod(e.target.value)} placeholder='למשל "2026 רבעון 3"' required />
          </label>
          <div>
            <button type="submit">שמור</button>
            <button type="button" onClick={() => setShowForm(false)}>
              ביטול
            </button>
          </div>
        </form>
      ) : (
        <button type="button" onClick={() => setShowForm(true)}>
          + דוח חדש
        </button>
      )}
    </section>
  );
}
