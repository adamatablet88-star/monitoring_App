# monitoring_app

Next.js app with no backend of its own — Firebase (Realtime Database +
Authentication) is the entire data/auth layer, called directly from the
client via the Firebase SDK. Deployed to Netlify as a static export.

## Stack

- **Frontend**: Next.js (App Router), built as a static export (`output:
  "export"` in `next.config.ts`) — no Node server, no Netlify Function.
- **Database**: Firebase **Realtime Database** (not Firestore).
- **Auth**: Firebase Authentication.
- No Firebase Storage, no separate backend — every read/write goes
  straight from the browser to Firebase through the SDK.

## Setup

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
   (or use an existing one).
2. **Build → Realtime Database** → Create Database. Pick a location,
   and a starting mode for the security rules (see below — you'll
   likely want to tighten these before real use).
3. **Build → Authentication** → Get started → enable at least one
   sign-in provider. The demo page (`app/page.tsx`) uses **Anonymous**
   sign-in — enable that one to try it as-is; swap it for Email/Password
   or another provider for real use.
4. **Project settings** (gear icon) → **General** → under "Your apps,"
   add a Web app if none exists → copy the config values shown there.
5. `cp .env.local.example .env.local` and fill in the values from step 4.
6. `npm install && npm run dev` → open the printed localhost URL. The
   home page proves the wiring works: sign in anonymously, then type in
   the text field — it read/writes `/demo/message` in Realtime Database
   live.

## Security rules

A fresh Realtime Database usually starts either fully locked down or
fully open, neither of which is right long-term. Since there's no
backend to enforce access rules in code, **Realtime Database's own
security rules are the only access control this app has** — set them
deliberately (Realtime Database → Rules tab) once real data/paths are
defined, rather than relying on the default.

## Deploying (Netlify)

`netlify.toml` runs `npm run build` and publishes `out/` — a plain
static site, no Netlify Function or Next.js runtime plugin involved,
matching the "no backend" design.

1. Push this repo to GitHub (already done if you're reading this from
   the repo).
2. [netlify.com](https://netlify.com) → **Add new project** → **Import
   an existing project** → connect this repo.
3. **Site configuration → Environment variables** — add every
   `NEXT_PUBLIC_FIREBASE_*` variable from `.env.local.example` with
   your real values. These get baked into the built JS at build time
   (not read at runtime — there's no server to read them), so the build
   will fail (with a clear message on the page, not a crash — see
   `lib/firebase.ts`) if they're missing.
4. Deploy.

## Local development

```bash
npm run dev      # dev server with hot reload, http://localhost:3000
npm run build    # production static export → out/
npm run lint
```
