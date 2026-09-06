/**
 * Auth helper module — full port of the original project's login/RBAC
 * concept onto Firebase Authentication, since there's no server here to
 * issue JWTs or look up roles itself.
 *
 * The original app used plain usernames; Firebase Auth's email/password
 * provider requires an email address, so usernames are mapped to a
 * synthetic address under a fixed fake domain. Users never see this —
 * they type a username, this module does the conversion.
 */
import { deleteApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User as FirebaseUser,
} from "firebase/auth";
import { get, ref, set } from "firebase/database";
import { createSecondaryApp, getFirebaseAuth, getFirebaseDb } from "./firebase";
import type { AppUser, Role } from "./types/user";

const EMAIL_DOMAIN = "monitoring-app.local";

function usernameToEmail(username: string): string {
  return `${username.trim().toLowerCase()}@${EMAIL_DOMAIN}`;
}

export async function signIn(username: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(getFirebaseAuth(), usernameToEmail(username), password);
}

export async function signOutUser(): Promise<void> {
  await signOut(getFirebaseAuth());
}

/** Reads the role mapping at /users/{uid} — never trust a role from anywhere else. */
export async function fetchAppUser(uid: string): Promise<AppUser | null> {
  const snapshot = await get(ref(getFirebaseDb(), `users/${uid}`));
  if (!snapshot.exists()) return null;
  return snapshot.val() as AppUser;
}

export function subscribeToAuthChanges(callback: (user: FirebaseUser | null) => void): () => void {
  return onAuthStateChanged(getFirebaseAuth(), callback);
}

/**
 * Admin-only user creation. createUserWithEmailAndPassword() signs the
 * SDK in as the account it just created, so running it on the primary
 * app would sign the admin out of their own session mid-operation — it
 * runs on a throwaway secondary Firebase App instance instead, and the
 * role mapping is written from the admin's own (primary) session
 * afterward, since database.rules.json only lets an admin write to
 * /users/{uid} for any uid.
 */
export async function createUser(username: string, password: string, role: Role): Promise<void> {
  const secondaryApp = createSecondaryApp(`secondary-${Date.now()}`);
  const secondaryAuth = getAuth(secondaryApp);
  try {
    const credential = await createUserWithEmailAndPassword(
      secondaryAuth,
      usernameToEmail(username),
      password,
    );
    const uid = credential.user.uid;
    const appUser: AppUser = { uid, username: username.trim(), role };
    await set(ref(getFirebaseDb(), `users/${uid}`), appUser);
  } finally {
    await signOut(secondaryAuth).catch(() => {});
    await deleteApp(secondaryApp).catch(() => {});
  }
}
