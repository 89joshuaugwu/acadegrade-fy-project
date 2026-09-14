# Student Product Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make academic records, standing, insights, and sharing clear, correct, and comfortable on desktop and phone browsers.

**Architecture:** Typed academic adapters feed shared domain components; routes own navigation and async state; one editor controller preserves drafts; shared document semantics feed preview/export/share.

**Tech Stack:** Existing React/Firebase/CGPA utilities/Recharts/Motion; canonical Wave 1 UI and tests.

**Spec:** [Student route specifications](../04-route-screen-specs.md), [Interaction contract](../06-ux-contract.md), [Academic data contracts](../10-data-and-integration-contracts.md).

## Global Constraints

Do not modify the mobile project or silently change its shared Firestore schema. Preserve working security and academic rules; when source has a correctness defect, reproduce it and fix at the shared boundary. No fabricated scores, PI, dates, forecast confidence, or risk. Named skills are optional tooling if unavailable; the steps remain executable.

---

## Task S1 — Academic presentation and classification correctness

Files: create `lib/academic/{course-presentation,result-order}.ts`, `tests/unit/{course-presentation,result-order,degree-class}.test.ts`; inspect/modify as needed `types/course.ts`, `lib/cgpa/{calculator,degreeClass,gradeScale}.ts`, `hooks/useCGPA.ts`.

- [ ] Write the exact mode/weighting/boundary fixtures in `08`; reproduce the current grade-table zero/F and classification-gap problems.
- [ ] Implement mode-aware view/draft adapters without manufacturing CA/exam splits or serializing undefined. Preserve old records and stable ids.
- [ ] Centralize classification policy; handle nonfinite/out-of-range/missing values as unavailable, not an arbitrary Fail fallback.
- [ ] Implement timestamp normalization and deterministic latest-result ordering, with explicit legacy/scope fallback labels.
- [ ] Run `npm.cmd run test:unit -- tests/unit/course-presentation.test.ts tests/unit/result-order.test.ts tests/unit/degree-class.test.ts`. Expected: all exact numeric and legacy cases pass. Document any intentional domain-policy change.

## Task S2 — Grade table and editor lifecycle

Files: modify `components/cgpa/GradeTable.tsx`, `app/(student)/results/[semesterId]/page.tsx`; create `components/results/{CourseEditor,SemesterHeader}.tsx`, `tests/unit/course-editor.test.tsx`, `tests/e2e/semester-editor.spec.ts`.

- [ ] Test initializing a record, changing to an empty record, receiving a subscription while dirty, editing CA/exam, total-only/letter-only/AR, and failed save retention.
- [ ] Separate draft initialization from server snapshot updates; maintain row ids. Do not reset drafts on every array identity change or ignore an empty authoritative record.
- [ ] Feed read-only values through S1 adapters. Use canonical numeric/form validation with readable errors instead of silent clamp/shake.
- [ ] Implement desktop table and phone edit-sheet composition. Save footer and final field remain visible with keyboard; theme switching does not remount.
- [ ] Test changing modes and serialize only active intended data with null/omission policy. Preserve completed-state/analytics recalculation behavior.
- [ ] Run `npm.cmd run test:unit -- tests/unit/course-editor.test.tsx` and `npm.cmd run test:e2e -- tests/e2e/semester-editor.spec.ts`.

## Task S3 — Imports and code workflows

Files: create `components/results/{ResultImportDialog,CodeTransferDialog}.tsx`; update semester page; inspect `/api/results/extract` and existing share-code helpers; create `tests/e2e/result-import.spec.ts`.

- [ ] Inventory actual file/code schema, expiry, file limits and payload limits. Do not invent API properties or confidence scores.
- [ ] Implement select/preview/extract/review/apply/save stages, duplicate handling and explicit merge/replace semantics.
- [ ] Keep imported data in draft until Save; preserve draft on errors. Support file replace/remove, invalid MIME/size, 429, network retry and real abort behavior.
- [ ] Use canonical modal/sheet close behavior for import/export/share. Test downward drag from handle and safe scrolling in review.
- [ ] Run `npm.cmd run test:e2e -- tests/e2e/result-import.spec.ts`. Expected: no overwrite before confirmation, no blank-to-zero conversion, correct close/keyboard/error states.

## Task S4 — Dashboard and semester navigation

Files: modify dashboard/results/new routes, `hooks/useSemesters.ts`; create `components/dashboard/{StandingSummary,RecentResults,NextActionPanel}.tsx`, `components/results/{SemesterList,SemesterDisclosure}.tsx`; add `tests/e2e/student-results.spec.ts`.

