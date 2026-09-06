"use client";

import type { MonitoringPointDepthReading } from "@/lib/types";
import { newId } from "@/lib/rtdb-collection";

export interface MonitoringPointDraft {
  id: string;
  pointCode: string;
  depths: MonitoringPointDepthReading[];
}

const emptyDepth: MonitoringPointDepthReading = { depth: 0, o2: 0, co2: 0, ch4: 0, pid: 0, vacuum: 0 };

interface MonitoringPointFieldsProps {
  points: MonitoringPointDraft[];
  onChange: (points: MonitoringPointDraft[]) => void;
}

/** Variable number of monitoring points, each with a variable number of depths. */
export function MonitoringPointFields({ points, onChange }: MonitoringPointFieldsProps) {
  function addPoint() {
    onChange([...points, { id: newId(), pointCode: "", depths: [] }]);
  }
  function updatePoint(index: number, patch: Partial<MonitoringPointDraft>) {
    onChange(points.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  }
  function removePoint(index: number) {
    onChange(points.filter((_, i) => i !== index));
  }
  function addDepth(pointIndex: number) {
    updatePoint(pointIndex, { depths: [...points[pointIndex].depths, { ...emptyDepth }] });
  }
  function updateDepth(pointIndex: number, depthIndex: number, patch: Partial<MonitoringPointDepthReading>) {
    const depths = points[pointIndex].depths.map((d, i) => (i === depthIndex ? { ...d, ...patch } : d));
    updatePoint(pointIndex, { depths });
  }
  function removeDepth(pointIndex: number, depthIndex: number) {
    updatePoint(pointIndex, { depths: points[pointIndex].depths.filter((_, i) => i !== depthIndex) });
  }

  return (
    <fieldset>
      <legend>נקודות ועומקי ניטור</legend>
      {points.map((point, pointIndex) => (
        <div key={point.id} className="monitoring-point">
          <div className="field-row">
            <label>
              קוד נקודה
              <input
                value={point.pointCode}
                onChange={(e) => updatePoint(pointIndex, { pointCode: e.target.value })}
                placeholder="למשל S-1"
              />
            </label>
            <button type="button" className="danger-link" onClick={() => removePoint(pointIndex)}>
              הסר נקודה
            </button>
          </div>

          {point.depths.map((depth, depthIndex) => (
            <div className="field-row depth-row" key={depthIndex}>
              <label>
                עומק
                <input
                  type="number"
                  step="any"
                  value={depth.depth}
                  onChange={(e) => updateDepth(pointIndex, depthIndex, { depth: Number(e.target.value) })}
                />
              </label>
              <label>
                O2
                <input
                  type="number"
                  step="any"
                  value={depth.o2}
                  onChange={(e) => updateDepth(pointIndex, depthIndex, { o2: Number(e.target.value) })}
                />
              </label>
              <label>
                CO2
                <input
                  type="number"
                  step="any"
                  value={depth.co2}
                  onChange={(e) => updateDepth(pointIndex, depthIndex, { co2: Number(e.target.value) })}
                />
              </label>
              <label>
                מתאן (CH4)
                <input
                  type="number"
                  step="any"
                  value={depth.ch4}
                  onChange={(e) => updateDepth(pointIndex, depthIndex, { ch4: Number(e.target.value) })}
                />
              </label>
              <label>
                PID
                <input
                  type="number"
                  step="any"
                  value={depth.pid}
                  onChange={(e) => updateDepth(pointIndex, depthIndex, { pid: Number(e.target.value) })}
                />
              </label>
              <label>
                וואקום
                <input
                  type="number"
                  step="any"
                  value={depth.vacuum}
                  onChange={(e) => updateDepth(pointIndex, depthIndex, { vacuum: Number(e.target.value) })}
                />
              </label>
              <button type="button" className="danger-link" onClick={() => removeDepth(pointIndex, depthIndex)}>
                הסר עומק
              </button>
            </div>
          ))}
          <button type="button" onClick={() => addDepth(pointIndex)}>
            + הוסף עומק
          </button>
        </div>
      ))}
      <button type="button" onClick={addPoint}>
        + הוסף נקודת ניטור
      </button>
    </fieldset>
  );
}
