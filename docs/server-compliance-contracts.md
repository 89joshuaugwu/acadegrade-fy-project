# Server compliance contracts (2026-11-13)

This is the server half of: the under-18 AI restriction and the account
"requirements" (age, terms, privacy, AI consent, marketing), kill switches and
maintenance on the server, complete account deletion, AI data minimisation,
ads.txt and app-ads.txt, AI answer reports, and the admin audit log. UI comes
later. This file lists what the UI must call and show.

All JSON responses below are `Cache-Control: no-store` (or `private, no-store`).
Changes to existing endpoints only add fields, except for the new 403 and 503
responses listed here.

## 1. Account requirements and age

Stored on `users/{uid}` and written only by the server. `firestore.rules`
blocks client writes to these fields, admins included:

| Field | Meaning |
|---|---|
| `ageStatus` | `'adult'` or `'minor'`. Absent means unknown (every account created before this change). |
| `ageDeclaredAt` | Time of the first answer. |
| `ageUpgradedAt` | Time a minor said "I've turned 18". |
| `consents.terms` / `consents.privacy` | `{ version, at }` |
| `consents.ai` | `{ granted: boolean, version, at }`. This is the opt-in to sending academic data and scanned slips to Google Gemini, Groq and OpenRouter. |
| `consents.marketing` | `{ granted: boolean, at }`. Optional. If unset, no marketing email is sent. |
| `ageCorrectedAt`, `ageCorrectedBy` | Set only when support corrects an age (see below). |

The Terms and Privacy versions live in `config/legal { termsVersion, privacyVersion }`.
Both default to `2026-11-13`. The document is public-read. Admins change it
through `PUT /api/admin/legal`. Bumping a version asks every user to accept that
document again.

### `GET /api/user/requirements` (bearer)

Returns `{ items: Item[], current, checkedAt }`. `current` holds the recorded
answers for settings screens such as "Privacy & AI choices":

```ts
current: {
  ageStatus: 'adult' | 'minor' | 'unknown';
  aiConsent: boolean | null;        // null = never answered
  marketingConsent: boolean | null; // null = never answered (no marketing email)
  termsVersion?: string;            // accepted versions; omitted if never accepted
  privacyVersion?: string;
}
```

`POST /api/user/requirements` returns the same shape. `items` lists the
**pending** items only, in this order:

```ts
type Item = { id: string; blocking: 'app' | 'ai' | 'none'; version?: string; title: string; description: string };
```

| id | blocking | Pending when |
|---|---|---|
| `age` | `ai` | `ageStatus` is unknown |
| `terms` | `app` | `consents.terms.version !== config/legal.termsVersion` |
| `privacy` | `app` | `consents.privacy.version !== config/legal.privacyVersion` |
| `ai_consent` | `ai` | adult and `consents.ai` unset. It is not asked again after a withdrawal. |
| `marketing_consent` | `none` | `consents.marketing` unset |

The server sends `title` and `description`. The `ai_consent` description names
Gemini, Groq and OpenRouter. Clients must ignore unknown ids with `blocking: 'none'`.
They must handle unknown `app` and `ai` items generically, using the title and
description. The endpoint stays open during maintenance.

### `POST /api/user/requirements` (bearer, rate limited 20/hour, 60/day)

```json
{ "answers": { "age": "adult", "terms": { "version": "2026-11-13" }, "privacy": { "version": "2026-11-13" }, "aiConsent": true, "marketingConsent": false } }
```

Every key is optional, but at least one is required. Unknown keys return 400.
The response is `{ items, current, checkedAt }`, with the items still pending.

| Status | `code` | When |
|---|---|---|
| 400 | `INVALID_ANSWERS` | Malformed or empty answers |
| 403 | `AGE_RESTRICTED` | `aiConsent: true` from a minor, including a minor answer in the same request |
| 409 | `AGE_CHANGE_REQUIRES_SUPPORT` | adult → minor |
| 409 | `VERSION_MISMATCH` | The terms or privacy version is not the current one (reload, then ask again) |
| 503 | `MAINTENANCE` | Maintenance is on and the caller is not an admin |

`aiConsent: false` withdraws AI consent, which is always allowed.

### `POST /api/user/age` (bearer, rate limited 10/hour, 30/day)

Body: `{ status: 'adult' | 'minor' }`. Response: `{ ageStatus, aiAllowed }`.
It is a thin wrapper over the age answer above:

- Unknown → either value is allowed.
- minor → adult is allowed and records `ageUpgradedAt`.
- adult → minor returns 409 `AGE_CHANGE_REQUIRES_SUPPORT`.
- The same value returns an idempotent 200.

