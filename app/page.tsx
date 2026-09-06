"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { signOutUser } from "@/lib/auth";
import { AdminApp } from "@/components/admin/AdminApp";
import { FieldApp } from "@/components/field/FieldApp";
import { DueThisMonthView } from "@/components/compliance/DueThisMonthView";
import { TrendsView } from "@/components/trends/TrendsView";
import "@/components/admin/admin.css";

type MainTab = "field" | "due" | "trends" | "admin";

export default function Home() {
  const router = useRouter();
  const { firebaseUser, appUser, loading, configError } = useAuth();
  const [mainTab, setMainTab] = useState<MainTab>("field");

  useEffect(() => {
    if (!loading && !firebaseUser) {
      router.replace("/login");
    }
  }, [loading, firebaseUser, router]);

  if (configError) {
    return (
      <main style={{ padding: "2rem", fontFamily: "system-ui, sans-serif", maxWidth: 480 }}>
        <h1>אפליקציית ניטור שטח</h1>
        <p style={{ color: "#b91c1c" }}>
          שגיאה באתחול Firebase: <code>{configError}</code>
        </p>
      </main>
    );
  }

  if (loading || !firebaseUser) {
    return (
      <main style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
        <p>בודק סטטוס התחברות…</p>
      </main>
    );
  }

  if (!appUser) {
    return (
      <main style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }} dir="rtl">
        <p>
          המשתמש מחובר אך טרם שויך לו תפקיד במערכת (<code>/users/{firebaseUser.uid}</code> חסר). פנו למנהל המערכת.
        </p>
        <button type="button" onClick={() => signOutUser()}>
          התנתק
        </button>
      </main>
    );
  }

  return (
    <main dir="rtl" style={{ padding: "1.5rem", fontFamily: "system-ui, sans-serif" }}>
      <div className="user-bar">
        <span>
          מחובר/ת כ-<strong>{appUser.username}</strong> ({appUser.role === "admin" ? "מנהל" : "טכנאי שטח"})
        </span>
        <button type="button" onClick={() => signOutUser()}>
          התנתק
        </button>
      </div>

      <h1>אפליקציית ניטור שטח</h1>
      <p>ניטור עדשת דלק, מערכות SVE / Bio-venting ודיגום מי תהום.</p>

      <nav className="tab-bar main-tab-bar">
        <button type="button" className={mainTab === "field" ? "active" : ""} onClick={() => setMainTab("field")}>
          טפסי שטח
        </button>
        <button type="button" className={mainTab === "due" ? "active" : ""} onClick={() => setMainTab("due")}>
          מה נדרש החודש
        </button>
        <button type="button" className={mainTab === "trends" ? "active" : ""} onClick={() => setMainTab("trends")}>
          דשבורד מגמות
        </button>
        {appUser.role === "admin" && (
          <button type="button" className={mainTab === "admin" ? "active" : ""} onClick={() => setMainTab("admin")}>
            הקמת אתר
          </button>
        )}
      </nav>

      {mainTab === "admin" && appUser.role === "admin" && <AdminApp />}
      {mainTab === "due" && <DueThisMonthView />}
      {mainTab === "trends" && <TrendsView />}
      {mainTab === "field" && <FieldApp />}
      {mainTab === "admin" && appUser.role !== "admin" && <FieldApp />}
    </main>
  );
}
