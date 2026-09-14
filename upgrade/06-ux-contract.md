# UX Interaction Contract

This document defines what controls do, where they lead, and what users see when work succeeds or fails. It applies to every route specification.

## Navigation and State Ownership

| Trigger | Required destination/result | History/focus |
|---|---|---|
| Public primary CTA | `/register`, or resume incomplete setup; complete signed-in user may use Dashboard CTA | Normal link; never a direct bypass of profile guard |
| Sign in success | Safe requested student route if profile complete; `/register` if incomplete | Replace login; allowlist internal return path |
| Recent result | `/results/{semesterId}?course={courseId}` | Link; target row is revealed/highlighted without changing data |
| Semester page Back | `/results` with prior list state when available | Deterministic parent link; browser Back independently retains actual history |
| Results primary nav | `/results` | Never reuse a remembered nested semester route as the tab destination |
| Insights tab | `/insights?tab=forecast|whatif|risk|written` | User selection pushes meaningful history; invalid value falls back to forecast |
| Insights metric | `metric=cgpa|pi` in URL; profile supplies default when absent | Replace metric query; explicit “default metric” setting owns persistent preference |
| Admin search/filter | Current route query parameters | Debounced query uses replace; explicit page/detail navigation uses push |
| Settings local section | `#profile`, `#academic`, `#appearance`, `#notifications`, `#security` | Anchor link + active-section tracking; respect reduced motion |
| Sign out | Public login or admin login after confirmed sign-out | Clear account-derived state; error retains session and offers retry |

Use Next Link for navigation. Do not place a Button inside Link. Disabled features show a disabled action with adjacent explanation, not `href="#"`.

Save table/list filters and scroll in the URL or per-route session state as appropriate. No passwords, OTPs, verification tickets, transcript share secrets, email addresses, or other private data in analytics or generic URL-state helpers. Existing intentionally public share tokens retain their current security model.

## Screen State Model

Every data screen must distinguish these states:

| State | Presentation | Action |
|---|---|---|
| Initial loading | Stable shell + component skeleton | Do not expose zeros as if real |
| Ready | Content with timestamp/basis where useful | Normal controls |
| Empty account | Purpose-specific invitation | Add first semester / finish setup |
| Empty filtered result | Explain no matches and show active filters | Clear filters |
| Partial failure | Retain successfully loaded sections, mark failed section | Retry that section |
| Cached/stale | Keep data with freshness label | Refresh explicitly where necessary |
| Offline | Retain only genuinely available data; label stale | Retry after reconnection; no fake save success |
| Forbidden | Explain access denied without leaking content | Return to allowed page or switch account |
| Not found | Explain missing/deleted record | Parent navigation |
| Feature disabled | Feature-specific maintenance message | Preserve other usable features |
| Mutation pending | Local progress; prevent duplicate action | Cancel only when cancellation exists |
| Mutation failed | Keep user input and show useful error | Retry without re-entering values |
| Mutation complete | Updated data plus concise confirmation | Return focus to useful next action |

Do not use an endless spinner for an auth/config/network failure. Hooks must propagate errors rather than converting them to an empty array.

## Registration and Account Preservation

The UI redesign must preserve `lib/auth/profile.ts`, `lib/auth/registration-ticket.ts`, `lib/academic/timeline.ts`, and `/api/auth/register/finalize` behavior. Do not resurrect the old direct client sequence that wrote profile, semesters, and analytics separately.

Required journeys:

1. Email: identity fields → email code → confirmed email/password requirements → academic details → record mode → past-semester confirmation only when required → server finalization → completion.
2. Google: provider authentication → explicit confirmation of editable name/matric and provider identity → academic details → record mode → conditional past semesters → finalization. An auth listener must not skip academic phases.
3. Interrupted Google registration: sign-in resumes required setup with safe draft values. An incomplete profile never reaches a zeroed dashboard.
4. Email ticket expiry: retain non-secret academic draft, return to verification with explanation, request a new code, then resume validation.
5. From Scratch: skip past-semester entry intentionally; finalization happens once. Progress step count reflects the actual branch.
6. Reload/back: safe draft persists; secrets do not. Restored steps cannot skip required verification or server validation.

Display the account's Google email as already supplied by Google. Do not ask the person to “add email” as if it is absent. For password capability, show provider-aware copy and only expose an add-password/account-link action if the backend supports it. Never ask Google-only users for a nonexistent current password.

Google branding uses the existing official multicolor mark, the same size/alignment in sign-in and sign-up, and descriptive button text.

Forms use `noValidate` with accessible application validation, focus the first invalid field, keep a summary for long phases, and preserve values on API failure. Validation includes consecutive session years, supported level/duration bounds, normalized matric input, and server-enforced uniqueness where already implemented. Do not publish “verified” until verification actually succeeds.

## Editing Academic Records

