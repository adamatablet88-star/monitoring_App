"use client";

import type { IdentityDraft } from "./identityForm";

interface IdentityFieldsProps {
  draft: IdentityDraft;
  onChange: (patch: Partial<IdentityDraft>) => void;
}

/**
 * "תעודת הזהות" הפיזית הקבועה של קידוח — משותפת לקידוח עדשת דלק, קידוח
 * תחת מערכת טיפול, וקידוח ניטור מי תהום.
 */
export function IdentityFields({ draft, onChange }: IdentityFieldsProps) {
  return (
    <>
      <label>
        קוד קידוח
        <input value={draft.code} onChange={(e) => onChange({ code: e.target.value })} required />
      </label>

      <div className="field-row">
        <label>
          X
          <input type="number" step="any" value={draft.x} onChange={(e) => onChange({ x: e.target.value })} required />
        </label>
        <label>
          Y
          <input type="number" step="any" value={draft.y} onChange={(e) => onChange({ y: e.target.value })} required />
        </label>
        <label>
          Z (גובה/רום)
          <input type="number" step="any" value={draft.z} onChange={(e) => onChange({ z: e.target.value })} required />
        </label>
      </div>

      <div className="field-row">
        <label>
          שוחה — סוג
          <select
            value={draft.manholeMaterial}
            onChange={(e) => onChange({ manholeMaterial: e.target.value as IdentityDraft["manholeMaterial"] })}
          >
            <option value="concrete">בטון</option>
            <option value="iron">ברזל</option>
          </select>
        </label>
        <label>
          שוחה — מידה
          <input
            value={draft.manholeSize}
            onChange={(e) => onChange({ manholeSize: e.target.value })}
            placeholder='למשל 70 ס&quot;מ או 10 אינץ&apos;'
            required
          />
        </label>
      </div>

      <div className="field-row">
        <label>
          עומק קידוח (מ&apos;)
          <input
            type="number"
            step="any"
            value={draft.wellDepth}
            onChange={(e) => onChange({ wellDepth: e.target.value })}
            required
          />
        </label>
        <label>
          קוטר קידוח
          <input
            type="number"
            step="any"
            value={draft.wellDiameter}
            onChange={(e) => onChange({ wellDiameter: e.target.value })}
            required
          />
        </label>
      </div>

      <div className="field-row">
        <label>
          מקטע מחורץ — התחלה (מ&apos;)
          <input
            type="number"
            step="any"
            value={draft.screenFrom}
            onChange={(e) => onChange({ screenFrom: e.target.value })}
            required
          />
        </label>
        <label>
          מקטע מחורץ — סיום (מ&apos;)
          <input
            type="number"
            step="any"
            value={draft.screenTo}
            onChange={(e) => onChange({ screenTo: e.target.value })}
            required
          />
        </label>
      </div>
    </>
  );
}
