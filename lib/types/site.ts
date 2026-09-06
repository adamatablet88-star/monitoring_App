/** Ported from field-monitoring-app/packages/shared/src/site.ts. */
export type ProtocolType = "fuelLens" | "SVE" | "bioVenting" | "groundwater";

export interface Client {
  id: string;
  name: string;
}

export interface Site {
  id: string;
  clientId: string;
  name: string;
  location: { lat: number; lng: number } | string;
  /** A site can run several protocol types in parallel ("combined" site). */
  protocolTypes: ProtocolType[];
}
