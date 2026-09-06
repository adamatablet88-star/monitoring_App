"use client";

import { useState } from "react";
import type { ScheduledSpecialTest, SpecialTestType, SystemType, TreatmentSystem } from "@/lib/types";
import { newId, useCollection } from "@/lib/rtdb-collection";

const TEST_TYPE_LABELS: Record<SpecialTestType, string> = {
  "TO-15": "TO-15",
  annual_oxygen_consumption: "מבחן צריכת חמצן שנתי",
};

/** TO-15: quarterly for SVE, annual for Bio-venting. Oxygen test: annual, Bio-venting only. */
function allowedTestsFor(systemType: SystemType): Array<{ testType: SpecialTestType; frequency: ScheduledSpecialTest["frequency"] }> {
  if (systemType === "SVE") {
    return [{ testType: "TO-15", frequency: "quarterly" }];
  }
  return [
    { testType: "TO-15", frequency: "annual" },
    { testType: "annual_oxygen_consumption", frequency: "annual" },
  ];
}

const FREQUENCY_LABELS_HE = { quarterly: "רבעוני", semiannual: "חצי שנתי", annual: "שנתי" } as const;

interface ScheduledSpecialTestsPanelProps {
  siteId: string;
}

export function ScheduledSpecialTestsPanel({ siteId }: ScheduledSpecialTestsPanelProps) {
  const { items: allTests, save, remove } = useCollection<ScheduledSpecialTest>("scheduledSpecialTests");
  const { items: allSystems } = useCollection<TreatmentSystem>("treatmentSystems");
  const systems = allSystems.filter((s) => s.siteId === siteId);

  const [addingForSystemId, setAddingForSystemId] = useState<string | null>(null);
  const [selectedTestType, setSelectedTestType] = useState<SpecialTestType>("TO-15");

  function startAdd(system: TreatmentSystem) {
    setAddingForSystemId(system.id);
    setSelectedTestType(allowedTestsFor(system.systemType)[0].testType);
  }

  async function handleSubmit(e: React.FormEvent, system: TreatmentSystem) {
    e.preventDefault();
    const option = allowedTestsFor(system.systemType).find((o) => o.testType === selectedTestType);
    if (!option) return;
    await save({ id: newId(), scope: { systemId: system.id }, testType: option.testType, frequency: option.frequency });
    setAddingForSystemId(null);
  }

  if (systems.length === 0) {
    return (
      <section className="panel">
        <h2>בדיקות מיוחדות מתוזמנות</h2>
        <p className="empty-hint">אין עדיין מערכות טיפול באתר זה — יש להקים מערכת SVE / Bio-venting תחילה.</p>
      </section>
    );
  }

  return (
    <section className="panel">
      <h2>בדיקות מיוחדות מתוזמנות</h2>
      {systems.map((system) => {
        const tests = allTests.filter((t) => t.scope.systemId === system.id);
        const options = allowedTestsFor(system.systemType);
        return (
          <div key={system.id} className="stacked-item">
            <h3>
              [{system.systemType}] {system.systemLabel}
            </h3>
            <ul className="entity-list">
              {tests.map((test) => (
                <li key={test.id}>
                  <span className="entity-row static">
                    {TEST_TYPE_LABELS[test.testType]} — {FREQUENCY_LABELS_HE[test.frequency]}
                  </span>
                  <button type="button" className="danger-link" onClick={() => remove(test)}>
                    מחק
                  </button>
                </li>
              ))}
              {tests.length === 0 && <li className="empty-hint">אין בדיקות מתוזמנות למערכת זו</li>}
            </ul>

            {addingForSystemId === system.id ? (
              <form onSubmit={(e) => handleSubmit(e, system)} className="inline-form">
                <label>
                  סוג בדיקה
                  <select value={selectedTestType} onChange={(e) => setSelectedTestType(e.target.value as SpecialTestType)}>
                    {options.map((o) => (
                      <option key={o.testType} value={o.testType}>
                        {TEST_TYPE_LABELS[o.testType]} ({FREQUENCY_LABELS_HE[o.frequency]})
                      </option>
                    ))}
                  </select>
                </label>
                <button type="submit">שמור</button>
                <button type="button" onClick={() => setAddingForSystemId(null)}>
                  ביטול
                </button>
              </form>
            ) : (
              <button type="button" onClick={() => startAdd(system)}>
                + בדיקה מתוזמנת
              </button>
            )}
          </div>
        );
      })}
    </section>
  );
}
