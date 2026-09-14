# Current-State UI/UX Audit

## Audit Method and Limits

This audit reviewed the current Next.js route tree, shared components, theme layer, layouts, charts, forms, authentication flow, student experience, admin experience, package scripts, and existing design documents. It also inspected the deployed public page structure and ran a strict static premium-UI scan.

This is primarily a code and behavior audit, not a full cross-browser pixel audit. The implementation phase must add automated visual captures before claiming visual parity or release readiness.

## Executive Assessment

AcadeGrade is not starting from zero. It has a meaningful product model, coherent typography choices, a useful semantic color vocabulary, working responsive foundations, strong academic features, and recently repaired registration integrity. Its primary weakness is fragmentation: polished moments coexist with page-local patterns, overactive motion, incomplete light-mode coverage, generic marketing composition, and an admin console that behaves more like a styled prototype than an operations product.

The observations below are a subjective prioritization aid, not a measured quality score. A credible overall rating requires browser captures and completed user journeys in both themes; those checks have not been performed in this documentation pass.

| Dimension | Current | Main reason |
|---|---:|---|
| Product identity | 6.5 | “Precision Intelligence” is promising, but generic feature cards and glow patterns dilute it |
| Information hierarchy | 6 | Student pages are understandable; long settings, insights, and admin pages lose priority |
| System consistency | 4.5 | Shared primitives exist, yet route-local overlays, controls, tables, and states remain common |
| Light/dark theming | 4 | Dark is the default art direction; light and admin theme coverage are incomplete |
| Responsive behavior | 6 | Basic shell and stacking are present; dense tables, toolbars, transcript, and long forms need contracts |
| Accessibility | 4.5 | Focus and some ARIA exist; clickable divs, incomplete tabs/comboboxes, icon labels, and modal duplication remain |
| Motion quality | 5 | Reduced-motion hook exists, but movement is overused and inconsistent |
| Admin operability | 3.5 | No server pagination/URL state, weak safeguards, fake tables, and one fabricated chart |
| Async and state UX | 5 | Toasts are widespread, but loading/error/empty/partial states are inconsistent |
| Maintainability | 4.5 | Several 400–1,091-line pages and duplicated presentation logic slow safe iteration |

## What Already Works

- The product has a credible academic core: CGPA/PI, semester results, forecasts, risk analysis, OCR import, transcript generation, share links, notifications, and administration.
- Bricolage Grotesque, DM Sans, and Geist Mono are appropriate display, interface, and numeric families.
- CSS variables already provide a useful start for semantic theming.
- Shared `Button`, `Input`, `Select`, `Modal`, `Badge`, `Card`, `Switch`, `Toggle`, skeleton, chart, and CGPA components exist.
- The canonical `Modal` already locks body scroll, restores focus, traps Tab, supports Escape, and closes from the backdrop.
- Registration now includes schema validation, safe draft persistence, provider-aware resumption, server finalization, and profile-completion protection. These are protected behavior, not redesign opportunities.
- Student navigation has desktop, drawer, and bottom-tab models and correctly treats nested result routes as active.
- The transcript now exposes CA, exam, total, grade, grade point, and PI columns in the HTML preview.
- Global focus-visible and scrollbar foundations exist.
- Insights includes rate-limit guidance and stale-analysis signaling, which are valuable product-specific states.

## Structural Evidence

### Route inventory

| Register | Routes |
|---|---|
| Public and auth | `/`, `/about`, `/calculator`, `/copy-code`, `/forgot-password`, `/login`, `/register`, `/share/[shareId]`, `/app/download/ios` |
| Student | `/dashboard`, `/results`, `/results/new`, `/results/[semesterId]`, `/insights`, `/transcript`, `/notifications`, `/settings` |
| Admin | `/admin/login`, `/admin/dashboard`, `/admin/users`, `/admin/courses`, `/admin/analytics`, `/admin/api-analytics`, `/admin/settings` |
| System | `/maintenance`, `/offline`, Android download route, API error and permission states |

### High-complexity files

The following page sizes are design-maintenance signals, not automatic defects:

