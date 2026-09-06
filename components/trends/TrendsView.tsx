"use client";

import { useState } from "react";
import type {
  BioVentingSystemVisit,
  Client,
  FuelLensVisit,
  Site,
  SveSystemVisit,
  SystemType,
  TreatmentSystem,
  Well,
} from "@/lib/types";
import { useCollection } from "@/lib/rtdb-collection";
import { TrendChart } from "./TrendChart";
import { cutoffDateFor, quarterlyAverageTable, TIME_RANGE_LABELS, type TimeRange } from "./timeRange";
import { FUEL_LENS_METRIC_LABELS, fuelLensQuarterlySummary, fuelLensSeriesFor, type FuelLensMetric } from "./fuelLensTrends";
import { SVE_METRIC_LABELS, sveSeriesFor, type SveMetric } from "./sveTrends";
import { BIO_VENTING_METRIC_LABELS, bioVentingSeriesFor, type BioVentingMetric } from "./bioVentingTrends";
import { FuelLensExportButton } from "@/components/export/FuelLensExportButton";
import "./trends.css";

type Protocol = "fuelLens" | "SVE" | "bioVenting";

const PROTOCOL_LABELS: Record<Protocol, string> = { fuelLens: "עדשת דלק", SVE: "SVE", bioVenting: "Bio-venting" };
const EVACUATION_METHOD_LABELS: Record<string, string> = {
  skimmer: "סקימר",
  bailer: "ביילר",
  external_pump: "משאבה חיצונית",
  other: "אחר",
};

function groupBy<T, K>(items: T[], keyFn: (item: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    const list = map.get(key);
    if (list) list.push(item);
    else map.set(key, [item]);
  }
  return map;
}

