import ExcelJS from "exceljs";
import type { EvacuationMethod, FuelLensVisit, Site, Tank, Well } from "@/lib/types";
import { computeTankAccumulation } from "@/lib/tankAccumulation";

const RECOVERY_LABELS: Record<Well["recoveryMethod"], string> = {
  none: "ללא אמצעי",
  passive_skimmer: "סקימר פאסיבי",
  absorbent: "סופח",
  active_skimmer: "סקימר אקטיבי",
};

const EVACUATION_METHOD_LABELS: Record<EvacuationMethod, string> = {
  skimmer: "סקימר",
  bailer: "ביילר",
  external_pump: "משאבה חיצונית",
  other: "אחר",
};

/** "2026-Q3" style key, matching trends/timeRange.ts's quarterKey. */
function quarterKey(visitDate: string): string {
  const [yearStr, monthStr] = visitDate.split("-");
  const quarter = Math.floor((Number(monthStr) - 1) / 3) + 1;
  return `${yearStr}-Q${quarter}`;
}

function totalLiters(visit: FuelLensVisit): number {
  return visit.evacuations.reduce((sum, e) => sum + e.liters, 0);
}

/** A missing measurement is shown as "-", never as a blank cell. */
function cellOrDash(value: number | null): number | string {
  return value === null ? "-" : value;
}

/**
 * Builds the quarterly regulatory-report workbook: a structured Excel
 * export (not an automated combined document), so the hand-written
 * analysis section of the real report stays separate.
 */
