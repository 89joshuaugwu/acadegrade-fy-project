# Data and Integration Contracts

This is the boundary between presentation work and functional work. “Existing” means observed in source, not proven by a live production test. “Required extension” means the capability must be implemented and verified before the proposed UI can claim it works. “Deferred” means leave it out of the first upgrade.

## Dependency Map

| Experience | Existing source/service | Required integration work |
|---|---|---|
| Profile/registration guard | `hooks/useAuth.ts`, `hooks/useProfile.ts`, `lib/auth/profile.ts` | Preserve completion logic; expose retryable loading errors and provider-aware state |
| Email verification/finalization | `app/api/auth/otp/{send,verify}/route.ts`, `app/api/auth/register/finalize/route.ts` | Preserve ticket consumption, server flag checks, transaction and replay protections |
| Academic timeline | `lib/academic/timeline.ts`, `types/user.ts` | Reuse session/duration calculations; do not create UI-only alternatives |
| Dashboard/history | `hooks/useCGPA.ts`, `useSemesters.ts`, `useAnalytics.ts` | Distinguish missing/error/zero; define latest-update ordering and risk eligibility |
| Course editing | `types/course.ts`, `lib/cgpa/calculator.ts`, `components/cgpa/GradeTable.tsx` | Unify score/grade/AR presentation and serialization; preserve ids and nulls |
| OCR | `app/api/results/extract/route.ts` | UI limits, preview/review, quota errors, abort behavior; verify deployment payload ceiling |
| Code import/export | Existing logic in semester page and share-code collections | Preserve exact code scope/schema and expiry; add preview/duplicate handling before apply |
| Forecast/what-if/written | `app/api/ai/{forecast,whatif,insights}/route.ts` and `hooks/useInsights.ts` | Preserve cooldown/cache/source; no invented uncertainty or generation progress |
| Transcripts | `/api/transcript/generate`, `/api/transcript/share`, `lib/pdf/transcript.ts` | Shared semantic adapter for preview/PDF/share; institution, PI, class, null/estimated consistency |
| Notifications | `hooks/useNotifications.ts`, `lib/firebase/fcm.ts` | Permission state, request-on-action, mutation failure propagation and pending state |
| App downloads | `lib/mobile-app-links.ts`, config/settings | Reuse availability rules; no fabricated store URLs |
| Admin lists | `/api/admin/users`, `/api/admin/courses` | Required pagination/filter/sort schema, validated server queries and indexes |
| Admin reporting | `/api/admin/stats`, `/api/admin/api-analytics` | Truthful sample scope and real PI; remove random approximation |
| Admin settings | `/api/admin/settings` | Section field allowlists, validation and safe partial updates; change history is a separate extension |
| Offline | `app/sw.ts`, `ServiceWorkerKill.tsx`, PWA surfaces | Explicitly resolve contradictory claims; restoring offline storage/sync is deferred |

## Academic Presentation Adapter

Create `lib/academic/course-presentation.ts` and `lib/academic/result-order.ts`. Keep numeric calculation functions in `lib/cgpa/`; presentation adapters must call the domain rules rather than reimplement grade thresholds in components.

Recommended return type:

```ts
type CourseEntryMode = 'scores' | 'total' | 'grade' | 'awaiting';
type CoursePresentation = {
  id: string;
  semesterId: string;
  mode: CourseEntryMode;
  ca: number | null;
  exam: number | null;
  total: number | null;
  grade: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | null;
  gradePoint: number | null;
  piPoint: number | null;
  piEstimated: boolean;
  scoreLabel: string;
  eligibleForRisk: boolean;
  updatedAtMs: number | null;
};
```

This is a proposed view model, not a replacement Firestore schema. Use stable server ids; local draft ids are generated once when a row is created.

Rules in precedence order:

1. Explicit awaiting-result state overrides derived grade and displays “Awaiting result.” It is excluded from known-result risk and completed-result calculations unless a documented domain policy says otherwise.
2. Complete valid CA/exam: show both and compute total using the actual scale; zero is a valid score.
3. Saved total with incomplete/no CA/exam: preserve the total. Show missing breakdown as em dashes. Never reconstruct a fictional CA/exam split.
4. Grade only: preserve grade/grade point, show “Grade only,” and label PI estimated if the current domain algorithm estimates it. Do not show `0/100`.
5. No valid result: display “Not entered”; no grade F, no risk count, no invented PI.
6. Conflicting saved total and CA+exam is a data-validation state. Flag it for review rather than silently overwriting whichever source the user did not edit.

Current `CourseInput` omits a total-only mode even though saved `Course` has `totalScore`. Any extension must maintain backward compatibility with existing web/mobile documents. Add an explicit discriminated draft model at the UI boundary rather than sending undefined properties to Firestore. Serialize nullable fields as `null` or deliberately omit allowed fields; never store `undefined`.

The current course PI is a per-course continuous point value; `units * gradePoint` is a different weighted quantity. Label each correctly. Cumulative metrics are credit-weighted, not the arithmetic mean of displayed semester values.

### Classification boundary check

`resolveDegreeClass()` currently uses inclusive ranges with maxima such as `4.49` and the next minimum `4.5`. A raw value such as `4.495` falls in the gap and can default to Fail. Add boundary fixtures before changing labels/colors. Define classification using the domain's intended rounding policy, or continuous lower-bound thresholds in descending order, and share that policy across all outputs. Do not let individual screens round differently.

### Recent results ordering

For actual “Recent updates”:

- Normalize valid Firestore Timestamp, Date, or ISO timestamps at the boundary.
- Sort known `updatedAt` descending, then `createdAt`, then deterministic session/level/semester/code/id tie-breakers.
- Carry both course and semester id for navigation.
- Preserve the data scope: if only the latest semester was loaded, label it “Latest semester results,” not the latest updates across the whole account.
- Legacy missing timestamps sort after known dated updates and use academic chronology. If none are dated, use the honest fallback title.
- Do not silently backfill historical timestamps with the migration execution time: that would make every old record look newly edited.

Start by reusing already-loaded course data. If a dedicated recent-result query is needed for scale, define an indexed server/collection-group query scoped to the authenticated uid. Avoid one network fetch per semester on every dashboard render.

### Risk semantics

The current dashboard flags score below 50, which is an attention threshold rather than the 5-point scale's fail threshold. Keep the label “Needs attention” and explain the rule, or unify it with the established risk model. Unknown/AR records are a separate completeness count. Grade-only rules must be explicit; do not convert a missing total to zero.

## Admin List Contract

Existing users GET returns `{ users }` after fetching all profiles and per-user semesters; courses GET returns `{ courses }` after fetching the whole catalogue. Styling pagination controls alone will not make those endpoints paginated.

Required extension for each endpoint (keep existing array keys for compatibility):

```ts
type PageInfo = {
  nextCursor: string | null;
  hasMore: boolean;
  pageSize: number;
  totalCount: number | null; // null when no complete count was queried
};
// Users: { users: AdminUserRow[], pageInfo }
// Courses: { courses: CatalogRow[], pageInfo }
```

Query parameters: `limit` default 25/max 100, `cursor`, allowlisted `sort` and `direction`, and supported filters. Reject malformed cursor/filter input with a safe 400 response. Verify authorization before any query. Cursor tokens must bind to filter/sort state; reset pagination when those change. Stable secondary ordering uses document id.

Use Firestore cursor queries with documented indexes, not numeric offset paging or a full-collection fetch followed by JavaScript slicing. [Firestore cursor documentation](https://firebase.google.com/docs/firestore/query-data/query-cursors).

### Search decision

Do not pretend Firestore provides arbitrary substring search across three fields. First-release server search may use a field selector (Name, Email, Matric for users; Code or Title for courses) and a normalized prefix query. The label/help must say “Starts with.” Equality filters for status/department/level can be combined only where supported by the query/index.

Normalized search keys and a created-date sort field may require additive backfill for legacy profiles. That is a separate, explicit migration with dry-run counts and recovery notes before applying it. Until the indexes/backfill are implemented, retain the old bounded dataset behavior with a clear scope and do not mark scalable admin search complete. A new paid search service is deferred.

Avoid per-user nested queries on each page where a trustworthy existing analytics aggregate can supply metrics. Missing aggregate shows “Unavailable,” not zero. If aggregate accuracy cannot be established, fetch only the displayed page's necessary data and label its cost/latency as a remaining engineering issue.

### Filters, export, and mutations

- Filter scope must match table and export scope. Exporting current page is acceptable if labeled explicitly; exporting every matching result requires a bounded server export implementation.
- API user status derives from Auth plus mirrored profile state. Handle partial failure between the two writes; UI cannot assume the mirror is authoritative when the server reports failure.
- Course catalogue currently uses `department` at the endpoint but `dept` in `CatalogCourse`. Normalize on read and choose one documented write field without breaking mobile/legacy consumers.
- Enable/disable and course create/update/delete require runtime validation, not just frontend disabled buttons.
- Restrict settings mutations to permitted sections/fields. The current generic collection/doc update capability must be reviewed before wiring new configuration controls to it.

## Truthful Analytics and Forecasts

Remove the randomized PI derivation in `app/(admin)/admin/analytics/page.tsx`. Acceptable first release: omit the plot or use an “Unavailable” state. Later enhancement: return real paired CGPA/PI aggregates with sample counts and missing-data counts. Never infer PI from CGPA with random jitter.

For API monitoring, the existing 5,000-event cap means a busy time window can be incomplete. Surface `truncated`/sample-size metadata from the endpoint if implemented; until then an explicit bounded-window note is required. Do not display an all-time total from the limited sample.

Forecast schema controls the UI. If there is no confidence interval, do not render one. If total completed history is insufficient, explain that more results are needed. Error, quota exceeded, stale cache, no data, and generation in progress have different actions. Preserve existing rate-limit values; do not copy outdated constants into product text.

## Transcript Contract

Use a shared semantic model for private preview, PDF generator, and public share snapshot. Minimum fields: institution, student identity, programme, department, included semesters, per-course scores/grade/PI with estimated flags, credit totals, cumulative metrics, source/creation date, unofficial disclaimer, photo preference.

Sharing already creates a snapshot with 30-day expiry in `/api/transcript/share`. UI must reflect the actual expiry and disclose included data before creation. Existing 404 and 410 responses drive different recipient states. Revocation must continue to enforce ownership through the current data rules or an authenticated route.

A QR code should be generated locally in browser/server from the share URL; a new small QR dependency can be considered during implementation. The current external QR URL embeds the share link in another service's request. Do not add more incidental external exposure during redesign.

## Backend Work Boundaries

Required for correctness: result mode adapter, recent-result labels/order, unknown-risk handling, classification boundary policy, current-account admin guard, truthful PI chart, correctly scoped monitoring totals, existing auth regression tests.

Required for full admin target: paginated list queries, validated filters/sort, safe settings fields, explicit mutation errors, necessary indexes and normalized-data migration.

Deferred beyond the first upgrade: paid search infrastructure, real-time collaborative editing, a new role hierarchy, bulk user operations, an audit-log dashboard, background bulk-reset jobs, a new OCR service, offline write synchronization, or account linking without an existing secure endpoint. Do not add decorative controls for these features.