- [ ] Correct unknown-risk and recent-order semantics using S1. Expose section errors and completeness rather than silent zeros.
- [ ] Build the dashboard reference composition, compact three-column result rows, one main trend plot and grounded next action. Migrate advert overlay if retained.
- [ ] Implement scroll seam orientation/fade from `05`, then capture top/partial/deep scroll at phone/desktop. No header decoration may cover a result row.
- [ ] Build semantic semester disclosures with local fetch retry. Add validated new-semester form, duplicate handling, dirty state and destination after create.
- [ ] Make recent links carry exact semester/course ids, parent link go to Results, and primary Results navigation remain `/results`.
- [ ] Run `npm.cmd run test:e2e -- tests/e2e/student-results.spec.ts` and capture dashboard both themes at 320/390/1440px. Expected: no fragmented rows and correct parent navigation.

## Task S5 — Transcript semantic parity and sharing

Files: modify transcript route, public share route, `lib/pdf/transcript.ts`, relevant `/api/transcript` handlers if field parity requires it; create `lib/academic/transcript-model.ts`, `components/transcript/{TranscriptDocument,TranscriptToolbar,ShareTranscriptDialog,ActiveShareList}.tsx`, `tests/unit/transcript-model.test.ts`, `tests/e2e/transcript.spec.ts`.

- [ ] Add model tests for institution, completed-semester inclusion, CA/exam/total/grade/PI, estimated values, class boundaries and credit totals.
- [ ] Build one shared semantic model; render it appropriately for private preview, PDF and public snapshot without exposing private live queries to recipients.
- [ ] Replace hardcoded institution and incorrect course PI quantity. Preserve unofficial label and photo choice in all outputs.
- [ ] Migrate share/revoke overlays to canonical dialogs. Add disclosure before creation and actual expiry; generate QR locally if a suitable implementation is added, otherwise retain a working text link.
- [ ] Test valid/revoked/expired links and clipboard/export failure. Print at least three A4 pages with all columns visible.
- [ ] Run `npm.cmd run test:unit -- tests/unit/transcript-model.test.ts` and `npm.cmd run test:e2e -- tests/e2e/transcript.spec.ts`. Expected: semantic parity across all document formats.

## Task S6 — Insights interaction and analysis panels

Files: modify insights route; create `components/insights/{ForecastPanel,WhatIfPanel,RiskPanel,WrittenPanel}.tsx`; reuse `components/ai/WhatIfCalculator.tsx`, `InsightCard.tsx` where appropriate; create `tests/e2e/insights.spec.ts`.

- [ ] Add URL tab/metric parsing and safe defaults. Keep scenario/controller state above animated panels.
- [ ] Implement shared Tabs/SegmentedControl, restrained springs and correct tabpanel relationships. Keep the quota/freshness area clear of the header seam.
- [ ] Build each panel's evidence/action order from `04`. Distinguish real history, estimated PI, forecast, stale data, no-data and quota errors.
- [ ] Preserve server rate-limit/cache behavior; do not trigger generation from tab animation or theme changes.
- [ ] Test arrow-key navigation, direct URLs, browser Back, what-if draft retention, impossible targets, partial failures and reduced motion.
- [ ] Run `npm.cmd run test:e2e -- tests/e2e/insights.spec.ts`. Expected: selected route state and preserved drafts agree with visible panels; no invented uncertainty.

## Task S7 — Settings, notifications, and tours

Files: modify settings/notifications routes, `NotificationDropdown.tsx`, `hooks/useNotifications.ts`, `lib/firebase/fcm.ts` as needed, onboarding tours; create `components/settings/{ProfileSection,AcademicSection,AppearanceSection,NotificationSection,SecuritySection}.tsx`, `tests/e2e/settings-notifications.spec.ts`.

- [ ] Replace indirect avatar trigger and unlabelled switches. Add upload/permission status, pending/save/rollback and section-level dirty behavior.
- [ ] Add Light/Dark/System section. Keep academic mode consequence confirmation and existing secure account deletion.
- [ ] Make password controls provider-aware; no unsupported add-password button.
- [ ] Implement semantic notification actions and clear confirmation; propagate fetch/mutation errors from hooks.
- [ ] Retarget tour anchors, handle absent targets, keep Skip/replay/focus/reduced motion. Remove surprise browser permission prompts.
- [ ] Run `npm.cmd run test:e2e -- tests/e2e/settings-notifications.spec.ts`, typecheck, lint and build. Update S ledger entries with captures and remaining backend-dependent gates.