| File | Approx. non-empty lines | Concern |
|---|---:|---|
| `app/(public)/register/page.tsx` | 1,091 | Wizard state, provider logic, fields, animation, persistence, and finalization share one file |
| `app/(admin)/admin/settings/page.tsx` | 689 | Seven operational settings domains share one long page and independent save patterns |
| `app/(public)/share/[shareId]/page.tsx` | 646 | Fetch, access states, transcript rendering, print layout, and actions are coupled |
| `app/(student)/insights/page.tsx` | 639 | Four products are implemented as one local-state page |
| `app/(admin)/admin/api-analytics/page.tsx` | 516 | Monitoring controls, charts, endpoint lists, users, and errors are monolithic |
| `app/(student)/transcript/page.tsx` | 507 | Share management, overlays, preview, print, and export are coupled |
| `app/(student)/settings/page.tsx` | 496 | Profile, academic settings, notifications, security, uploads, and modals share one page |
| `app/(student)/dashboard/page.tsx` | 482 | Metric logic, charts, AI summary, advert modal, and dashboard layout are coupled |

The implementation plans split these by responsibility without changing working data behavior.

## System-Level Findings

### Theme and tokens

- `app/layout.tsx` defaults to dark mode with `defaultTheme="dark"` and `enableSystem={false}`. Explicit light mode is possible; automatic system-theme following is disabled.
- `app/globals.css` duplicates some values between Tailwind `@theme` aliases and `:root`; values already drift. For example, grade B is `#6366F1` in one layer and `#818CF8` in another.
- Light mode does not map every semantic surface, border, dim, chart, and administrative state with the same completeness as dark mode.
- `AdminShell` hardcodes `#07090F`, `#1A0A0A`, and `#0E0808`, making the entire admin product dark and danger-tinted.
- Route code still contains at least 38 raw six-digit colors in public routes and 40 in admin routes. Brand SVGs and print CSS account for some, but the remainder bypass theme semantics.
- The documented z-index ladder stops at tooltip, while route-local overlays use `z-50` and `z-index: 9999`. This can produce stacking conflicts.

### Primitive fragmentation

- Canonical primitives exist, but several routes recreate modals, segmented controls, data tables, upload fields, empty states, spinners, and confirmation treatments.
- `components/forms/index.ts` is empty; there is no canonical field group, textarea, form section, dirty-state, or error-summary contract.
- `Select` provides a useful authored listbox baseline but lacks a complete ARIA relationship (`aria-controls`, listbox id, active descendant) and does not define remote search, stale request cancellation, virtualization, or mobile sheet behavior.
- `Switch` has a hardcoded screen-reader label of “Toggle,” so multiple switches are indistinguishable without surrounding association.
- `Button` applies scale-on-hover to every variant. This makes operational tables and forms feel less stable than they should.
- `Card` encodes glass and glowing hover as first-class patterns, encouraging decorative repetition.
- `PageTransition` exists but is unused, while pages implement independent motion.

### Feedback and state

- Toast use is common, which is a strength, but wording, duration, deduplication, retry actions, and whether a toast is appropriate are not governed.
- Raw spinners still appear in auth guards, dashboard, results, transcript, and admin verification, despite the existing design language favoring stable skeletons.
- Loading, empty, filtered-empty, permission-denied, offline, partial-error, and stale-data states are not modeled consistently.
- Most route pages are client components, so route-specific metadata and document titles are sparse.
- No component tests, route interaction tests, accessibility tests, stories, or visual regression files were found.
- `package.json` exposes only `dev`, `build`, `start`, and `lint`; the `next lint` script needs replacement for Next 16 tooling before it can be a reliable gate.

## Public and Authentication Findings

- The landing page is polished but follows a familiar hero → logo marquee → feature grid → steps pattern. It explains capabilities more than it demonstrates AcadeGrade’s specific proof: a degree trajectory built from real result structures.
- University names are presented as a marquee. Unless relationships are verified, copy must clearly say the product supports those grading contexts rather than implying institutional partnership.
- `Navbar` and `PublicShell` overlap in responsibility. Some pages compose `Navbar` and `PublicFooter` manually because there is no shared public route-group layout.
- Navigation buttons often use `window.location.href`, discarding client-side navigation benefits and making behavior inconsistent with links.
- Login, registration, and password recovery share `ReactiveAuthBackground` but do not yet behave as one coherent auth shell and recovery journey.
- Registration uses three native `<datalist>` fields for university, department, and programme. Their geometry, search quality, mobile behavior, selected state, and empty state are browser-controlled.
- Registration gives every step the same left-to-right transition even when moving backward, and success uses 30 decorative particles. Directional motion and a quieter completion state would communicate progress better.
- `/copy-code` uses a separate hardcoded dark visual language and feels disconnected from the rest of public utility flows.
- Calculator uses local overlay/control patterns and needs a more obvious “scenario, result, next action” hierarchy.
- Shared transcript presentation is functional but combines public navigation, permission states, document preview, and actions in one large client surface.

## Student Findings

### Shell and dashboard