`aiAllowed` also takes AI consent into account. An adult who has not opted in
gets `aiAllowed: false`.

### Registration (`POST /api/auth/register/finalize`)

Registration optionally accepts `ageStatus: 'adult' | 'minor'` and/or
`answers` (the same shape as above). Both are optional, so old clients keep
working and the account stays unknown.

Validation errors return 400 or 403 with `{ error, code }`. These are checked
before Firebase Auth is touched. A `MAINTENANCE` 503 is returned before
anything else.

### Support age correction

Admins call `POST /api/admin/users { action: 'set-age', uid, ageStatus, reason }`.
This is the "contact support" path for adult → minor.

- `reason` is required: non-empty after trimming, at most 300 characters.
  Otherwise the request returns 400.
- The reason is stored in the audit summary as
  `Support age correction: <reason>`.

`GET /api/admin/users` adds `ageStatus: 'adult' | 'minor' | 'unknown'` and
`aiConsent: boolean | null` to each user. Both come from the profile document
the route already reads, so there are no extra reads.

## 2. Who may use AI

One rule, in `lib/user/age.ts` (`getAiEligibility`):

1. `ageStatus: 'minor'` → `AGE_RESTRICTED`. This always applies.
2. `consents.ai.granted === false` → `AI_CONSENT_REQUIRED`. This always applies.
3. Unknown age → `AGE_CONFIRMATION_REQUIRED`, but only while enforced.
4. Adult with no AI answer → `AI_CONSENT_REQUIRED`, but only while enforced.

"Enforced" is `config/settings.ageGate.enforceUnknown`. It defaults to `true`
and is set with `POST /api/admin/settings { field: 'ageGate', value: { enforceUnknown } }`.
It covers both unknown age and a missing AI consent answer.

Installed APKs cannot ask these questions. While enforcement is on, every
existing Android user is refused AI until they answer on the web or in a new
build. During rollout the operator can turn it off. Explicit minors and
explicit withdrawals stay blocked either way. Terms and Privacy are not
enforced by the server, because old APKs can't show them. Clients block the
app instead.

Refusal: **403** `{ error, code }`.

| code | error |
|---|---|
| `AGE_RESTRICTED` | AI features and result scanning are available only to users aged 18 or over. |
| `AGE_CONFIRMATION_REQUIRED` | Confirm your age in AcadeGrade to use AI features |
| `AI_CONSENT_REQUIRED` | Allow AI processing in AcadeGrade to use AI features |

Where the check applies:

| Route | Behaviour when AI is not allowed |
|---|---|
| `POST /api/ai/insights`, `POST /api/ai/whatif`, `POST /api/results/extract` | 403, before any coin hold, rate-limit use or provider call |
| `POST /api/ai/forecast` | 200 with the mathematical forecast. `trendLabel` is fixed (`Steady improvement`, `Declining trend` or `Stable performance`), plus `aiEnhanced: false`. There is no provider call, no limiter use, no coins and nothing cached. |
| `POST /api/ads/rewards/session` (`reward: 'coins'` or no `reward`) | 403. An unknown `reward` value still returns 400. GET and DELETE (status and cancel) are not gated. |

### `GET /api/ai/usage` additions

```ts
age: { status: 'adult' | 'minor' | 'unknown'; aiAllowed: boolean; aiConsent: boolean | null }
```

When `aiAllowed` is false, `coins.enabled` and each `features[].coin.enabled`
are `false`. The balance is still reported.

## 3. Maintenance and kill switches

`lib/platform/settings-server.ts` reads `config/settings` through a 30 s
per-instance cache. On a read error it uses the last good value, or the
defaults (fail open). An admin save through `/api/admin/settings` clears the
cache on that instance; other instances update within 30 s.
`config/settings` stays public-read.

- **Maintenance** (`maintenanceMode: true`): returns **503** `{ error, code: 'MAINTENANCE' }`
  to non-admins. Admins are exempt: the verified token email must be in
  `config/admins.emails`.
- **Feature off** (`disabledFeatures` includes the id): returns **503**
  `{ error, code: 'FEATURE_DISABLED', feature }` to everyone, admins included.

| Route | Maintenance | Feature id |
|---|---|---|
| `POST /api/ai/insights` | yes | `ai_insights` |
| `POST /api/ai/forecast` | yes | `ai_forecast` (new) |
| `POST /api/ai/whatif` | yes | `ai_whatif` (new) |
| `POST /api/results/extract` | yes | `extract_slip` |
| `POST /api/transcript/generate` | yes | `transcript_pdf` (new) |
| `POST /api/transcript/share` | yes | `transcript_share` (new). GET of a share stays public. |
| `POST /api/ads/rewards/session` | yes | — |
| `POST /api/user/age`, `POST /api/user/requirements` | yes | — |
| `POST /api/auth/register/finalize` | yes | — |
| `POST /api/notifications/send` (non-admin, non-internal) | yes | — |

