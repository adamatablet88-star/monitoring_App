# monitoring_app

אפליקציית ניטור שטח לייעוץ סביבתי — ניטור עדשת דלק, מערכות SVE,
מערכות Bio-venting ודיגום מי תהום. Next.js ללא שרת משלה — Firebase
(Realtime Database + Authentication) הוא כל שכבת הנתונים וההרשאות,
נקרא ישירות מה-client דרך ה-SDK. פרוס בנטליפיי כאתר סטטי.

פורט מלא של הלוגיקה העסקית מהפרויקט הקודם (Vite+React+Express+Postgres,
עם עבודה אופליין מלאה) לסטאק הזה — ראו "פערים ידועים" למטה למה **לא**
זהה במדויק, ולמה.

## הסטאק

- **Frontend**: Next.js (App Router), נבנה כ-static export (`output:
  "export"` ב-`next.config.ts`) — אין שרת Node, אין Netlify Function.
- **מסד נתונים**: Firebase **Realtime Database** (לא Firestore).
- **הרשאות**: Firebase Authentication (אימייל/סיסמה — שמות משתמש
  מתורגמים לכתובת מזויפת פנימית, ראו `lib/auth.ts`).
- אין Firebase Storage, אין שרת נפרד — כל קריאה/כתיבה הולכת ישירות
  מהדפדפן ל-Firebase דרך ה-SDK.

## מבנה האפליקציה

- `lib/types/` — מודל הנתונים המלא (לקוחות, אתרים, קידוחים, מיכלים,
  מערכות טיפול, פרמטרים, ביקורים, תדירויות, משתמשים).
- `lib/auth.ts` + `lib/auth-context.tsx` — התחברות, בדיקת תפקיד, יצירת
  משתמשים על ידי מנהל, והקמת המנהל הראשון (`/setup`, ראו `database.rules.json`).
- `components/admin/` — מסכי "הקמת אתר": לקוחות, אתרים, קידוחים, מיכלים,
  מערכות טיפול, פרמטרים, קידוחי מי תהום, ניהול משתמשים, תדירויות,
  סטטוס פעיל/לא-פעיל, דוחות רגולטוריים, בדיקות מתוזמנות.
- `components/field/` — 4 טפסי הביקור (עדשת דלק, SVE, Bio-venting,
  דיגום מי תהום), כולל "לא נמדד", ספי קריטיות, לוג ייצוב, הקשר היסטורי.
- `components/compliance/` — "מה נדרש החודש".
- `components/trends/` — דשבורד מגמות (גרפים משווים, טווחי זמן).
- `components/export/` — ייצוא Excel לדוח רגולטורי.
- `database.rules.json` — שכבת ההרשאות (RBAC) המלאה; ראו
  `docs/database-rules.md` להסבר מפורט. **חובה** להדביק את התוכן הזה
  ב-Firebase Console → Realtime Database → Rules — בלי זה שום דבר לא עובד.

## פערים ידועים מול המפרט המקורי

המפרט המקורי (`מסמך הנחיות פיתוח לקלוד קוד`) תוכנן לסטאק אחר
(Vite+React+Express+Postgres, עם Dexie/IndexedDB לעבודה אופליין). שלושה
פערים אמיתיים נמצאו בביקורת מול הסטאק הנוכחי:

1. **עבודה אופליין מלאה** — **הוחלט במפורש לוותר על זה**, כפשרה מודעת
   בהינתן הבחירה ב-Firebase+Netlify בלי שרת. Firebase RTDB בדפדפן שומר
   כתיבות בזיכרון כשאין רשת (מסתנכרן כשהיא חוזרת), אבל **לא** שומר אותן
   בעמידות במכשיר — אם טכנאי סוגר את הדפדפן בלי חיבור, מידע שהוזן עלול
   ללכת לאיבוד. אם בעתיד נדרשת עבודה אופליין אמיתית, זו תוספת ארכיטקטונית
   משמעותית (Service Worker + IndexedDB + תור סנכרון), לא תיקון קטן.
2. **זיהוי קונפליקטים בין שני טכנאים** — נבנה פתרון חלקי מותאם לסטאק:
   כל ביקור מקבל מזהה קבוע (`wellId/systemId + תאריך`, לא אקראי), ונשמר
   דרך עסקה אופטימית (`saveWithConflictCheck` ב-`lib/rtdb-collection.ts`)
   שמתריעה במקום לדרוס בשקט אם מישהו אחר כבר שמר את אותו ביקור בינתיים.
   זה **לא** זהה למנגנון הקונפליקטים המקורי (שהיה מבוסס על תור סנכרון
   אופליין מלא) — זה תופס כפילות בזמן אמת, לא כפילות שנוצרה תוך כדי
   ניתוק ממושך.
3. **הקשר היסטורי בטפסי SVE/Bio-venting** — קיים: תמצית "6 חודשים
   אחרונים: מינ׳/מקס׳/ממוצע" מוצגת ליד השדות המרכזיים ותחת מנוע
   הפרמטרים הגמיש (`components/field/fieldHistory.ts` +
   `FieldHistoryHint.tsx`).

## הקמה (Setup)

1. פתחו פרויקט ב-[console.firebase.google.com](https://console.firebase.google.com).
2. **Build → Realtime Database** → Create Database.
3. **Build → Authentication → Sign-in method** → הפעילו **Email/Password**.
4. **Project settings** (גלגל שיניים) → **General** → תחת "Your apps",
   הוסיפו Web app אם אין → העתיקו את ערכי הקונפיגורציה.
5. `cp .env.local.example .env.local` ומלאו את הערכים משלב 4.
6. הדביקו את התוכן של `database.rules.json` ב-Realtime Database → Rules
   ולחצו Publish — **בלי זה שום קריאה/כתיבה לא תעבוד**.
7. `npm install && npm run dev` → פתחו את הכתובת המודפסת.
8. גשו ל-`/setup` (חד-פעמי, ננעל לצמיתות אחרי השימוש הראשון) כדי ליצור
   את חשבון המנהל הראשון.

## פריסה (Netlify)

`netlify.toml` מריץ `npm run build` ומפרסם את `out/` — אתר סטטי טהור,
בלי Netlify Function ובלי Next.js runtime plugin, בהתאם לעיצוב "בלי שרת".

1. חברו את ה-repo הזה ב-[netlify.com](https://netlify.com) → **Add new
   project** → **Import an existing project**.
2. **Site configuration → Environment variables** — הוסיפו כל משתנה
   `NEXT_PUBLIC_FIREBASE_*` מ-`.env.local.example` עם הערכים האמיתיים.
   אלה נאפים לתוך ה-JS בזמן ה-build (לא נקראים בזמן ריצה — אין שרת
   שיקרא אותם), אז ה-build ייכשל (עם הודעה ברורה במסך, לא קריסה — ראו
   `lib/firebase.ts`) אם הם חסרים.
3. Deploy.

## פיתוח מקומי

```bash
npm run dev      # שרת פיתוח עם hot reload, http://localhost:3000
npm run build    # static export לייצור → out/
npm run lint
```
