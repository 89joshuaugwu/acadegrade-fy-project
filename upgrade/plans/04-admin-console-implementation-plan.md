# Admin Console Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce a professional admin workspace with truthful analytics, useful tables, clear permissions, and safe configuration changes.

**Architecture:** Neutral canonical shell, domain-specific tables/forms, typed authenticated endpoints, cursor-based lists, explicit async and confirmation states.

**Tech Stack:** Existing Next route handlers/Firebase Admin/React/Recharts stack; Wave 1 primitives and testing.

**Spec:** [Admin screen specifications](../04-route-screen-specs.md), [UX contract](../06-ux-contract.md), [Backend contracts](../10-data-and-integration-contracts.md).

## Global Constraints

Do not test bulk actions against production. Preserve server authorization. Do not add a new role system, paid search service, background bulk reset, or audit-log dashboard as a side effect of this design. Backend pagination and normalized-field migrations are required work before claiming the full table target works; deploying migrations is a separate action. Use these tasks directly if named skills are unavailable.

---

## Task A1 — Remove misleading/disruptive overview behavior

Files: modify `app/(admin)/admin/analytics/page.tsx`, `app/(admin)/admin/dashboard/page.tsx`; create `tests/e2e/admin-overview.spec.ts`.

- [ ] Replace randomly derived PI points with an unavailable state or omit that plot. Retain real chart data and label basis/sample.
- [ ] Remove the production overview's “Reset All Onboarding (Test)” control and its unused client bulk-write handler. Do not add a replacement job in this wave.
- [ ] Add fixtures distinguishing zero, missing, failed and real stats. Ensure no fabricated change arrows/sample growth.
- [ ] Run `npm.cmd run test:e2e -- tests/e2e/admin-overview.spec.ts`. Expected: deterministic analytics and no exposed testing bulk operation.

## Task A2 — Implement list API contracts before table controls

Files: modify `app/api/admin/{users,courses}/route.ts`; create `lib/admin/list-query.ts`, `types/admin.ts`, `tests/integration/admin-lists.test.ts`; add `firestore.indexes.json` only if indexes are required and not already managed elsewhere.

- [ ] Capture current consumers and response compatibility. Define schemas from `10`, including limit/cursor/filter/sort and safe errors.
- [ ] Write tests for unauthorized/forbidden access, malformed cursor, ties across pages, changed filter invalidating cursor, complete filter scope, and empty page.
- [ ] Implement stable Firestore cursor queries; keep array keys and add pageInfo. Return unknown count as null, not a guessed number.
- [ ] Implement only supported prefix/equality filters. Add explicit search-field selector semantics rather than pretending multi-field substring search exists.
- [ ] Resolve `dept`/`department` read mapping. Plan additive normalized-field backfill with dry-run counts and rollback/recovery notes; do not execute production backfill automatically.
- [ ] Run `npm.cmd run test:unit -- tests/integration/admin-lists.test.ts` against isolated dependencies/emulator. Expected: correct page continuity and authorization. Record any migration/index gate still pending.

## Task A3 — User management table and status change

Files: modify users route; create `components/admin/users/{UsersTable,UserDetailPanel,AccountStatusDialog}.tsx`, `tests/e2e/admin-users.spec.ts`; update users mutation API only as required for validated errors/safety.

- [ ] Bind URL-backed search field/query/filter/sort and cursor state to A2. Preserve stale rows with a loading label; discard stale request responses.
- [ ] Build real table and mobile details disclosure; page size 25, truthful counts, clear filters, selected-user detail drawer.
- [ ] Keep actions explicit; show account identity/impact in enable/disable confirmation. Handle Auth/profile mirror partial failure without displaying an unconfirmed status.
- [ ] Add export only with a truthful implemented scope; no dead Add user or mass-operation controls.
- [ ] Capture this as the admin reference surface in light/dark at 390/1440px. Run `npm.cmd run test:e2e -- tests/e2e/admin-users.spec.ts` including filter/back/next/disabled failure cases.

## Task A4 — Course catalogue CRUD

Files: modify courses route/API; create `components/admin/courses/{CatalogTable,CatalogCourseForm}.tsx`, `tests/e2e/admin-courses.spec.ts`.

- [ ] Bind supported query state to A2 and render semantic table with code/title/units/department/level/semester.
- [ ] Replace local modal/native selects with canonical form/dialog, explicit create/update submit, validation and retained draft.
- [ ] Normalize code and validate fields at the server. Define catalogue duplicate policy and return meaningful errors.
- [ ] Replace inline Yes/No delete with named confirmation. Clarify catalogue deletion versus existing student record copies based on actual implementation.
- [ ] Run `npm.cmd run test:e2e -- tests/e2e/admin-courses.spec.ts`. Expected: CRUD success/error, keyboard and mobile form paths are usable with correct data mapping.

## Task A5 — Overview/reporting/monitor composition

Files: modify admin dashboard/analytics/api-analytics pages and relevant stats handlers; create `components/admin/{OverviewMetrics,OverviewCharts}.tsx`, `components/admin/monitor/{MonitorToolbar,EndpointTable,ErrorEvents}.tsx`, `tests/e2e/admin-monitor.spec.ts`.

- [ ] Use shared ChartFrame, semantic colors, real sample counts and table alternatives. Keep dates/filter controls only where backend supports them.
- [ ] Add API window/cap/freshness metadata to the response if needed; show sample/truncation honestly.
- [ ] Replace unexplained 12-endpoint truncation with clearly labeled top list and View all available data or supported pagination.
- [ ] Implement auto-refresh pause/resume, background pause, last-success time, local refreshing indicator and stale-on-failure. Preserve focus and scrolling during refresh.
- [ ] Match export labels to actual exported data. Never infer PI, costs or uptime that were not supplied.
- [ ] Run `npm.cmd run test:e2e -- tests/e2e/admin-overview.spec.ts tests/e2e/admin-monitor.spec.ts` with real/missing/capped/error fixtures.

## Task A6 — Settings sections and mutation boundaries

Files: modify admin settings route/API; create `components/admin/settings/{SettingsNavigation,AvailabilitySection,GradeScaleSection,AIPromptSection,AnnouncementSection,MobileLinksSection,AdvertsSection,AboutSection,SettingsSaveBar}.tsx`, `tests/e2e/admin-settings.spec.ts`, `tests/integration/admin-settings.test.ts`.

- [ ] Define per-section schema and field allowlist; inspect current generic document-update route before exposing new controls. Tests must reject unauthorized/disallowed fields.
- [ ] Add URL `section`, preserved drafts, dirty indicator, Save/Discard, confirmation before leaving dirty sections, and response errors inside the active section.
- [ ] Validate grade ranges/gaps/overlaps and preview representative scores; never silently recalculate historical records from a style change.
- [ ] Implement file size/type validation, preview/progress/retry and explicit final save for images. Use supported upload behavior; no fake progress percentages.
- [ ] Explain maintenance/feature impact; verify mobile URL availability; keep other section values unchanged on save.
- [ ] Run `npm.cmd run test:unit -- tests/integration/admin-settings.test.ts` and `npm.cmd run test:e2e -- tests/e2e/admin-settings.spec.ts`.

## Task A7 — Admin acceptance checkpoint

- [ ] Run all admin route tests, keyboard checks, 320px/390px/768px/1440px light/dark captures, and reduced-motion review.
- [ ] Confirm current-user guard test from Wave 1 still passes after login/shell changes.
- [ ] Run typecheck, lint and production build. Update A ledger entries with actual evidence and API/index/migration dependencies.
- [ ] Do not call pagination/search verified if only mocked responses were tested and the server extension/indexes remain incomplete.