export async function buildFuelLensWorkbook(params: {
  site: Site;
  wells: Well[];
  tanks: Tank[];
  visits: FuelLensVisit[];
  reportQuarter: string;
}): Promise<ExcelJS.Buffer> {
  const { site, wells, tanks, visits, reportQuarter } = params;
  const wellById = new Map(wells.map((w) => [w.id, w]));
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "אפליקציית ניטור שטח";
  workbook.created = new Date();

  // טבלה 1 — קידוחים: נתוני מבנה קבועים.
  const wellsSheet = workbook.addWorksheet("טבלה 1 - קידוחים");
  wellsSheet.views = [{ rightToLeft: true }];
  wellsSheet.columns = [
    { header: "קוד קידוח", key: "code", width: 16 },
    { header: "X", key: "x", width: 10 },
    { header: "Y", key: "y", width: 10 },
    { header: "Z", key: "z", width: 10 },
    { header: "עומק קידוח (מ')", key: "wellDepth", width: 16 },
    { header: "קוטר קידוח (\")", key: "wellDiameter", width: 14 },
    { header: "אמצעי שאיבה נוכחי", key: "recoveryMethod", width: 18 },
  ];
  wellsSheet.insertRow(1, [`דוח רגולטורי — ניטור ופינוי עדשת דלק — ${site.name} — תקופה ${reportQuarter}`]);
  wellsSheet.mergeCells(1, 1, 1, wellsSheet.columns.length);
  wellsSheet.getRow(1).font = { bold: true, size: 12 };
  wellsSheet.getRow(2).font = { bold: true };
  for (const well of wells) {
    wellsSheet.addRow({
      code: well.code,
      x: well.x,
      y: well.y,
      z: well.z,
      wellDepth: well.wellDepth,
      wellDiameter: well.wellDiameter,
      recoveryMethod: RECOVERY_LABELS[well.recoveryMethod],
    });
  }

  // טבלה 2 — ניטור רבעוני: פר-קידוח, לתקופת הדוח שנבחרה.
  const quarterlySheet = workbook.addWorksheet("טבלה 2 - ניטור רבעוני");
  quarterlySheet.views = [{ rightToLeft: true }];
  quarterlySheet.columns = [
    { header: "קוד קידוח", key: "code", width: 16 },
    { header: "תאריך ביקור", key: "visitDate", width: 14 },
    { header: "עומק מים (מ')", key: "waterDepth", width: 14 },
    { header: "עומק מוצר צף (מ')", key: "productDepth", width: 16 },
    { header: "עובי עדשה (מ')", key: "lensThickness", width: 14 },
    ...(Object.keys(EVACUATION_METHOD_LABELS) as EvacuationMethod[]).map((m) => ({
      header: `פינוי - ${EVACUATION_METHOD_LABELS[m]} (ליטר)`,
      key: m,
      width: 18,
    })),
  ];
  quarterlySheet.getRow(1).font = { bold: true };
  const quarterlyVisits = visits.filter((v) => quarterKey(v.visitDate) === reportQuarter);
  for (const visit of quarterlyVisits.sort((a, b) => a.visitDate.localeCompare(b.visitDate))) {
    const litersByMethod = Object.fromEntries(
      (Object.keys(EVACUATION_METHOD_LABELS) as EvacuationMethod[]).map((m) => [
        m,
        cellOrDash(visit.evacuations.filter((e) => e.method === m).reduce((sum, e) => sum + e.liters, 0) || null),
      ]),
    );
    const row = quarterlySheet.addRow({
      code: wellById.get(visit.wellId)?.code ?? visit.wellId,
      visitDate: visit.visitDate,
      waterDepth: cellOrDash(visit.waterDepth),
      productDepth: cellOrDash(visit.productDepth),
      lensThickness: cellOrDash(visit.lensThickness),
      ...litersByMethod,
    });
    // עובי עדשה מודגש מעל 0.5 מ'.
    if (visit.lensThickness !== null && visit.lensThickness > 0.5) {
      row.getCell("lensThickness").font = { bold: true };
    }
  }

  // טבלה 3 — סקימר אקטיבי, מקובץ לפי מיכל משותף. כולל צבירה מצטברת
  // לאורך זמן (סעיף 8) — currentVolume לבדו הוא רק תמונת מצב מהביקור
  // האחרון, לא כמה שהמיכל הזה כבר אסף בסך הכול מאז שהחל להימדד.
  const tankSheet = workbook.addWorksheet("טבלה 3 - סקימר אקטיבי");
  tankSheet.views = [{ rightToLeft: true }];
  tankSheet.columns = [
    { header: "מיכל", key: "tank", width: 18 },
    { header: "קידוחים משויכים", key: "wells", width: 30 },
    { header: "נפח נוכחי (מהביקור האחרון)", key: "volume", width: 22 },
    { header: "רוקן מאז הביקור הקודם", key: "emptied", width: 20 },
    { header: "סה״כ נאסף לאורך זמן (ליטר)", key: "totalCollected", width: 22 },
  ];
  tankSheet.getRow(1).font = { bold: true };
  const activeSkimmerWells = wells.filter((w) => w.recoveryMethod === "active_skimmer" && w.tankId);
  const wellIdsByTank = new Map<string, Well[]>();
  for (const well of activeSkimmerWells) {
    const list = wellIdsByTank.get(well.tankId as string) ?? [];
    list.push(well);
    wellIdsByTank.set(well.tankId as string, list);
  }
  for (const tank of tanks) {
    const tankWells = wellIdsByTank.get(tank.id);
    if (!tankWells || tankWells.length === 0) continue;
    const tankWellIds = new Set(tankWells.map((w) => w.id));
    const tankVisits = visits.filter((v) => tankWellIds.has(v.wellId));
    const accumulation = computeTankAccumulation(tankVisits);
    const latestReading = tankVisits
      .filter((v) => v.tankReading)
      .sort((a, b) => b.visitDate.localeCompare(a.visitDate))[0];
    tankSheet.addRow({
      tank: tank.label,
      wells: tankWells.map((w) => w.code).join(", "),
      volume: accumulation.currentVolume ?? "—",
      emptied: latestReading?.tankReading ? (latestReading.tankReading.emptiedSincePrevious ? "כן" : "לא") : "—",
      totalCollected: accumulation.totalCollected,
    });
  }

  // נספח — היסטוריה מלאה מתחילת המדידות, פינוי כמספר כולל אחד.
  const historySheet = workbook.addWorksheet("נספח - היסטוריה מלאה");
  historySheet.views = [{ rightToLeft: true }];
  historySheet.columns = [
    { header: "קוד קידוח", key: "code", width: 16 },
    { header: "תאריך ביקור", key: "visitDate", width: 14 },
    { header: "עומק מים (מ')", key: "waterDepth", width: 14 },
    { header: "עומק מוצר צף (מ')", key: "productDepth", width: 16 },
    { header: "עובי עדשה (מ')", key: "lensThickness", width: 14 },
    { header: "פינוי כולל (ליטר)", key: "totalLiters", width: 16 },
  ];
  historySheet.getRow(1).font = { bold: true };
  const sortedHistory = [...visits].sort((a, b) => {
    const codeA = wellById.get(a.wellId)?.code ?? a.wellId;
    const codeB = wellById.get(b.wellId)?.code ?? b.wellId;
    return codeA === codeB ? a.visitDate.localeCompare(b.visitDate) : codeA.localeCompare(codeB);
  });
  for (const visit of sortedHistory) {
    const row = historySheet.addRow({
      code: wellById.get(visit.wellId)?.code ?? visit.wellId,
      visitDate: visit.visitDate,
      waterDepth: cellOrDash(visit.waterDepth),
      productDepth: cellOrDash(visit.productDepth),
      lensThickness: cellOrDash(visit.lensThickness),
      totalLiters: totalLiters(visit),
    });
    if (visit.lensThickness !== null && visit.lensThickness > 0.5) {
      row.getCell("lensThickness").font = { bold: true };
    }
  }

  return workbook.xlsx.writeBuffer();
}

export function downloadWorkbookBuffer(buffer: ExcelJS.Buffer, filename: string): void {
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
