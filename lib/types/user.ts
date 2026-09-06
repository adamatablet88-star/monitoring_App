/**
 * Ported from field-monitoring-app/packages/shared/src/user.ts. No
 * passwordHash here — Firebase Authentication owns credentials entirely;
 * this is just the role mapping, stored at /users/{uid} keyed by the
 * Firebase Auth UID.
 */
export type Role = "admin" | "technician";

export interface AppUser {
  uid: string;
  username: string;
  role: Role;
}