export function TrendsView() {
  const [protocol, setProtocol] = useState<Protocol>("fuelLens");
  const [siteId, setSiteId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [range, setRange] = useState<TimeRange>("1y");
  const [fuelLensMetric, setFuelLensMetric] = useState<FuelLensMetric>("waterDepth");
  const [sveMetric, setSveMetric] = useState<SveMetric>("efficiencyPercent");
  const [bioVentingMetric, setBioVentingMetric] = useState<BioVentingMetric>("o2");

  const { items: clients } = useCollection<Client>("clients");
  const { items: sites } = useCollection<Site>("sites");
  const { items: wells } = useCollection<Well>("wells");
  const { items: systems } = useCollection<TreatmentSystem>("treatmentSystems");
  const { items: fuelLensVisits } = useCollection<FuelLensVisit>("fuelLensVisits");
  const { items: sveVisits } = useCollection<SveSystemVisit>("sveSystemVisits");
  const { items: bioVentingVisits } = useCollection<BioVentingSystemVisit>("bioVentingSystemVisits");

  const sitesForProtocol = sites.filter((s) => s.protocolTypes.includes(protocol));

  function selectProtocol(p: Protocol) {
    setProtocol(p);
    setSiteId(null);
    setSelectedIds([]);
  }

  function selectSite(id: string) {
    setSiteId(id);
    setSelectedIds([]);
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  const cutoff = cutoffDateFor(range);
  const inRange = (visitDate: string) => !cutoff || visitDate >= cutoff;

  const siteWells = siteId ? wells.filter((w) => w.siteId === siteId) : [];
  const systemType: SystemType = protocol === "SVE" ? "SVE" : "bioVenting";
  const siteSystems = siteId ? systems.filter((s) => s.siteId === siteId && s.systemType === systemType) : [];

  const entities: Array<{ id: string; label: string }> =
    protocol === "fuelLens"
      ? siteWells.map((w) => ({ id: w.id, label: w.code }))
      : siteSystems.map((s) => ({ id: s.id, label: s.systemLabel }));

  const selectedEntities = entities.filter((e) => selectedIds.includes(e.id));

  let series: ReturnType<typeof fuelLensSeriesFor> = [];
  let metricLabel = "";
  if (protocol === "fuelLens") {
    const visitsByWell = groupBy(
      fuelLensVisits.filter((v) => selectedIds.includes(v.wellId) && inRange(v.visitDate)),
      (v) => v.wellId,
    );
    series = fuelLensSeriesFor(selectedEntities.map((e) => ({ id: e.id, code: e.label })), visitsByWell, fuelLensMetric);
    metricLabel = FUEL_LENS_METRIC_LABELS[fuelLensMetric];
  } else if (protocol === "SVE") {
    const visitsBySystem = groupBy(
      sveVisits.filter((v) => selectedIds.includes(v.systemId) && inRange(v.visitDate)),
      (v) => v.systemId,
    );
    series = sveSeriesFor(selectedEntities.map((e) => ({ id: e.id, systemLabel: e.label })), visitsBySystem, sveMetric);
    metricLabel = SVE_METRIC_LABELS[sveMetric];
  } else {
    const visitsBySystem = groupBy(
      bioVentingVisits.filter((v) => selectedIds.includes(v.systemId) && inRange(v.visitDate)),
      (v) => v.systemId,
    );
    series = bioVentingSeriesFor(
      selectedEntities.map((e) => ({ id: e.id, systemLabel: e.label })),
      visitsBySystem,
      bioVentingMetric,
    );
    metricLabel = BIO_VENTING_METRIC_LABELS[bioVentingMetric];
  }

  const quarterlyRows = quarterlyAverageTable(series);

  const fuelLensQuarterly =
    protocol === "fuelLens"
      ? fuelLensQuarterlySummary(fuelLensVisits.filter((v) => selectedIds.includes(v.wellId) && inRange(v.visitDate)))
      : [];
  const evacuationMethods = Array.from(new Set(fuelLensQuarterly.flatMap((q) => Object.keys(q.byMethod))));

  return (
    <div className="field-app">
      <h1>דשבורד מגמות</h1>

      <nav className="tab-bar">
        {(Object.keys(PROTOCOL_LABELS) as Protocol[]).map((p) => (
          <button key={p} type="button" className={protocol === p ? "active" : ""} onClick={() => selectProtocol(p)}>
            {PROTOCOL_LABELS[p]}
          </button>
        ))}
      </nav>

      <section className="panel">
        <h2>בחירת אתר</h2>
        <ul className="entity-list">
          {sitesForProtocol.map((site) => (
            <li key={site.id}>
              <button
                type="button"
                className={site.id === siteId ? "entity-row selected" : "entity-row"}
                onClick={() => selectSite(site.id)}
              >
                {site.name} <span className="tag-list">{clients.find((c) => c.id === site.clientId)?.name}</span>
              </button>
            </li>
          ))}
          {sitesForProtocol.length === 0 && (
            <li className="empty-hint">אין אתרים עם פרוטוקול {PROTOCOL_LABELS[protocol]}</li>
          )}
        </ul>
      </section>

      {siteId && (
        <section className="panel">
          <h2>{protocol === "fuelLens" ? "קידוחים להשוואה" : "מערכות להשוואה"}</h2>
          {entities.length === 0 && <p className="empty-hint">אין ישויות זמינות באתר זה.</p>}
          <div className="multiselect-list">
            {entities.map((e) => (
              <button
                key={e.id}
                type="button"
                className={selectedIds.includes(e.id) ? "multiselect-chip selected" : "multiselect-chip"}
                onClick={() => toggleSelected(e.id)}
              >
                {e.label}
              </button>
            ))}
          </div>

          <label>
            טווח זמן
            <select value={range} onChange={(e) => setRange(e.target.value as TimeRange)}>
              {(Object.keys(TIME_RANGE_LABELS) as TimeRange[]).map((r) => (
                <option key={r} value={r}>
                  {TIME_RANGE_LABELS[r]}
                </option>
              ))}
            </select>
          </label>

          {protocol === "fuelLens" && (
            <label>
              מדד
              <select value={fuelLensMetric} onChange={(e) => setFuelLensMetric(e.target.value as FuelLensMetric)}>
                {(Object.keys(FUEL_LENS_METRIC_LABELS) as FuelLensMetric[]).map((m) => (
                  <option key={m} value={m}>
                    {FUEL_LENS_METRIC_LABELS[m]}
                  </option>
                ))}
              </select>
            </label>
          )}
          {protocol === "SVE" && (
            <label>
              מדד
              <select value={sveMetric} onChange={(e) => setSveMetric(e.target.value as SveMetric)}>
                {(Object.keys(SVE_METRIC_LABELS) as SveMetric[]).map((m) => (
                  <option key={m} value={m}>
                    {SVE_METRIC_LABELS[m]}
                  </option>
                ))}
              </select>
            </label>
          )}
          {protocol === "bioVenting" && (
            <label>
              מדד
              <select value={bioVentingMetric} onChange={(e) => setBioVentingMetric(e.target.value as BioVentingMetric)}>
                {(Object.keys(BIO_VENTING_METRIC_LABELS) as BioVentingMetric[]).map((m) => (
                  <option key={m} value={m}>
                    {BIO_VENTING_METRIC_LABELS[m]}
                  </option>
                ))}
              </select>
            </label>
          )}

          {selectedIds.length === 0 ? (
            <p className="empty-hint">יש לבחור לפחות {protocol === "fuelLens" ? "קידוח אחד" : "מערכת אחת"} להצגה.</p>
          ) : (
            <>
              <TrendChart series={series} unit={metricLabel} />

              {quarterlyRows.length > 0 && (
                <table className="trend-summary-table">
                  <thead>
                    <tr>
                      <th>רבעון</th>
                      {selectedEntities.map((e) => (
                        <th key={e.id}>{e.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {quarterlyRows.map((row) => (
                      <tr key={row.quarter}>
                        <td>{row.quarter}</td>
                        {selectedEntities.map((e) => (
                          <td key={e.id}>{row.values[e.id] !== null && row.values[e.id] !== undefined ? row.values[e.id]!.toFixed(2) : "—"}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {protocol === "fuelLens" && fuelLensQuarterly.length > 0 && (
                <>
                  <h3>פינוי לפי שיטה וסופחים שהוחלפו (רבעוני)</h3>
                  <table className="trend-summary-table">
                    <thead>
                      <tr>
                        <th>רבעון</th>
                        {evacuationMethods.map((m) => (
                          <th key={m}>{EVACUATION_METHOD_LABELS[m] ?? m} (ליטר)</th>
                        ))}
                        <th>סופחים שהוחלפו</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fuelLensQuarterly.map((row) => (
                        <tr key={row.quarter}>
                          <td>{row.quarter}</td>
                          {evacuationMethods.map((m) => (
                            <td key={m}>{row.byMethod[m]?.toFixed(1) ?? "—"}</td>
                          ))}
                          <td>{row.absorbentReplacedCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </>
          )}

          {protocol === "fuelLens" && <FuelLensExportButton siteId={siteId} />}
        </section>
      )}
    </div>
  );
}