- The currently active record id controls editor initialization. Preserve stable course ids and distinguish server snapshot, draft, and saving state.
- Text entry must not reset when subscriptions re-emit. If another update conflicts with a dirty editor, show an update notice and explicit reload/keep-editing path.
- Keep mode-specific values: CA/exam, total-only, grade-only, and awaiting result. Unknown is not zero. See `10` for adapter rules.
- Validate visibly; do not silently clamp 35 CA to 30 or delete half-entered rows.
- Save runs once, disables repeat submit, updates the display only from a successful result, and marks insights stale through existing logic.
- Destructive course/semester actions state exact record and effects. Preserve user data until server success; after success, update list, totals, and focus. If undo is unavailable, do not advertise it.
- In-app navigation away from dirty work uses a canonical confirmation. Browser-tab close may use the browser's native `beforeunload` behavior when supported; a custom dialog cannot replace that platform behavior.

## OCR and Import

The current web OCR entry is the result-slip upload inside semester detail; there is no separate web OCR route. Keep that route relationship unless a later user request adds a dedicated screen.

Workflow: choose file → inspect selected file → extract → review editable course rows → resolve errors/duplicates → explicitly apply to draft → save semester. Extraction must not silently overwrite saved courses.

Supported endpoint accepts PDF and images, currently with a 10 MiB decoded limit. Reflect actual supported formats/limits and server errors; confirm deployment request-size constraints before advertising the full endpoint limit. Do not accept files only by extension. Provide file name, size, replace/remove, progress stage, cancel where supported, retry, and low-confidence/missing-field indicators only if actual confidence data exists.

Import code uses a labeled field, paste support, explicit preview and merge/replace decision, duplicate handling, and explanatory invalid/expired code states. Export code does not silently publish a transcript; make scope and expiry clear from the existing endpoint/data model.

## Feedback Policy

| Action | Inline feedback | Toast |
|---|---|---|
| Sign-in/sign-up | Field errors; provider/verification error panel | One concise success after final completion; sanitized unexpected error |
| Send/resend OTP | Destination, cooldown, retry-after | Sent confirmation only if delivery API succeeds |
| Save profile/semester/admin settings | Pending and dirty/saved state | Success once; error with retry context |
| Change tab/filter/theme | Selected state | None |
| Toggle preference | Pending indicator, rollback on failure | Error only unless a major consequence warrants confirmation |
| Copy link/code | Button changes to Copied for 2s | Optional one toast; never claim copied before awaiting clipboard |
| Export PDF/CSV | Generating/download state | Ready/failed; report browser download initiation accurately |
| Delete/disable | Confirmation with scope, pending, outcome | Success after response; failure keeps dialog/record |
| AI request | Quota/freshness/progress/status | Error when useful, not duplicate banners and toasts |
| Cancel native share | Close quietly | None |

Success duration 4s; error 6s; pause on hover/focus where supported; longer actionable errors remain inline. Use one id per ongoing operation and replace loading feedback. Never toast raw stack traces, secrets, or unsanitized backend exceptions.

## Administration

- Permission loading, allowed, denied, and failed verification are distinct states keyed to the current uid. Protected page children must not mount under stale approval from a previous route/account.
- Hiding controls does not authorize requests. Existing server authorization remains the authority for every admin read/write.
- Use neutral primary actions for create/edit/export. Danger is for delete, disabling accounts, maintenance activation, or similarly disruptive changes.
- User enable/disable dialog shows identity, current state, intended state, and impact. Prevent accidental self-lockout if the backend supports that invariant; otherwise document and implement server protection before exposing the risky action.
- Maintenance and feature changes show affected feature/platform, previous/new value, and save outcome. Do not imply an audit log exists until a server record is implemented.
- Remove “Reset All Onboarding (Test)” from the overview. The first upgrade can simply omit this testing control. A bulk-maintenance replacement is deferred until a separate server job/audit contract is implemented.
- User/course lists need backend-supported pagination. Filters must describe the entire dataset, not silently filter only the current page.
- API Monitor shows last successful fetch, exact time range, pause/resume state, and a stale warning on failure. Auto-refresh pauses in background tabs and while a blocking dialog is active. It does not scroll, reorder a focused row, or announce every refresh.
- Analytics must identify sample scope, missing data, and truncation. Current `/api/admin/api-analytics` caps records at 5,000; disclose incomplete windows if the cap is reached unless a complete aggregate replaces it.

## Share, Privacy, and Documents

Transcript creation is an intentional sharing action. Before generating a public link, explain included name/matric/photo/results, who can open it, and expiry. Show active links, expiration, copy, and revoke. Revoke confirms the particular link, not the underlying academic record.

Keep the transcript title “Unofficial transcript.” Institution comes from the profile and is not an endorsement. The preview, PDF, print, and shared view must use the same semantic fields and totals. A share URL is not sent to an external QR service as an incidental rendering request; plan local QR generation if the existing dependency policy permits it, otherwise provide the text link until implemented.

Show Android/iOS download availability from `lib/mobile-app-links.ts` and configured URLs. Missing link means Coming soon with no active QR/download. Do not invent a store URL or link a QR to an unavailable destination.