- The shell is usable, but the desktop profile block consumes valuable navigation height. A compact identity/footer model would make the rail calmer.
- There is no persistent desktop theme control in the shell.
- The dashboard contains useful information but mixes glass, holographic cards, glowing AI borders, count-up numbers, chart cards, quick actions, and a custom advert overlay. Too many surfaces compete for importance.
- The advert modal is route-local and lacks the canonical dialog’s focus/Escape contract.
- Metric preference writes need optimistic state, rollback, and a failure message.
- Loading uses a page spinner; the stable dashboard frame should appear immediately with skeleton values.

### Results and editing

- Results uses a div-based accordion without complete disclosure semantics (`aria-expanded` and `aria-controls`).
- Course-fetch errors on expand are logged but not recovered in the row.
- A disabled capability is rendered as a link to `#`, creating a false affordance.
- “New semester” has no semantic form wrapper, error summary, duplicate-semester prevention message, unsaved-changes guard, or deterministic back destination.
- Semester detail has a good action set but three workflows compete at the top. Import code, share code, and upload result should be grouped by intent.
- Result-slip upload needs documented file limits, selected-file preview, validation, progress, cancellation, retry, and drag/drop semantics.
- Copy icon actions need accessible labels and confirmation close to the copied value.

### Insights

- The four tabs are visually animated and use `role="tab"`, but omit URL persistence, `aria-controls`/tabpanel relationships, roving keyboard focus, and direct-link behavior.
- CGPA/PI is another route-local segmented control; it should use the same canonical control as settings and dashboard.
- Each insight tab invents its own card composition. A shared “question → evidence → action” pattern would reduce cognitive switching.
- The full-screen AI synthesis treatment and persistent pulse indicators overstate ordinary waiting. A stable progress state is more trustworthy.

### Transcript, notifications, and settings

- Transcript has CA and exam columns, but column presence does not establish data correctness. In `app/(student)/transcript/page.tsx`, the course column labeled PI displays `units * gradePoint`, which is a weighted grade-point quantity, not continuous PI. Share and delete overlays are hand-built with raw `9999` stacking and incomplete dialog behavior.
- Transcript’s institution heading is hardcoded to ESUT rather than profile-driven or explicitly scoped.
- Notification rows are clickable `motion.div` elements rather than semantic links/buttons. Keyboard users cannot reliably activate unread rows.
- “Clear all” executes immediately without confirmation or undo.
- Settings uses a long card stack with local segmented controls, a nested button inside a clickable avatar container, and section navigation that does not reflect the active section.
- Settings uploads lack progress, validation detail, and failure recovery. Notification switches need individual accessible names and pending/error behavior.

## Admin Findings

### Shell and permissions

- The red-black shell treats every admin action as danger. This reduces the salience of genuinely destructive actions and prevents professional light mode.
- Admin verification uses a spinner and signs out non-admin users after a toast. A dedicated access-denied state should explain the account and next step without exposing protected content.
- Admin login duplicates password visibility behavior already provided by `Input` and lacks `noValidate`.

### Dashboard and analytics

- “Reset All Onboarding (Test)” appears on the production dashboard and updates users from the client. It needs removal from the overview or relocation behind a protected maintenance workflow with typed confirmation, scope preview, progress, result summary, and audit event.
- The analytics page fabricates PI values using `Math.random()` and labels the chart “PI vs CGPA.” This is a release-blocking trust defect. Use real data or an explicit unavailable state.
- Dashboard and analytics duplicate chart tooltip, color, responsive, and empty-state configuration.
- Chart-only communication lacks a table or textual summary for screen-reader and low-vision users.

### Users and courses

- Both pages fetch and filter all data client-side. They need server pagination, filter/sort query parameters, result counts, loading continuity, and retry behavior.
- Users and courses render tables with CSS-grid divs rather than semantic tables or an accessible grid contract.
- User enable/disable happens without a confirmation dialog, impact statement, reason, or outcome audit reference.
- Course deletion uses inline “Yes/No” controls that change row geometry and weaken confidence.
- Add-course uses native selects and a page-local modal despite canonical equivalents.

### API monitor and settings

- API Monitor truncates endpoint data with `.slice(0, 12)` without disclosure or pagination.
- Auto-refresh is indicated by a continuously spinning icon; motion communicates activity but not freshness, next refresh, pause state, or fetch failure.
- Time range uses a native select without an explicit ownership decision.
- Admin Settings is a 689-line stack with many independent save buttons, raw textareas, uploads without progress/cancel, no page-level dirty-state model, and limited confirmation for high-impact changes.
- Grade-scale editing, feature flags, maintenance, announcements, app links, adverts, AI prompts, and About content need separate settings sections with permission and change-impact context.

