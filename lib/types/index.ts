/**
 * Single source of truth for the app's domain types — full port of
 * field-monitoring-app/packages/shared, adapted for a client-only
 * Firebase Realtime Database backend (no server, no sync-bookkeeping
 * columns split out separately — createdBy/createdAt live directly on
 * the visit types since RTDB Security Rules validate them at write
 * time, there's no server middleware to stamp them after the fact).
 */
export * from "./identity";
export * from "./site";
export * from "./well";
export * from "./treatmentSystem";
export * from "./visits";
export * from "./frequency";
export * from "./admin";
export * from "./user";
