"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { bootstrapFirstAdmin, isSetupComplete } from "@/lib/auth";

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (error.message.includes("auth/email-already-in-use")) return "שם המשתמש הזה כבר תפוס";
    if (error.message.includes("auth/weak-password")) return "הסיסמה חייבת להכיל לפחות 6 תווים";
    if (error.message.includes("PERMISSION_DENIED")) return "כבר קיים משתמש במערכת — ההתקנה הראשונית כבר בוצעה.";
    return error.message;
  }
  return String(error);
}

type Phase = "checking" | "available" | "already-set-up" | "done";

export default function SetupPage() {
  const router = useRouter();
  const { configError } = useAuth();
  const [phase, setPhase] = useState<Phase>("checking");
  const [checkError, setCheckError] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (configError) return;
    isSetupComplete()
      .then((done) => setPhase(done ? "already-set-up" : "available"))
      .catch((err) => queueMicrotask(() => setCheckError(errorMessage(err))));
  }, [configError]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitError(null);
    if (password !== confirmPassword) {
      setSubmitError("הסיסמאות אינן זהות");
      return;
    }
    setSubmitting(true);
    try {
      await bootstrapFirstAdmin(username, password);
      setPhase("done");
      router.replace("/");
    } catch (err) {
      setSubmitError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (configError) {
    return (
      <main style={{ padding: "2rem", fontFamily: "system-ui, sans-serif", maxWidth: 480 }}>
        <h1>הגדרה ראשונית</h1>
        <p style={{ color: "#b91c1c" }}>
          שגיאה באתחול Firebase: <code>{configError}</code>
        </p>
      </main>
    );
  }

  if (checkError) {
    return (
      <main style={{ padding: "2rem", fontFamily: "system-ui, sans-serif", maxWidth: 480 }} dir="rtl">
        <h1>הגדרה ראשונית</h1>
        <p style={{ color: "#b91c1c" }}>שגיאה בבדיקת מצב המערכת: {checkError}</p>
      </main>
    );
  }

  if (phase === "checking") {
    return (
      <main style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }} dir="rtl">
        <p>בודק אם המערכת כבר הוגדרה…</p>
      </main>
    );
  }

  if (phase === "already-set-up") {
    return (
      <main style={{ padding: "2rem", fontFamily: "system-ui, sans-serif", maxWidth: 480 }} dir="rtl">
        <h1>ההתקנה כבר בוצעה</h1>
        <p>קיים כבר לפחות משתמש אחד במערכת, כך שההגדרה הראשונית אינה זמינה יותר.</p>
        <p>
          משתמש נוסף נוצר על ידי מנהל קיים, דרך מסך &quot;הקמת אתר → משתמשים&quot; לאחר התחברות.
        </p>
        <button type="button" onClick={() => router.push("/login")}>
          למסך התחברות
        </button>
      </main>
    );
  }

  return (
    <main style={{ padding: "2rem", fontFamily: "system-ui, sans-serif", maxWidth: 380 }} dir="rtl">
      <h1>הגדרה ראשונית</h1>
      <p className="hint">
        זו הפעם הראשונה שהמערכת מופעלת — אין בה עדיין אף משתמש. הטופס הזה יוצר את חשבון המנהל הראשון, ואז נעול לצמיתות.
      </p>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <label>
          שם משתמש למנהל
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{ display: "block", width: "100%", padding: "0.5rem" }}
            required
            autoFocus
          />
        </label>
        <label>
          סיסמה
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ display: "block", width: "100%", padding: "0.5rem" }}
            required
            minLength={6}
          />
        </label>
        <label>
          אימות סיסמה
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            style={{ display: "block", width: "100%", padding: "0.5rem" }}
            required
            minLength={6}
          />
        </label>
        {submitError && <p style={{ color: "#b91c1c" }}>{submitError}</p>}
        <button type="submit" disabled={submitting}>
          {submitting ? "יוצר חשבון מנהל…" : "צור חשבון מנהל"}
        </button>
      </form>
    </main>
  );
}
