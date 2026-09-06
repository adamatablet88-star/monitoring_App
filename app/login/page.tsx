"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { signIn } from "@/lib/auth";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export default function LoginPage() {
  const router = useRouter();
  const { firebaseUser, loading, configError } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && firebaseUser) {
      router.replace("/");
    }
  }, [loading, firebaseUser, router]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await signIn(username, password);
      router.replace("/");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (configError) {
    return (
      <main style={{ padding: "2rem", fontFamily: "system-ui, sans-serif", maxWidth: 480 }}>
        <h1>התחברות</h1>
        <p style={{ color: "#b91c1c" }}>
          שגיאה באתחול Firebase: <code>{configError}</code>
        </p>
        <p>
          ודאו שכל משתני <code>NEXT_PUBLIC_FIREBASE_*</code> מוגדרים (ראו <code>.env.local.example</code>) ושביצעתם
          בנייה מחדש אחרי הגדרתם.
        </p>
      </main>
    );
  }

  return (
    <main style={{ padding: "2rem", fontFamily: "system-ui, sans-serif", maxWidth: 360 }}>
      <h1>התחברות</h1>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <label>
          שם משתמש
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
          />
        </label>
        {error && <p style={{ color: "#b91c1c" }}>שם משתמש או סיסמה שגויים</p>}
        <button type="submit" disabled={submitting}>
          {submitting ? "מתחבר…" : "התחברות"}
        </button>
      </form>
    </main>
  );
}
