import type { FrequencyScope } from "@/lib/types";

/** Stable string key for a {siteId} | {systemId} scope union, for lookups/comparisons. */
export function scopeKey(scope: FrequencyScope): string {
  return "siteId" in scope ? `site:${scope.siteId}` : `system:${scope.systemId}`;
}

export function scopeEquals(a: FrequencyScope, b: FrequencyScope): boolean {
  return scopeKey(a) === scopeKey(b);
}

export function siteScope(siteId: string): FrequencyScope {
  return { siteId };
}

export function systemScope(systemId: string): FrequencyScope {
  return { systemId };
}