These stay open: `GET /api/ai/usage`, `GET /api/user/requirements`,
`POST /api/ai/report`, account deletion, auth OTP and password reset, mobile
release, ads config, the academic catalogue and the SSV callback.

`share_code`, `add_semester` and `edit_profile` gate direct client Firestore
writes. The server can't see those writes. Rules could enforce
`share_code`/`add_semester` with `get(/config/settings)`, at one billed read per
write, but installed APKs would show a generic "permission denied". So they are
not enforced on the server, and the web UI keeps honouring them.

## 4. Account deletion

`POST /api/user/delete-account` still returns `{ success: true }`, which is
unchanged. Stale tokens now return 401 (they returned 500 before).
`lib/user/account-deletion.ts` deletes in batched pages (400 per page, at most
20 pages per collection). A collection that hits the bound is logged by name;
its documents remain and need another run.

| Found by | Data |
|---|---|
| uid | profile, semesters and courses, notifications and items, analytics, `shareCodes.authorId`, `shared_transcripts.uid`, `api_logs.uid`, `_api_rate_limits.uid`, `_reward_sessions.uid`, `_reward_transactions.uid`, `_matric_numbers.uid`, `_academic_catalog_suggestions.uid` |
| sha256(uid) | `_coin_wallets/{hash}`, `_coin_ledger.uidHash`, `_coin_requests.uidHash`, `_reward_daily/{hash}_{day}` (document-id range), `_ai_feedback.uidHash` |
| profile fields | `_matric_numbers/{sha256(matric)}` (only if still ours), `otps/{email}_*`, `_registration_tickets.email`, the Cloudinary avatar |

What can't be deleted here:

- **Cloudinary.** The avatar is destroyed only when `CLOUDINARY_API_KEY` and
  `CLOUDINARY_API_SECRET` are set; otherwise it is skipped quietly. Today only
  `CLOUDINARY_CLOUD_NAME` exists. Uploads are unsigned, so any other images a
  user uploaded can't be traced to them.
- **External services.** Admin audit records name admins, not students. Push
  tokens already sent to FCM, emails already sent, Vercel logs and provider-side
  AI logs are outside Firestore.
- **The deletion itself** is logged to `api_logs` with `uid: null`.

## 5. AI data minimisation

- **OpenRouter.** Each managed route can carry
  `dataCollection: 'deny' | 'allow'`. If it is absent, `'deny'` is used at read
  time, and stored configs are not rewritten. Every OpenRouter request sends
  `provider: { data_collection }`. Free models with no compliant provider fail,
  and the route moves on to its next target, so keep a non-OpenRouter target in
  each chain.
- **Gemini.** `GET /api/admin/ai` adds
  `geminiBilling: 'unconfirmed' | 'confirmed'` (default `unconfirmed`, stored in
  `_ai_runtime/compliance`). Set it with
  `POST /api/admin/ai { operation: 'set-gemini-billing', geminiBilling }`. It is
  shown as a warning only and never blocks anything.
- **Prompts.** Written Analysis strips identity keys (name, email, matric, uid,
  avatar, phone and similar) from client-sent `semesterData` before building the
  prompt. The cache signature is unchanged. The OCR text path drops labelled
  `Name:`, `Matric No:`, `Reg. Number` and `Email:` lines and masks email
  addresses. **The image and scanned-PDF OCR paths still send the whole slip,
  which may show the name and matric number.** The AI consent text says so.
  Forecast and What-if send numbers only.

## 6. ads.txt and app-ads.txt

- **`/ads.txt`** is built from `config/settings.adsProviderConfig.adsense.publisherId`
  (`ca-pub-…`). It produces
  `google.com, pub-…, DIRECT, f08c47fec0942fa0`.
- **`/app-ads.txt`** builds the same line from the AdMob publisher. It uses
  `config/settings.admobAndroidAppId` (new admin setting,
  `ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY`), then the `ADMOB_ANDROID_APP_ID`
  environment variable, then the live `config/mobileAds` unit IDs. Google's test
  publisher is never used.

Both are plain text with `public, max-age=300`, an empty 200 when nothing is
configured, and a 503 `no-store` when storage fails.

The current Android App ID is in `acadegrade-mobile/app.json`
(`ca-app-pub-2745430575041686~2976964736`). Save it in admin settings.

Note: `next.config.ts` adds `Cache-Control: no-cache, no-store` to every path.
Check the deployed header. If it overrides the 5-minute cache, the file is
simply re-read on every request, which is harmless.

