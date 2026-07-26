# AcadeGrade: Undocumented Features & Recent Fixes (Code Audit)

This file captures features and behaviors that exist in the actual codebase
but were never written up in docs 1-10, plus two real bugs that were found
and fixed during this audit. Everything below was verified by reading the
source directly, not inferred from the other handover docs.

---

## Part A — Features that exist but were never documented

### 1. Course Share Codes (`/results/[semesterId]`)
A lightweight peer-to-peer course-list sharing system, separate from the
transcript share feature:

- A student with ≥3 courses in a semester can hit **Share**, which generates
  a random 6-character code (`generateRandomCode()`) and writes it to a
  top-level `shareCodes/{code}` Firestore document containing `authorId`,
  `useCount` (starts at 0), `createdAt`, and the course list — **code, title,
  and units only, never scores**.
- A classmate enters that code via **Import Code**. The app looks up
  `shareCodes/{CODE}`, pulls the course list into the classmate's semester
  (with `caScore`/`examScore` reset to `null` so they fill in their own
  scores), and increments `useCount` via Firestore's atomic `increment(1)`.
- Gated by the `share_code` feature flag (see #3 below) — when disabled,
  both the Share and Import Code buttons are disabled with a maintenance tooltip.
- This is genuinely useful for your coursemate-report-assistance workflow
  too — it's the same "share structure, not content" pattern.

### 2. Automatic Degree-Class-Change Notification
Every time `insights/page.tsx` runs `loadData()`, it recomputes CGPA and
compares the new degree class against whatever was last saved to
`analytics/{uid}.degreeClass`. If they differ (and the old value wasn't the
initial `'Fail'` placeholder), it automatically fires both:
- A push notification: *"Degree Class Update 🎓 — Your CGPA trajectory has
  shifted your degree class to: {class}."*
- An email with the same event (`event: 'degreeClass'`).

This happens passively on page load — the student doesn't have to do
anything to trigger it, it just fires whenever their computed class changes.

### 3. Granular Per-Feature Kill Switches
`config/settings.disabledFeatures` is a flat `string[]`, not individual
booleans. `usePlatformSettings().isFeatureDisabled(id)` just checks
`disabledFeatures.includes(id)`. The feature IDs actually wired up in the UI
today:

| Feature ID | Disables |
|---|---|
| `add_semester` | "New Semester" / "Add Semester" buttons on `/results` |
| `share_code` | Both "Import Code" and "Share" buttons on `/results/[id]` |
| `extract_slip` | "Import Result Slip" (Gemini OCR) button |
| `ai_insights` | The Insights Hub refresh button |
| `edit_profile` | All profile fields + save button on `/settings` |

Admins toggle these from `/admin/settings` by pushing/popping IDs onto the
`disabledFeatures` array — no code changes needed to disable a new one, as
long as the frontend already calls `isFeatureDisabled('your_id')` somewhere.

### 4. Transcript Share Links Expire in Exactly 30 Days
`api/transcript/share/route.ts` hardcodes
`expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)`. Not
configurable from the admin panel currently — if you want this tunable,
it'd need to move into `config/settings`.

### 5. Legacy Field Shadow-Writes on Profile Save
`handleSaveProfile()` in `settings/page.tsx` writes both the current field
names and old ones on every save:
```ts
{ fullName, name: fullName, department, dept: department, currentLevel: level, level }
```
This is a compatibility shim from an earlier schema (`name`/`dept`/`level`)
that's still active. Fine to leave as-is unless you're ready to do a full
migration and strip the old field reads in `useProfile`/`useEffect` init logic.

### 6. RTDB Path Correction
Doc `5_data_architecture.md` says the unread-count path is
`/users/{uid}/unreadCount`. The actual path used everywhere
(`notifications/page.tsx`, and now the delete-account route) is
`notif_counts/{uid}/unread`. Use the real path if you're debugging RTDB directly.

---

## Part B — Real bugs found and fixed in this pass

### Fix 1: Dashboard "Recent Results" was 100% hardcoded
`dashboard/page.tsx` always rendered two fake rows — "CSC 401 – A" and
"CSC 403 – B" — regardless of what the logged-in student actually had in
Firestore, even when they had real semesters saved.

**Fixed**: The existing course-stats effect now also grabs the courses from
the student's most recently added semester (`semesterHistory` is sorted
ascending, so the last entry is the latest) and renders up to 3 of them with
their real course code, real grade (via the existing `getGradeBadgeVariant`
helper), and the real semester label. Falls back to the existing empty state
if there are no semesters yet.

**File changed**: `app/(student)/dashboard/page.tsx`

### Fix 2: Delete Account didn't actually delete anything except the login
Previously, clicking "Permanently Delete" after typing `DELETE` called only
`deleteUser(auth.currentUser)` — no re-authentication, and it never touched
Firestore. `semesters`, `courses`, `analytics/{uid}`, `notifications/{uid}`,
and any `shareCodes` the user generated were left orphaned in the database
forever. It also didn't work reliably: Firebase requires a *recent* login
for `deleteUser()`, so if the session was even a little old it just failed
with an unhelpful error.

**Fixed** with a proper two-step flow:
1. **Client-side re-authentication** (`settings/page.tsx`): password-based
   accounts get a password field in the delete modal and re-authenticate via
   `reauthenticateWithCredential`; Google-SSO accounts get a
   `reauthenticateWithPopup(GoogleAuthProvider)` instead (detected via
   `auth.currentUser.providerData[0].providerId === 'google.com'`).
2. **Server-side full wipe** (new route: `app/api/user/delete-account/route.ts`,
   using the Admin SDK): verifies the (now-fresh) ID token with
   `checkRevoked: true`, then deletes — in order — every course under every
   semester, every semester doc, every notification item + the parent doc,
   the `analytics/{uid}` doc, any `shareCodes` where `authorId == uid`, any
   `shared_transcripts` where `uid == uid`, the `users/{uid}` profile doc,
   the RTDB `notif_counts/{uid}` node, and finally the Firebase Auth user
   itself via `adminAuth.deleteUser(uid)` — which also sidesteps the
   "requires recent login" client restriction, since the Admin SDK doesn't
   need a fresh session.

**Files changed**:
- `app/api/user/delete-account/route.ts` (new)
- `app/(student)/settings/page.tsx`

**⚠️ You said you haven't tested the original delete flow — please test
this new one in a dev/staging Firebase project before relying on it in
production.** Recommended test matrix: (a) password account with real data
across 2+ semesters, (b) Google-SSO account, (c) an account with a
generated share code and a shared transcript link, to confirm all four
new cleanup branches actually fire. Also worth manually confirming in the
Firebase console that the `users/{uid}` doc, its `semesters` subcollection,
and the `notif_counts/{uid}` RTDB node are all gone afterward.
