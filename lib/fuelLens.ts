/** Lens thickness: water depth minus product depth, or unknown if either measurement is missing. */
export function computeLensThickness(waterDepth: number | null, productDepth: number | null): number | null {
  if (waterDepth === null || productDepth === null) return null;
  return waterDepth - productDepth;
}
