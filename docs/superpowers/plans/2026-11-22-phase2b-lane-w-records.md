# Phase 2b lane W (O-level and admission record types, web) Implementation Plan

> For agentic workers: executed natively in one session (owner auto-approved, away). Steps use checkbox syntax.

**Goal:** Let a student register and use AcadeGrade for WAEC/NECO results or a JAMB admission aggregate, on the web app and API.

**Architecture:** The shared engine (`lib/records/olevelRules.ts`, `olevelSubjects.ts`, `admissionRules.ts`, `types/records.ts`) is untouched. New web-only files wrap it: `lib/records/store.ts` (pure write/read shaping + thin Firestore I/O), `lib/records/navigation.ts` (nav and route rules per type), `hooks/useRecordType.tsx` (context from the profile the layout already reads) and `hooks/useRecordData.ts` (subscriptions). Screens live in `app/(student)/olevel`, `app/(student)/admission` and `components/records/*`.

**Spec:** `../GRADING_AND_PROFILES_PLAN.md` "Phase 2" + "Phase 2 design" (lane W).

## Design decisions (my calls; owner auto-approved)
- Approaches: (1) branch inside every tertiary screen; (2) new routes per type plus a record-type context, tertiary screens untouched; (3) separate app shell per type. Chosen (2): smallest blast radius on tertiary code, nav and gates are one pure module.
- Registration: a new step 0 "What are you tracking?" (ChoiceCards). Olevel/admission: step 1 without matric, then step 3 shows only "Before you finish" (age, terms; no AI consent box), then submit. The form resolver picks `formSchema` (tertiary, unchanged) or `schoolSchema` (no matric/academic fields) by `recordType`.
- Finalize: `recordType` optional. Olevel/admission parse a small profile `{ fullName, email }`, skip matric reservation, timeline and past semesters; write `recordType`. A request without `recordType` for an existing user whose stored type is olevel/admission gets 409 `RECORD_TYPE_NEEDS_UPDATE` before any Auth change (email path before `updateUser`, Google path after token check, re-checked in the transaction).
- `isStudentProfileComplete`: olevel/admission accounts are complete with fullName + email and `setupComplete !== false`.
- Nav: tertiary unchanged; olevel = Dashboard, O-level; admission = Dashboard, Aggregate, O-level. Timetable hidden for non-tertiary. Tertiary-only routes (/results, /insights, /transcript, /timetable) show a short notice for other types; /olevel open to olevel+admission; /admission to admission.
- `targetCourse.required` stores subject ids only (Firestore cannot store nested arrays, so any-of groups are not saved).
- Settings "Record type": custom choice cards + confirm dialog; writes `users/{uid}.recordType` only, never deletes data. Switching to tertiary without an academic profile sends the student to finish registration (existing flow).
- No AI anywhere on these screens.

## Global Constraints
- Do not edit the four shared engine files. No native selects/checkboxes. No "coming soon". Plain Nigerian-student copy. Every aggregate shows `ESTIMATE_NOTE` ("Estimate only. Check your school's formula.").
- Old clients (no `recordType`) behave exactly as today.

## Review Focus
1. Old APK finalize for an O-level account: 409, nothing overwritten, password not changed (test in register-record-type).
2. Accounts without `recordType` read as tertiary everywhere (resolveRecordType; navigation tests).
3. AR grades never count as credits or aggregate-complete (engine; store pick test keeps AR).
4. Writes never contain `undefined` (Firestore rejects) and stay inside the rules shape (store tests).
5. Edit-profile kill switch disables the record-type switch too.

---

### Task 1: Finalize `recordType` + 409 guard
Files: `app/api/auth/register/finalize/route.ts`, `lib/auth/profile.ts`, `lib/public/auth-copy.ts`. Test: `tests/unit/register-record-type.test.ts`.
- [ ] Tests: olevel finalize stores `recordType`, no matric/semesters/_matric_numbers; old body for an existing olevel user returns 409 `RECORD_TYPE_NEEDS_UPDATE` and leaves the doc; tertiary body unchanged; unknown recordType 400; profile completeness for olevel.
- [ ] Implement, run, pass.

### Task 2: Store + navigation helpers
Files: `lib/records/store.ts`, `lib/records/navigation.ts`, `hooks/useRecordType.tsx`, `hooks/useRecordData.ts`. Test: `tests/unit/olevel-store.test.ts`, `tests/unit/record-navigation.test.ts`.
- `toOlevelWrite(record, currentYear) -> { ok: true; data } | { ok: false; errors }`, `parseStoredAdmission(raw)`, `toAdmissionWrite(record)`, `pickAggregateGrades(olevelRecord)`, `aggregateInputFrom(admission, olevel)`.
- `navigationFor(type)`, `routeAccess(pathname, type) -> 'ok' | 'tertiary-only' | 'admission-only'`.

### Task 3: Registration step
Files: `app/(public)/register/{page,steps,schema,RegistrationConsents}.tsx`, `lib/public/auth-copy.ts`. Test: extend `tests/unit/register-record-type.test.ts` with schema resolver cases.

### Task 4: Student screens + dashboard + nav + settings
Files: `app/(student)/olevel/page.tsx`, `app/(student)/admission/page.tsx`, `components/records/*`, dashboard page switch, StudentShell/BottomTabBar/MobileDrawer, route-meta titles, settings section, student layout provider + gate.

### Task 5: Admin, deletion, export
Files: admin users route/[uid] route/page/drawer, `lib/user/account-deletion.ts`, `lib/export/build.ts`. Tests: extend account-deletion and data-export tests.

### Task 6: Preview fixtures + screenshots, verification
`preview/runtime.ts` record override (`?ag-preview-record=olevel|admission`), seed docs. Run touched tests + related, one `npx tsc --noEmit`, Playwright screenshots 1440/390.