## Strict Static Audit Findings

The strict scanner returned eight findings:

| Finding | Disposition |
|---|---|
| Native select in admin API analytics | Confirmed; replace with canonical authored select |
| Two native selects in admin courses | Confirmed; replace with canonical authored select |
| Native-select warning in calculator | False positive at the reported location: it renders the shared `Select` component |
| Native-select warning in new-semester page | Scanner false positive; the page uses the shared `Select` component |
| Actionless button warning in results | Not actionless: it is inside a navigation Link. The actual issue is nested interactive elements; replace with a single styled link |
| Actionless button warning in settings | Activation bubbles to the avatar container, so it is not entirely inert. Replace the indirect handler and hover-only affordance with one explicit, labeled file trigger |
| Admin login form missing `noValidate` | Confirmed |
| Admin settings textarea resize warning | Scanner false positive for a missing resize policy: the textarea has `resize-y`. Consolidating labels, errors, autosize limits, and appearance is still a design improvement |

## Additional Findings from the Second Review

| ID | Evidence | Implication and required response |
|---|---|---|
| A01 | `app/(student)/dashboard/page.tsx`, `fetchCoursesData`: last academic semester, then unordered `latestCourses.slice(0, 3)` | This does not establish the three most recently updated results. Choose and label a precise ordering; the target is timestamp-ordered updates with an honest legacy fallback |
| A02 | Same function counts risk using `(totalScore ?? 0) < 50` | Missing scores become zero and appear at risk. Preserve unknown/awaiting-result separately and handle grade-only records |
| A03 | `components/cgpa/GradeTable.tsx`, `computeRow`: totals derived from CA/exam even in read-only mode | Records imported with only total/letter grade can display a computed zero or F. Introduce a shared, mode-aware presentation adapter before restyling the table |
| A04 | Same component resynchronizes only when `initialCourses.length > 0` | Switching to an empty record can retain prior rows. Model authoritative record identity and dirty edits explicitly |
| A05 | `components/ui/Modal.tsx`: `confirm.requireText` exists in its type but is never enforced | A documented typed-confirmation capability is not implemented. Add it and test it before using it for administrative danger actions |
| A06 | Same Modal uses container focus and a selector including disabled/hidden controls | Existing focus management is a useful start, not verified complete. Test the initial Tab, reverse Tab, disabled controls, nested popovers, and long-dialog scrolling |
| A07 | `app/(admin)/layout.tsx` retains `isAdmin` across route/user changes and marks login as allowed | Inspect a login-to-protected-route and account-switch race before migration. UI must not render protected children until verification for the current identity succeeds; server authorization remains mandatory |
| A08 | `components/layout/StudentShell.tsx` requests notification permission on mount | Move the browser prompt behind an explicit user action with context; represent granted/denied/unsupported states |
| A09 | `ServiceWorkerKill` is mounted at root while marketing constants promise offline access | Confirm actual offline support before publishing this claim. An offline fallback page is not proof that academic records remain available |

These are source findings and regression risks. This audit has not executed a production account mutation, a Firestore security test, or a complete registration journey.

## Evidence Boundaries

All visible routes, route shells, shared UI, charts, grade presentation, and their main data dependencies were inventoried. Backend files were inspected where they constrain the UI; this is not a full security audit of every server implementation. Environment secret values were not needed. No fresh production build or authenticated browser session was run during this pass.

References for implementation decisions: [Next.js ESLint configuration](https://nextjs.org/docs/app/api-reference/config/eslint), [WCAG reference](https://www.w3.org/WAI/WCAG22/quickref/). The planned lint repair follows Next.js's move to running ESLint directly.

## Priority Risks

| Priority | Risk | Release rule |
|---|---|---|
| P0 | Fabricated PI analytics shown as real | Must be removed or backed by real data before visual launch |
| P0 | High-impact admin onboarding reset exposed without an operational safeguard | Must be relocated and protected before visual launch |
| P0 | Registration/security guarantees regressed during redesign | Preserve behavior with integration tests before route migration |
| P1 | Incomplete light/system theme and hardcoded admin shell | Foundation wave blocker |
| P1 | Route-local dialogs and destructive actions without consistent keyboard/confirmation behavior | Canonical overlay migration blocker |
| P1 | Admin fake tables and client-only data grids | Must be corrected before calling admin “production-grade” |
| P1 | Non-semantic notification and accordion interactions | Accessibility release blocker |
| P2 | Generic marketing composition and overactive motion | Core quality target |
| P2 | Large page monoliths | Address incrementally while migrating each route |
