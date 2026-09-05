"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { onAuthStateChanged, signInAnonymously, signOut, type User } from "firebase/auth";
import { onValue, ref, set } from "firebase/database";
import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebase";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Minimal proof that the Firebase wiring in lib/firebase.ts actually
 * works end to end — not the app's real UI. Exercises both pieces this
 * project needs: Auth (anonymous sign-in) and Realtime Database (a
 * value at /demo/message, synced live via onValue).
 */
export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [message, setMessage] = useState("");
  const [configError, setConfigError] = useState<string | null>(null);

  useEffect(() => {
    // getFirebaseAuth() throws synchronously if NEXT_PUBLIC_FIREBASE_*
    // is missing or invalid — an uncaught throw inside an effect is not
    // something an Error Boundary can catch (those only cover the
    // render phase), and React's response to an uncaught effect error
    // is to unmount the *entire* tree, not just this component
    // (confirmed by hitting exactly this with a deliberately-unset
    // config while building this page — the whole app went blank, not
    // just this section). Catching it here turns a blank page into an
    // actual, actionable message.
    try {
      return onAuthStateChanged(getFirebaseAuth(), (nextUser) => {
        setUser(nextUser);
        setAuthChecked(true);
      });
    } catch (error) {
      // Deferred to a microtask rather than called directly here: a
      // setState call synchronously inline in an effect body triggers
      // react-hooks/set-state-in-effect (cascading-render risk) — this
      // still runs before the next paint, just not as part of the
      // effect's own synchronous execution.
      queueMicrotask(() => {
        setConfigError(errorMessage(error));
        setAuthChecked(true);
      });
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    return onValue(ref(getFirebaseDb(), "demo/message"), (snapshot) => {
      setMessage((snapshot.val() as string | null) ?? "");
    });
  }, [user]);

  async function handleSignIn() {
    try {
      await signInAnonymously(getFirebaseAuth());
    } catch (error) {
      setConfigError(errorMessage(error));
    }
  }

  async function handleSignOut() {
    await signOut(getFirebaseAuth());
  }

  async function handleMessageChange(event: ChangeEvent<HTMLInputElement>) {
    const value = event.target.value;
    setMessage(value);
    await set(ref(getFirebaseDb(), "demo/message"), value);
  }

  if (configError) {
    return (
      <main style={{ padding: "2rem", fontFamily: "system-ui, sans-serif", maxWidth: 480 }}>
        <h1>Firebase wiring check</h1>
        <p style={{ color: "#b91c1c" }}>
          Firebase failed to initialize: <code>{configError}</code>
        </p>
        <p>
          Check that all <code>NEXT_PUBLIC_FIREBASE_*</code> variables are set (see{" "}
          <code>.env.local.example</code>) and that you rebuilt after setting them — these are inlined at build
          time, not read at runtime.
        </p>
      </main>
    );
  }

  return (
    <main style={{ padding: "2rem", fontFamily: "system-ui, sans-serif", maxWidth: 480 }}>
      <h1>Firebase wiring check</h1>

      {!authChecked ? (
        <p>Checking auth state…</p>
      ) : !user ? (
        <button type="button" onClick={handleSignIn}>
          Sign in anonymously
        </button>
      ) : (
        <>
          <p>
            Signed in as <code>{user.uid}</code>
            {user.isAnonymous ? " (anonymous)" : ""}
          </p>
          <button type="button" onClick={handleSignOut}>
            Sign out
          </button>

          <div style={{ marginTop: "1.5rem" }}>
            <label>
              Realtime Database demo — writes live to <code>/demo/message</code>:
              <input
                value={message}
                onChange={handleMessageChange}
                style={{ display: "block", marginTop: "0.5rem", width: "100%", padding: "0.5rem" }}
              />
            </label>
          </div>
        </>
      )}
    </main>
  );
}
