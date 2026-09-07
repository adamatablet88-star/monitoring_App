/**
 * Shared arithmetic for the flexible parameter engine (spec 5.4/6.5) —
 * pulled out of ExtraParametersFields so the sign-flip and soft-range
 * rules are independently testable.
 */

/** What gets written to the database: a technician-typed magnitude, negated for invertSign (vacuum) parameters. */
export function toStorageValue(typed: number, invertSign: boolean): number {
  return invertSign ? -Math.abs(typed) : typed;
}

/** What the technician sees: a stored value, sign-flipped back to a positive magnitude for invertSign parameters. */
export function toDisplayValue(stored: number, invertSign: boolean): number {
  return invertSign ? Math.abs(stored) : stored;
}

/** Soft-warning range check — never blocks saving, just flags the reading. */
export function isOutOfRange(value: number, minValue: number | null, maxValue: number | null): boolean {
  return (minValue !== null && value < minValue) || (maxValue !== null && value > maxValue);
}