## 7. AI answer reports and feedback

`POST /api/ai/report` (bearer, 20/day, open during maintenance):

```json
{ "feature": "insights|forecast|whatif|ocr", "kind": "report|helpful|not_helpful",
  "reason": "inaccurate|offensive|unsafe|other", "note": "≤500 chars", "platform": "web|android|ios" }
```

The response is `{ ok: true }`. It is stored in `_ai_feedback` (client access
denied) as `{ uidHash, feature, kind, reason, note, platform, providerId, modelId, createdAt }`.
For insights and forecast, the provider and model are copied from the saved
result's provenance. They are never taken from the client, and no result
content is stored. `provenanceId` is accepted but ignored. The free-text note
is stored as typed, so clients must not pre-fill it with results.

## 8. Admin audit log

`lib/api/admin-audit.ts` → `writeAdminAudit({ actorEmail, actorUid?, action, target, summary?, before?, after? })`
writes one append-only record to `_admin_audit` (client access denied). Secret
keys (passwords, API keys, ciphertext, iv, tag, tokens) are stripped, and
strings and arrays are bounded. Write failures are logged and never fail the
admin request. It replaces the AI route's old `_ai_audit` writes; old
`_ai_audit` records remain.

| Action | Route |
|---|---|
| `settings.update`, `settings.about.update` | `/api/admin/settings` (before/after values) |
| `users.disable`, `users.enable`, `users.set-age` | `/api/admin/users` |
| `usage.update` | `/api/admin/usage` |
| `mobile-release.update` | `/api/admin/mobile-release` |
| `academic-catalog.{add,edit,archive,restore}`, `academic-catalog.suggestion.{approve,reject}` | catalogue routes |
| `courses.{create,update,delete}` | `/api/admin/courses` |
| `email.save` | `/api/admin/email` (sender address only) |
| `ai.{upsert-secret,rotate-secret,set-secret-state,save-routing,activate-managed,set-gemini-billing}` | `/api/admin/ai` (masked metadata only) |
| `legal.update` | `/api/admin/legal` |

Not wired yet (out of scope): `/api/admin/ads`, `/api/admin/ads/{house,mobile,ios,providers}`.

`GET /api/admin/audit?limit=50&action=…&actor=…&cursor=…` (admin only) returns
`{ entries, nextCursor }`, newest first. `cursor` is the `createdAtMs` of the
last entry. `actor` is an exact admin email; it is matched lowercase. Invalid
`action`, `actor` or `cursor` values return 400.

The filters need Firestore composite indexes on `_admin_audit`:

| Filter | Index |
|---|---|
| `action` | `action ASC, createdAtMs DESC` |
| `actor` | `actorEmail ASC, createdAtMs DESC` |
| both | `action ASC, actorEmail ASC, createdAtMs DESC` |

The first query of each kind logs a link that creates its index.

## 9. What the UI must build

- **Sign-up.** A neutral "How old are you?" with two equal choices. Send
  `ageStatus` or `answers` to finalize, together with the terms, privacy and
  AI-consent steps.
- **Existing users.** Call `GET /api/user/requirements` at sign-in and show the
  pending items:
  - `app` items: block the app until answered.
  - `ai` items: show at sign-in, and again when an AI action returns one of the
    403 codes.
  - `none` items: optional.

  Submit with `POST /api/user/requirements`.
- **"I've turned 18"** for minors (`POST /api/user/age { status: 'adult' }`),
  then the AI-consent step. Adult → minor shows "contact support".
- **Settings.**
  - An AI-consent toggle. Withdrawal sends `aiConsent: false`.
  - A marketing toggle.
- **Restricted states.**
  - Show the 403 messages next to AI features and the scanner.
  - Hide coin earning while `age.aiAllowed` is false.
  - The forecast's `aiEnhanced: false` means a fixed label.
- **Maintenance and switches.**
  - Show `MAINTENANCE` and `FEATURE_DISABLED` 503s as friendly banners.
  - Admin chips can now say "Web + API" for the server-enforced ids.
  - Add switches for `ai_forecast`, `ai_whatif`, `transcript_pdf` and `transcript_share`.
  - Add the `ageGate.enforceUnknown` toggle with its rollout warning.
  - Add the `admobAndroidAppId` field.
- **AI page.**
  - Gemini billing warning and confirm button.
  - Per-route OpenRouter "Allow data collection" toggle (default off).
- **Admin.**
  - Audit page (`/api/admin/audit`).
  - Legal versions editor (`/api/admin/legal`).
  - "Correct age" action on Users.
- **Report.** A "Report / Helpful / Not helpful" control on every AI output (`/api/ai/report`).
