import type { FrequencyScope, SiteProtocolScope } from "@/lib/types";

/** Stable string key for a {siteId,protocol} | {systemId} scope union, for lookups/comparisons. */
export function scopeKey(scope: FrequencyScope): string {
  return "systemId" in scope ? `system:${scope.systemId}` : `site:${scope.siteId}:${scope.protocol}`;
}

export function scopeEquals(a: FrequencyScope, b: FrequencyScope): boolean {
  return scopeKey(a) === scopeKey(b);
}

export function siteScope(siteId: string, protocol: SiteProtocolScope): FrequencyScope {
  return { siteId, protocol };
}

export function systemScope(systemId: string): FrequencyScope {
  return { systemId };
}
