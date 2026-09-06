"use client";

export interface TrendSeries {
  id: string;
  label: string;
  color: string;
  points: Array<{ date: string; value: number | null }>;
}

interface TrendChartProps {
  series: TrendSeries[];
  unit?: string;
}

const PALETTE = ["#2563eb", "#ea580c", "#16a34a", "#dc2626", "#7c3aed", "#0891b2"];

export const SERIES_COLORS = PALETTE;

const WIDTH = 760;
const HEIGHT = 260;
const MARGIN = { top: 12, right: 16, bottom: 28, left: 48 };

function formatDateShort(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y.slice(2)}`;
}

/** Dependency-free inline-SVG line chart — small enough not to warrant a charting library for this internal tool. */
export function TrendChart({ series, unit }: TrendChartProps) {
  const allPoints = series.flatMap((s) => s.points.filter((p) => p.value !== null));
  if (allPoints.length === 0) {
    return <p className="empty-hint">אין נתונים להצגה בטווח הזמן שנבחר.</p>;
  }

  const timestamps = allPoints.map((p) => new Date(p.date).getTime());
  const values = allPoints.map((p) => p.value as number);
  const minT = Math.min(...timestamps);
  const maxT = Math.max(...timestamps);
  const minV = Math.min(0, ...values);
  const maxVRaw = Math.max(...values);
  const maxV = maxVRaw === minV ? minV + 1 : maxVRaw + (maxVRaw - minV) * 0.1;

  const innerWidth = WIDTH - MARGIN.left - MARGIN.right;
  const innerHeight = HEIGHT - MARGIN.top - MARGIN.bottom;

  function x(dateIso: string): number {
    const t = new Date(dateIso).getTime();
    return maxT === minT ? innerWidth / 2 : ((t - minT) / (maxT - minT)) * innerWidth;
  }
  function y(value: number): number {
    return innerHeight - ((value - minV) / (maxV - minV)) * innerHeight;
  }

  const yTicks = 4;
  const yTickValues = Array.from({ length: yTicks + 1 }, (_, i) => minV + ((maxV - minV) * i) / yTicks);

  return (
    <div className="trend-chart">
      {/*
        Forced ltr: the page is dir="rtl", and SVG2 resolves text-anchor
        ("start"/"end") relative to the inherited `direction` — inheriting
        rtl here flips which edge "end" anchors to, so date labels placed
        assuming plain left-to-right geometry (x=0 is the earliest date)
        would render past the chart's right edge and get clipped.
      */}
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="גרף מגמה" style={{ direction: "ltr" }}>
        <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
          {yTickValues.map((v) => (
            <g key={v}>
              <line x1={0} x2={innerWidth} y1={y(v)} y2={y(v)} className="trend-gridline" />
              <text x={-8} y={y(v)} textAnchor="end" dominantBaseline="middle" className="trend-axis-label">
                {v.toFixed(1)}
              </text>
            </g>
          ))}
          <text x={-8} y={-2} textAnchor="end" className="trend-axis-label">
            {unit ?? ""}
          </text>

          <text x={0} y={innerHeight + 20} textAnchor="start" className="trend-axis-label">
            {formatDateShort(new Date(minT).toISOString().slice(0, 10))}
          </text>
          <text x={innerWidth} y={innerHeight + 20} textAnchor="end" className="trend-axis-label">
            {formatDateShort(new Date(maxT).toISOString().slice(0, 10))}
          </text>

          {series.map((s) => {
            const pts = s.points.filter((p) => p.value !== null) as Array<{ date: string; value: number }>;
            if (pts.length === 0) return null;
            const sorted = [...pts].sort((a, b) => a.date.localeCompare(b.date));
            const path = sorted.map((p) => `${x(p.date)},${y(p.value)}`).join(" ");
            return (
              <g key={s.id}>
                <polyline points={path} fill="none" stroke={s.color} strokeWidth={2} />
                {sorted.map((p) => (
                  <circle key={p.date} cx={x(p.date)} cy={y(p.value)} r={3} fill={s.color} />
                ))}
              </g>
            );
          })}
        </g>
      </svg>
      <div className="trend-legend">
        {series.map((s) => (
          <span key={s.id} className="trend-legend-item">
            <span className="trend-legend-swatch" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}
