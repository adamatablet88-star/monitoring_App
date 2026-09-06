"use client";

import { useEffect, useState, type FormEvent } from "react";
import { onAuthStateChanged, signInAnonymously, type User } from "firebase/auth";
import { onValue, push, ref } from "firebase/database";
import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebase";
import type { MonitoringPoint, NewMonitoringPoint } from "@/lib/types";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

const emptyForm: Record<keyof NewMonitoringPoint, string> = {
  code: "",
  x: "",
  y: "",
  z: "",
  wellDepth: "",
  wellDiameter: "",
} as Record<keyof NewMonitoringPoint, string>;

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);
  const [points, setPoints] = useState<MonitoringPoint[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    try {
      return onAuthStateChanged(getFirebaseAuth(), (nextUser) => {
        setUser(nextUser);
        setAuthChecked(true);
      });
    } catch (error) {
      queueMicrotask(() => {
        setConfigError(errorMessage(error));
        setAuthChecked(true);
      });
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    return onValue(ref(getFirebaseDb(), "monitoringPoints"), (snapshot) => {
      const value = snapshot.val() as Record<string, NewMonitoringPoint> | null;
      const list = value
        ? Object.entries(value).map(([id, data]) => ({ id, ...data }))
        : [];
      list.sort((a, b) => a.code.localeCompare(b.code));
      setPoints(list);
    });
  }, [user]);

  async function handleSignIn() {
    try {
      await signInAnonymously(getFirebaseAuth());
    } catch (error) {
      setConfigError(errorMessage(error));
    }
  }

  async function handleAddPoint(event: FormEvent) {
    event.preventDefault();
    if (!form.code.trim()) return;
    setSaving(true);
    try {
      const newPoint: NewMonitoringPoint = {
        code: form.code.trim(),
        x: Number(form.x) || 0,
        y: Number(form.y) || 0,
        z: Number(form.z) || 0,
        wellDepth: Number(form.wellDepth) || 0,
        wellDiameter: Number(form.wellDiameter) || 0,
      };
      await push(ref(getFirebaseDb(), "monitoringPoints"), newPoint);
      setForm(emptyForm);
    } finally {
      setSaving(false);
    }
  }

  if (configError) {
    return (
      <main style={{ padding: "2rem", fontFamily: "system-ui, sans-serif", maxWidth: 480 }}>
        <h1>רשימת ניטורים</h1>
        <p style={{ color: "#b91c1c" }}>
          שגיאה באתחול Firebase: <code>{configError}</code>
        </p>
        <p>
          ודאו שכל משתני <code>NEXT_PUBLIC_FIREBASE_*</code> מוגדרים (ראו <code>.env.local.example</code>) ושביצעתם
          בנייה מחדש אחרי הגדרתם — הם מוטמעים בזמן build, לא נקראים בזמן ריצה.
        </p>
      </main>
    );
  }

  if (!authChecked) {
    return (
      <main style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
        <p>בודק סטטוס התחברות…</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
        <h1>רשימת ניטורים</h1>
        <button type="button" onClick={handleSignIn}>
          התחברות
        </button>
      </main>
    );
  }

  return (
    <main style={{ padding: "2rem", fontFamily: "system-ui, sans-serif", maxWidth: 720 }}>
      <h1>רשימת ניטורים</h1>

      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "2rem" }}>
        <thead>
          <tr>
            {["קוד", "X", "Y", "Z", "עומק קידוח (מ')", "קוטר קידוח (מ')"].map((header) => (
              <th key={header} style={{ textAlign: "right", borderBottom: "1px solid #444", padding: "0.4rem" }}>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.id}>
              <td style={{ padding: "0.4rem", borderBottom: "1px solid #222" }}>{point.code}</td>
              <td style={{ padding: "0.4rem", borderBottom: "1px solid #222" }}>{point.x}</td>
              <td style={{ padding: "0.4rem", borderBottom: "1px solid #222" }}>{point.y}</td>
              <td style={{ padding: "0.4rem", borderBottom: "1px solid #222" }}>{point.z}</td>
              <td style={{ padding: "0.4rem", borderBottom: "1px solid #222" }}>{point.wellDepth}</td>
              <td style={{ padding: "0.4rem", borderBottom: "1px solid #222" }}>{point.wellDiameter}</td>
            </tr>
          ))}
          {points.length === 0 && (
            <tr>
              <td colSpan={6} style={{ padding: "0.75rem", color: "#888" }}>
                אין עדיין נקודות ניטור.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <h2>נקודת ניטור חדשה</h2>
      <form onSubmit={handleAddPoint} style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "end" }}>
        <label>
          קוד
          <input
            value={form.code}
            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
            style={{ display: "block", padding: "0.4rem" }}
            required
          />
        </label>
        {(["x", "y", "z"] as const).map((key) => (
          <label key={key}>
            {key.toUpperCase()}
            <input
              type="number"
              step="any"
              value={form[key]}
              onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              style={{ display: "block", padding: "0.4rem", width: "6rem" }}
            />
          </label>
        ))}
        <label>
          עומק קידוח (מ&apos;)
          <input
            type="number"
            step="any"
            value={form.wellDepth}
            onChange={(e) => setForm((f) => ({ ...f, wellDepth: e.target.value }))}
            style={{ display: "block", padding: "0.4rem", width: "8rem" }}
          />
        </label>
        <label>
          קוטר קידוח (מ&apos;)
          <input
            type="number"
            step="any"
            value={form.wellDiameter}
            onChange={(e) => setForm((f) => ({ ...f, wellDiameter: e.target.value }))}
            style={{ display: "block", padding: "0.4rem", width: "8rem" }}
          />
        </label>
        <button type="submit" disabled={saving}>
          {saving ? "שומר…" : "הוספה"}
        </button>
      </form>
    </main>
  );
}
