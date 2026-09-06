import type { NotMeasuredField, NotMeasuredReason } from "@/lib/types";

/** Editable-draft mirror of NotMeasuredField<number> — see admin/identityForm.ts for the same pattern. */
export interface NotMeasuredDraft {
  value: string;
  notMeasured: boolean;
  reason: NotMeasuredReason | "";
}

export const emptyNotMeasuredDraft: NotMeasuredDraft = { value: "", notMeasured: false, reason: "" };

export function notMeasuredFieldToDraft(field: NotMeasuredField<number> | undefined): NotMeasuredDraft {
  if (!field) return emptyNotMeasuredDraft;
  if (field.notMeasured?.flag) {
    return { value: "", notMeasured: true, reason: field.notMeasured.reason ?? "" };
  }
  return { value: field.value !== undefined ? String(field.value) : "", notMeasured: false, reason: "" };
}

export function draftToNotMeasuredField(draft: NotMeasuredDraft): NotMeasuredField<number> {
  if (draft.notMeasured) {
    return { notMeasured: { flag: true, reason: (draft.reason || null) as NotMeasuredReason | null } };
  }
  if (draft.value.trim()) {
    return { value: Number(draft.value) };
  }
  return {};
}
