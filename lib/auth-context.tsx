"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User as FirebaseUser } from "firebase/auth";
import { fetchAppUser, subscribeToAuthChanges } from "./auth";
import type { AppUser } from "./types/user";

interface AuthContextValue {
  firebaseUser: FirebaseUser | null;
  appUser: AppUser | null;
  loading: boolean;
  /** Set when Firebase itself failed to initialize (bad/missing env config). */
  configError: string | null;
}

const AuthContext = createContext<AuthContextValue>({
  firebaseUser: null,
  appUser: null,
  loading: true,
  configError: null,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthContextValue>({
    firebaseUser: null,
    appUser: null,
    loading: true,
    configError: null,
  });

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    try {
      unsubscribe = subscribeToAuthChanges((firebaseUser) => {
        if (!firebaseUser) {
          setState({ firebaseUser: null, appUser: null, loading: false, configError: null });
          return;
        }
        fetchAppUser(firebaseUser.uid)
          .then((appUser) => setState({ firebaseUser, appUser, loading: false, configError: null }))
          .catch(() => setState({ firebaseUser, appUser: null, loading: false, configError: null }));
      });
    } catch (err) {
      // Firebase config invalid — see lib/firebase.ts. Deferred to a
      // microtask: setState synchronously inside an effect body throws
      // lint's react-hooks/set-state-in-effect, and (learned the hard way
      // building this app) an uncaught synchronous throw here would
      // unmount the whole React tree, not just this component.
      const message = err instanceof Error ? err.message : String(err);
      queueMicrotask(() => {
        setState({ firebaseUser: null, appUser: null, loading: false, configError: message });
      });
    }
    return () => unsubscribe?.();
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
