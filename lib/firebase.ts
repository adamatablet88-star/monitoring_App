import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getDatabase, type Database } from "firebase/database";

/**
 * Firebase client config — these values are meant to be public (they
 * identify the project, not authorize access to it); real access
 * control is enforced by Realtime Database security rules and
 * Firebase Auth, not by keeping this config secret. Still loaded from
 * env vars rather than hardcoded so different environments (local,
 * Netlify deploy previews, production) can point at different Firebase
 * projects without a code change.
 *
 * `databaseURL` is required here specifically because this app uses
 * Realtime Database, not Firestore — Firestore wouldn't need it.
 */
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp | undefined;
let authInstance: Auth | undefined;
let dbInstance: Database | undefined;

/**
 * Initialization is deliberately lazy and browser-only, not top-level
 * module state. This app has no server (per its design — Firebase is
 * the only backend), but `next build`'s static export still prerenders
 * a one-time HTML shell for every page, "use client" ones included, by
 * running the module in Node. Firebase's SDK validates the config the
 * moment getAuth()/getDatabase() is called; calling them eagerly at
 * module scope meant the build itself crashed with `auth/invalid-api-key`
 * whenever real credentials weren't set yet (discovered while building
 * this file) — deferring to first actual use in the browser means the
 * build always succeeds, and only using the app for real requires the
 * env vars to be set.
 */
function ensureApp(): FirebaseApp {
  if (typeof window === "undefined") {
    throw new Error("Firebase is client-only in this app — don't call this during server-side rendering.");
  }
  if (!app) {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  }
  return app;
}

export function getFirebaseAuth(): Auth {
  if (!authInstance) authInstance = getAuth(ensureApp());
  return authInstance;
}

export function getFirebaseDb(): Database {
  if (!dbInstance) dbInstance = getDatabase(ensureApp());
  return dbInstance;
}

/**
 * A throwaway, separately-named Firebase App sharing the same project
 * config. Used by admin-side user creation: Firebase Auth's client SDK
 * signs in as whoever createUserWithEmailAndPassword() just created, so
 * creating a new technician/admin login on the *primary* app would kick
 * the admin out of their own session. Running it on a secondary app
 * keeps the admin's session untouched; the caller is responsible for
 * signing the secondary app's user out and calling deleteApp() on it
 * once done.
 */
export function createSecondaryApp(name: string): FirebaseApp {
  if (typeof window === "undefined") {
    throw new Error("Firebase is client-only in this app — don't call this during server-side rendering.");
  }
  const existing = getApps().find((candidate) => candidate.name === name);
  return existing ?? initializeApp(firebaseConfig, name);
}
