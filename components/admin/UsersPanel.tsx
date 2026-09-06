"use client";

import { useEffect, useState } from "react";
import { onValue, ref } from "firebase/database";
import type { Role } from "@/lib/types";
import type { AppUser } from "@/lib/types/user";
import { getFirebaseDb } from "@/lib/firebase";
import { createUser } from "@/lib/auth";

const ROLE_LABELS: Record<Role, string> = {
  admin: "מנהל",
  technician: "טכנאי שטח",
};

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (error.message.includes("auth/email-already-in-use")) return "שם המשתמש כבר תפוס";
    if (error.message.includes("auth/weak-password")) return "הסיסמה חייבת להכיל לפחות 6 תווים";
    return error.message;
  }
  return String(error);
}

/**
 * Admin-only user management, ported from apps/client/src/admin/UsersPanel.tsx.
 * The original went through a server REST endpoint that hashed the
 * password and inserted the row; there's no server here, so createUser()
 * (lib/auth.ts) creates the Firebase Auth account directly via a
 * throwaway secondary app instance, then writes the role mapping.
 */
export function UsersPanel() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("technician");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    return onValue(
      ref(getFirebaseDb(), "users"),
      (snapshot) => {
        const value = snapshot.val() as Record<string, AppUser> | null;
        setUsers(value ? Object.values(value) : []);
      },
      (err) => console.error("failed to read users", err),
    );
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await createUser(username.trim(), password, role);
      setUsername("");
      setPassword("");
      setRole("technician");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="panel">
      <h2>משתמשים</h2>
      <ul className="entity-list">
        {users.map((u) => (
          <li key={u.uid}>
            <span className="entity-row static">
              {u.username} — {ROLE_LABELS[u.role]}
            </span>
          </li>
        ))}
        {users.length === 0 && <li className="empty-hint">אין עדיין משתמשים.</li>}
      </ul>

      <form onSubmit={handleSubmit} className="inline-form stacked">
        <label>
          שם משתמש
          <input value={username} onChange={(e) => setUsername(e.target.value)} required />
        </label>
        <label>
          סיסמה
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
        </label>
        <label>
          תפקיד
          <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
            <option value="technician">{ROLE_LABELS.technician}</option>
            <option value="admin">{ROLE_LABELS.admin}</option>
          </select>
        </label>
        {error && <p className="field-error">{error}</p>}
        <button type="submit" disabled={submitting}>
          {submitting ? "יוצר…" : "צור משתמש"}
        </button>
      </form>
    </section>
  );
}
