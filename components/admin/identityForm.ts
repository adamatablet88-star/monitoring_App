import type { WellIdentity } from "@/lib/types";

/**
 * Ported from field-monitoring-app/apps/client/src/admin/identityForm.ts.
 * Shared editable-draft shape for the "physical identity" fields common
 * to fuel-lens wells, treatment wells, and groundwater wells: X/Y/Z,
 * manhole, depth/diameter, screened interval. Kept as strings while
 * editing so number inputs can be temporarily empty/partial.
 */
export interface IdentityDraft {
  code: string;
  x: string;
  y: string;
  z: string;
  toc: string;
  manholeMaterial: "concrete" | "iron";
  manholeSize: string;
  wellDepth: string;
  wellDiameter: string;
  screenFrom: string;
  screenTo: string;
}

export const emptyIdentityDraft: IdentityDraft = {
  code: "",
  x: "",
  y: "",
  z: "",
  toc: "",
  manholeMaterial: "concrete",
  manholeSize: "",
  wellDepth: "",
  wellDiameter: "",
  screenFrom: "",
  screenTo: "",
};

export function identityToDraft(entity: WellIdentity): IdentityDraft {
  return {
    code: entity.code,
    x: String(entity.x),
    y: String(entity.y),
    z: String(entity.z),
    toc: String(entity.toc),
    manholeMaterial: entity.manhole.material,
    manholeSize: entity.manhole.size,
    wellDepth: String(entity.wellDepth),
    wellDiameter: String(entity.wellDiameter),
    screenFrom: String(entity.screenInterval.from),
    screenTo: String(entity.screenInterval.to),
  };
}

export function draftToIdentity(draft: IdentityDraft): Omit<WellIdentity, "id"> {
  return {
    code: draft.code.trim(),
    x: Number(draft.x),
    y: Number(draft.y),
    z: Number(draft.z),
    toc: Number(draft.toc),
    manhole: { material: draft.manholeMaterial, size: draft.manholeSize.trim() },
    wellDepth: Number(draft.wellDepth),
    wellDiameter: Number(draft.wellDiameter),
    screenInterval: { from: Number(draft.screenFrom), to: Number(draft.screenTo) },
  };
}

export function isIdentityDraftValid(draft: IdentityDraft): boolean {
  return (
    draft.code.trim().length > 0 &&
    draft.manholeSize.trim().length > 0 &&
    [draft.x, draft.y, draft.z, draft.toc, draft.wellDepth, draft.wellDiameter, draft.screenFrom, draft.screenTo].every(
      (v) => v.trim().length > 0 && !Number.isNaN(Number(v)),
    )
  );
}
