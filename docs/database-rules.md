# Realtime Database Security Rules — design notes

`database.rules.json` is strict JSON as required by Firebase (no comments
allowed in the file itself — an earlier draft embedded explanatory
`"_comment_*"` string fields directly in the rules tree, which is invalid:
every non-`.read`/`.write`/`.validate`/`.indexOn` key must map to a nested
rules object, never a plain string. Confirmed against a locally-run
Database Emulator, which rejected the file with `"6:22: Expected '{'."`
pointing straight at the first comment field). This document is where that
explanatory context lives instead.

There is no server in this app — these rules **are** the entire
access-control layer, replacing what used to be Express middleware
(`apps/server/src/sync/permissions.ts` in the original project). A role is
always looked up via `root.child('users').child(auth.uid).child('role')`,
never trusted from client-submitted data.

## `meta/setupComplete` and the first-admin bootstrap

A public boolean, readable even when signed out (`/setup` must be able to
decide whether to show itself before anyone is authenticated — the
top-level rule otherwise requires `auth != null` for everything). It can
only ever go from not-`true` to `true`, never back:

```json
".write": "!data.exists() && newData.val() === true"
```

`users/$uid`'s write rule has a second clause besides "you're an admin":

```json
"(root.child('meta').child('setupComplete').val() !== true && auth.uid === $uid && newData.child('role').val() === 'admin')"
```

While the flag isn't `true` yet, any authenticated user may write their
own `uid` under `/users` as role `admin` — nothing else (not someone
else's uid, not any other role). `lib/auth.ts`'s `bootstrapFirstAdmin()`
sets both paths — `users/{uid}` and `meta/setupComplete` — in **one atomic
multi-location update**. That atomicity matters: verified against the
emulator that writing `users/{uid}` alone, without the flag in the same
update, leaves the bootstrap window open for a second (or third...) party
to also self-promote to admin, since the rule keys off the flag rather
than off `/users` being non-empty. The app's UI only ever calls the atomic
version, so this only matters if someone bypasses the app and talks to the
database directly during that narrow window before anyone has ever
completed `/setup`.

## Everything else

- **Admin-only structural entities** (`clients`, `sites`, `tanks`,
  `treatmentSystems`, `parameterConfigs`, `frequencySettings`,
  `regulatoryReports`, `scheduledSpecialTests`) — matches
  `ADMIN_ONLY_ENTITY_TYPES` in the original `permissions.ts`.
- **Wells** (`wells`, `treatmentWells`, `groundwaterWells`) — matches
  `WELL_ENTITY_TYPES`: admin has full control; a technician may only
  *update* an existing well (report its status), never create or delete
  one. `data.exists() && newData.exists()` is RTDB's way to express "this
  is an update, not a create or delete".
- **Visits** (`fuelLensVisits`, `sveSystemVisits`, `bioVentingSystemVisits`,
  `groundwaterVisits`) — matches `VISIT_ENTITY_TYPES`: a technician may
  create freely (`createdBy` must be their own uid — never trusted
  otherwise, same principle as the original server stamping it), and may
  only edit/delete a visit they created themselves. The original checked
  "same calendar day"; RTDB rules have no calendar, so this uses a
  24-hour rolling window from `createdAt` instead — a deliberate
  simplification, not identical semantics.
- **Active status** (`activeStatuses`) — matches
  `TECHNICIAN_WRITABLE_ENTITY_TYPES`: both roles can create/update, nobody
  but admin deletes. There's no server to stamp `source` after the fact,
  so this rule instead *validates* that whatever the client submits for
  `source` matches the writer's actual role — a technician cannot claim
  `source: "admin"`, and vice versa.

## How this was verified

Firebase gives no offline linter for this rules format short of actually
loading them into an engine. Verified by running the Database Emulator JAR
directly (bypassing the `firebase emulators:start` CLI wrapper, which
tries to phone home for a remote MOTD/config check that this sandbox's
network policy blocks) and exercising it over its REST API with
`auth_variable_override` to simulate different signed-in users:

- Rules load without error (`{"status":"ok"}`).
- Unauthenticated read of `/meta/setupComplete` → allowed (`null`).
- Unauthenticated read of `/users` → denied.
- Self-bootstrap as admin before the flag is set → allowed; a second,
  different uid can *also* self-bootstrap before the flag is set →
  allowed (confirms why the atomic update matters, see above).
- The atomic bootstrap update → succeeds and flips the flag; any further
  self-bootstrap attempt afterward → denied.
- An existing admin creating a technician account → allowed; a
  non-admin/roleless stranger overwriting someone else's user record →
  denied.
- A technician creating a new well → denied; updating an existing one →
  allowed; deleting it → denied.
- A technician creating a visit with `createdBy` set to their own uid →
  allowed; claiming someone else's uid as `createdBy` → denied.
