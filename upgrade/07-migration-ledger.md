# Migration Ledger

All entries start **Planned**. Update an entry only after implementation and relevant verification. Do not mark a route done because only its happy-path colors changed.

## Package Sequence

| ID | Work package | Dependency | Status | Plan |
|---|---|---|---|---|
| F | Foundations, canonical UI, shells | None | Planned | [Wave 1](./plans/01-foundation-shells-implementation-plan.md) |
| P | Public/auth/utility routes | F component gallery and shell accepted | Planned | [Wave 2](./plans/02-public-auth-implementation-plan.md) |
| S | Student workspace | F; academic adapters before result styling | Planned | [Wave 3](./plans/03-student-product-implementation-plan.md) |
| A | Admin console | F; list/data API contracts before data-table completion | Planned | [Wave 4](./plans/04-admin-console-implementation-plan.md) |
| Q | Cross-product verification and release evidence | Each route package complete | Planned | [Wave 5](./plans/05-quality-rollout-implementation-plan.md) |

P and S/A may proceed independently after F is stable if ownership is isolated. Do not have multiple agents editing shared primitives or `globals.css` independently.

## Source-to-Target Ledger

| ID | Existing source | Target/action | Priority | Evidence required |
|---|---|---|---|---|
| F01 | `app/globals.css`, `app/layout.tsx` | Complete semantic theme, aliases, foregrounds, system choice | P1 | Both themes + system switch + contrast gallery |
| F02 | `Button`, `Input`, `Badge`, `Card`, `Switch`, `Toggle` | Improve canonical variants; explicit link/icon actions; remove metric switch duplication | P1 | Keyboard and pending/disabled states |
| F03 | `Select.tsx` | Authored searchable combobox + shared mobile sheet presentation | P1 | Keyboard, no-match, long options, keyboard viewport |
| F04 | `Modal.tsx`, `MobileDrawer.tsx` | Overlay core, focus, overflow, requireText, drag dismissal | P1 | Focus trap/restore, dirty dismissal, backdrop/drag tests |
| F05 | `PageTransition.tsx`, `useReducedMotion.ts` | Supported route entries, spring presets, reduced motion | P2 | No draft remount; motion capture |
| F06 | `Navbar.tsx`, `PublicShell.tsx` | Single public navigation/footer contract | P2 | Mobile drawer, cross-page hash links |
| F07 | `StudentShell.tsx`, `BottomTabBar.tsx` | Persistent context, safe-area, theme, deterministic active routes | P1 | Direct nested route and bottom-nav tests |
| F08 | `AdminShell.tsx`, `app/(admin)/layout.tsx` | Neutral themes and uid-keyed authorization state | P1 | Login→protected/account-switch denial test |
| F09 | `Skeleton*`, `EmptyState`, form barrel | Canonical error/loading/field/notice system | P1 | Error distinct from empty; first-invalid focus |
| F10 | `package.json`, route metadata | Working lint/type/test scripts; titled routes | P1 | Tool output and browser title checks |
| P01 | `app/(public)/page.tsx` | Product artifact/story hero, honest proof, FAQ, app section | P2 | 390/1440 captures both themes |
| P02 | About page/layout | Editorial content and CMS states | P2 | Long content/fetch failure |
| P03 | Calculator page/layout | Editor/result hierarchy, validated drafts | P1 | Mode and empty/error/leave behavior |
| P04 | Login/register/forgot-password | Shared auth shell, accessible phases; preserve finalizer | P1 | Email + Google + interrupted setup journeys |
| P05 | Registration academic fields | Datalist→canonical searchable picker; wrapped duration | P1 | 320px, 10 years, long institution, first invalid |
| P06 | Copy-code page/layout | Theme-aware secure utility | P2 | Missing/invalid/copy-failed states |
| P07 | Both share metadata locations + share page | Resolve ownership; recipient document states | P1 | 404/410/network/print; privacy metadata |
| P08 | App links/download components/routes | Honest availability and QR destinations | P2 | Missing Android/iOS URL |
| S01 | Dashboard + academic adapters | Correct recent ordering, unknown risk, calm standing summary | P1 | Fixture parity/navigation and long-title row capture |
| S02 | Results page + semester hook | Semantic disclosure, real error path, chronological library | P1 | Expand error/retry; empty and disabled add |
| S03 | New-semester page | Semantic validated form + duplicate/dirty handling | P1 | Session errors, successful create destination |
| S04 | Semester page + GradeTable | Mode-aware editor, stable ids, import/review/save | P1 | CA/exam/total/grade/AR cases and keyboard |
| S05 | Insights + AI components | URL tabs, preserved scenarios, clear forecast states | P1 | Back/forward/keyboard/quota/reduced motion |
| S06 | Transcript page + PDF/share renderers | Common semantics, institution/PI/class fixes, canonical sharing | P1 | Preview/PDF/share parity and A4 print |
| S07 | Notifications + dropdown | Semantic actions, confirmation, permission states | P1 | Keyboard, clear failure, denied browser permission |
| S08 | Settings | Sections, theme, uploads, provider-aware security | P1 | Dirty save/error/provider fixtures |
| S09 | Tours | Retarget migrated elements; skip/replay and focus | P2 | Empty/new account and reduced motion |
| A01 | Admin login | Shared neutral auth, single password reveal | P1 | Denied/valid/error with no duplicate control |
| A02 | Admin overview | Useful real metrics, remove testing reset control | P0 | No bulk action in overview; failed vs zero stats |
| A03 | Admin users + users API | Semantic cursor table, scoped filters, status dialog | P1 | API cursor/filter test and mutation failure |
| A04 | Admin courses + courses API | Catalogue CRUD/table, validated schema boundary | P1 | Prefix search, form validation, delete confirmation |
| A05 | Admin analytics + stats API | Remove random PI; real data/unavailable | P0 | Deterministic same dataset, sample labels |
| A06 | API monitor + API | Freshness, cap disclosure, endpoint table | P1 | 5k cap, pause, background, failure states |
| A07 | Admin settings + API | Section forms, dirty/footer, safe partial update | P1 | Every section save/discard/error and long content |
| Q01 | System pages/error boundaries | Branded, recoverable, titled states | P1 | Offline/404/403/500 fixtures |
| Q02 | All modified routes/components | Cross-theme/responsive/accessibility/motion/print | P1 | QA matrix fully recorded |
| Q03 | Docs/legacy UI variants/assets | Reconcile design rules and delete only unused migrated code | P2 | Import scan, no broken routes, no asset regressions |

## Promotion Rule

For each entry record: implementation commit or diff reference, modified paths, tests run and outcome, screenshot paths with viewport/theme, remaining limitation, and next dependency. Suitable statuses: Planned, In progress, Needs verification, Verified, Deferred with reason. “Verified” requires actual evidence.

Keep a named owner for shared files during parallel work. One agent owns `globals.css`, primitives, and shells; domain agents request an additive primitive change through that owner. Preserve unrelated user edits.

## Rollout Boundaries

The current task writes only this folder. Future implementation may update source/docs/dependencies according to these plans. Production data migrations, rule deployment, app deployment, and new external services are distinct actions: prepare reviewable diffs and evidence first, then use the user's deployment/migration authorization.

Ship in reviewable packages. Avoid a single enormous diff covering auth, business math, admin APIs, and visual redesign without intermediate checks. Keep the existing mobile Firestore contract compatible throughout.
