# Route and Screen Specifications

Read `03`, `05`, and `06` first. All screens inherit their theme, responsive, keyboard, loading/error, and motion contracts. This document defines composition and route-specific behavior. Existing paths are relative to the web repository; component paths marked “extract” are new.

## Shared Shells

### Public navigation and footer

Owners: `components/layout/Navbar.tsx`, `PublicShell.tsx`; consumers `/`, `/about`, `/calculator`, `/share/[shareId]`.

Navbar: logo left, Features (`/#features`), How it works (`/#how-it-works`), Calculator, About; theme control; Sign in and Get started. Authenticated CTA reads Dashboard only for a complete profile, otherwise Finish setup. Mobile collapses navigation into the canonical drawer, with labeled close, Escape, focus trap, and focus return. Hash links must work when opened from About or Calculator, not target nonexistent local ids.

Footer: concise product line, existing destinations, real contact channel if configured, app availability. Do not invent Privacy/Terms pages or dead links; published policies require real content and routes. Use one footer implementation. Keep authentication screens on a smaller AuthShell rather than mounting full marketing navigation around every form.

### Student shell

Owner: `components/layout/StudentShell.tsx`; guard `app/(student)/layout.tsx`.

Desktop: 240px rail with brand, four primary destinations, notification count, settings, compact identity and sign-out. Top context bar holds page title/breadcrumb when supplied, theme, notifications, and account actions. No giant profile card competing with content. Small viewports retain bottom navigation and one compact header; drawer and bottom tabs must agree on active route. Use `aria-current="page"` for current destinations.

Announcements sit below context with a dismiss button and message-id-based dismissal. Notification permission is requested from a purposeful action, never automatically during shell mount. Add a recoverable auth/config error state; protect children until both identity and profile are valid.

### Admin shell

Owner: `components/layout/AdminShell.tsx`; guard `app/(admin)/layout.tsx`.

224px neutral rail, small “Administration” identity, six current destinations, theme and account menu. Header contains breadcrumb/page context and optional operational status. Tablet/phone uses a drawer below 1024px. Use the same colors as the rest of the product with denser spacing and straight table edges. Retain server authorization and current-account verification; 403 shows an access-denied state with return/switch-account actions.

## Public Routes

### `/` — product home

Source: `app/(public)/page.tsx`. Extract `components/marketing/HomeHero.tsx`, `AcademicProof.tsx`, `ProductStory.tsx`, and `HomeFAQ.tsx`.

Order and geometry:

1. Navbar, then 112px top/80px bottom hero padding desktop; 48px/40px phone. Hero is a 5/7 grid with 40px gap, no forced full-screen height.
2. Eyebrow “For your academic journey”; headline “Know where your degree is heading.”; two-sentence description of recorded results, CGPA, and forecasts. CTA “Get started” and secondary “Try the calculator.”
3. Right artifact: a believable result fragment connected to a CGPA/PI trajectory, labeled “Illustrative example.” Static meaningful initial state; optional user-controlled semester selection, never random data or a looping chart.
4. Compact evidence strip: grade-scale explanation, source/review process, unofficial transcript export. Claims must match current capabilities.
5. Three-part story at `#how-it-works`: Add a result → Understand your standing → Plan the next semester. Each uses one large product crop/diagram and concise copy, alternating surface/rule treatment rather than nine equal feature cards.
6. `#features`: three outcome groups—Records, Outlook, Sharing—with secondary features inside each. Show one forecast example and identify its uncertainty.
7. App section: actual Android link, iOS Coming soon when absent; QR only for an available URL.
8. FAQ: CGPA vs PI, unofficial status, entering old results, missing scores, exports, available platforms. Use accessible Disclosure.
9. Final CTA and shared footer.

States: config unavailable keeps core web CTA and omits uncertain download claims. All sample data remains consistent across theme changes. No invented usage counts, testimonials, partners, or offline promise while service workers are explicitly unregistered.

Accept: first screen explains what the app does and exposes an actionable CTA at 390px and 1440px; theme switch is visible; no shift when auth/config loads.

### `/about` — purpose and trust

Source: `app/(public)/about/page.tsx`, its layout; data `/api/about`.

Use an editorial page: 720px readable introduction, one product artifact, explanation of CGPA/PI, then authentic creator/team information already provided by the CMS. Preserve real configured content and links. Replace technology orbit spectacle with a short “How calculations work” explanation useful to students; technical stack details belong in an optional lower disclosure if retained.

CMS loading uses text blocks; failure shows a retry and neutral fallback, not a blank page. Hero heading and body remain readable in both themes. No invented biography or university affiliation.

### `/calculator` — useful public trial

Source: `app/(public)/calculator/page.tsx`; extract `components/calculator/CalculatorWorkspace.tsx`.

Desktop layout: editor 7 columns, sticky result summary 5; mobile editor first with a compact result summary above, expanded calculation beneath. Header: “CGPA calculator” plus “Try a scenario without creating an account.” Explain what is stored locally, if any.

Toolbar: input mode, grade scale where supported, Add course. Rows: code/title optional, units required, score or letter, remove. Summary: GPA, PI with estimated label for grade-only inputs, total credits, grade distribution, calculation disclosure. Empty rows do not become failed courses. Reset needs confirmation only when non-empty work exists.

Save/signup CTA opens canonical auth-required dialog or navigates with a safe draft transfer. Do not silently discard a scenario on registration. If transferring the draft is not implemented, clearly explain the need to copy/export before leaving rather than pretending it persists.

Preserve the existing scenario-sharing action and incoming `c`/`m` encoded query links. Validate decoded data before rendering; malformed or oversized payloads show a recoverable error. Sharing is explicit and explains that the link includes the entered scenario.

Accept: keyboard-only entry, input validation, long rows, zero courses, decimal scores if supported, 48px actions, score/grade mode parity, valid/invalid shared-scenario links, and retained draft on validation failure.

### `/login` — sign in

Source: `app/(public)/login/page.tsx`; extract `components/auth/AuthShell.tsx` shared across auth routes.

Desktop proof panel 44%, form 56%, form max 440px. Mobile proof condenses to a small branded header. Heading “Welcome back”; Google action; separator; email/password; Forgot password link; Sign in; Create account. Keep reveal inside Input. Reserved pending/error area prevents jumping.

States: checking existing session, signed out, submitting, invalid credentials, provider cancelled, provider unavailable, disabled account, failed profile load, incomplete profile. Map errors to useful copy; complete profile routes to safe return destination, incomplete profile resumes registration. Do not toast a successful account setup before finalization.

### `/register` — account and academic setup

Source: `app/(public)/register/page.tsx`. Extract presentation into `components/auth/registration/AccountStep.tsx`, `AcademicStep.tsx`, `RecordModeStep.tsx`, `PastSemestersStep.tsx`, and `RegistrationProgress.tsx`. State/finalization remains in one controller so extraction does not introduce phase races.

Progress uses named phases, current phase and actual branch count. One short explanatory heading per phase; back/continue footer lives in normal form flow and can become sticky only when the keyboard remains unobstructed.

| Phase | Required content | Important states |
|---|---|---|
| Account | Google/email choice, name, matric, email, verification/password requirements as existing flow dictates | Provider in progress/cancelled; email errors; OTP sent/expired/invalid; verified |
| Academic details | University, department, programme searchable selectors; duration grid; session; current level | Loading/options/error; custom value only where supported; consecutive session validation |
| Record mode | Two clear choice panels: Start with new results / Enter academic history; explanation | Choice visible/keyboard accessible; no premature finalization |
| Past semesters, conditional | Editable session/semester preview, count, missing-result status | Bound by level/duration; inline row errors; placeholders remain incomplete |
| Completion | Confirmed account setup, next action “Add your first result” or “Open dashboard” | No surprise 3-second redirect before the user can read the outcome |

Academic selectors: same 48px trigger with selected text, icon/check, chevron; long institution names wrap within a max two-line label. Popup search/header fixed, options individually spaced. Course duration wraps into three columns on a phone; no off-screen 6/8/10-year option. Preserve manual session corrections without an effect immediately overwriting them.

Transitions show forward/back direction and focus the new phase heading. On submit error, move to the invalid phase and first invalid field. Refresh restores safe draft; passwords/OTP/tickets remain excluded. Google confirmation cannot be skipped by auth redirects.

Accept all journeys listed in `06`, including abandoning Google midway, From Scratch, 10-year duration, expired email ticket after academic entry, duplicate matric, and double-click finalization.

### `/forgot-password` — recover access

Source: `app/(public)/forgot-password/page.tsx`.

AuthShell, compact progress, email → code → new password → confirmation. One submit action per phase with correct Enter behavior. Show destination, Change email, resend cooldown, invalid/expired code inline, and recovery help. Password confirmation/reveal uses canonical fields. Return to Sign in after an explicit completion action. Preserve backend anti-abuse responses; avoid account-existence disclosures beyond the established API policy.

### `/copy-code` — secure code utility

Source: `app/(public)/copy-code/page.tsx` and layout.

Compact 440px panel with purpose, readable selectable code, Copy code button and confirmation, expiry/invalid state based on existing validation. Theme-aware surface. Do not add analytics containing the code, copy automatically, or retain secret code beyond current flow. Do not display an unconditional success state when payload is missing.

### `/share/[shareId]` — recipient transcript

Source: `app/(public)/share/[shareId]/page.tsx`, its layout; also inspect `app/share/[shareId]/layout.tsx` for duplicate ownership.

Compact public header, document title “Shared unofficial transcript,” date/expiry where provided, print/download action, and paper preview. Show no owner-edit controls. Loading, not found, revoked, expired (410), and network failure are distinct. Shared view uses snapshot data from the share endpoint, not a fetch of private live profile data.

Responsive preview supports readable summary and horizontal document/table scrolling with clear cue. Print excludes site navigation and controls. Share metadata must not unintentionally expose private result data in social previews; preserve existing privacy intent and resolve duplicate metadata ownership before changing it.

### `/app/download/ios` and `/app/download/android`

iOS source: `app/app/download/ios/page.tsx`. Android is a route handler, not a page.

iOS: brand, platform icon, honest availability, Android/web alternatives, theme and return link. Show “Coming soon” when no configured URL; never render a dead download button. Android redirect behavior remains; create an explanatory unavailable response/page only if its existing route contract calls for it. Use `lib/mobile-app-links.ts` consistently across landing, admin settings, and share/download controls.

## Student Routes

### `/dashboard` — current standing and next action

Source: `app/(student)/dashboard/page.tsx`; extract `components/dashboard/StandingSummary.tsx`, `RecentResults.tsx`, `NextActionPanel.tsx`.

Order: page context/greeting → standing summary + next action → recent results → trend and risk context → optional sponsor placement. At 1440px use the grid in `02`; at 390px preserve this decision order.

Standing summary: selected CGPA/PI control, large value, scale denominator, degree class for applicable CGPA, credits used, latest completed period, comparison with named previous period. Loading values use em dashes/skeletons, not `0.00`. No courses means “Add your first semester.” Record completeness and estimated PI are visible where relevant.

Recent results: default three most recently updated course results with known timestamps, carrying semester id and course id. If timestamps are absent, title “Latest semester results,” ordered deterministically by academic chronology then code. Do not call an unordered slice “recent updates.” See `10` for ordering. Each row: grade badge left, name/code/semester middle, total or “Grade only” right, optional chevron. Reuse the 3-column layout in `05`; no per-row oversized gradient/accent stripe.

Next action selects one grounded recommendation: finish an incomplete semester, inspect flagged courses, or open cached insights. No fabricated AI advice. At-risk counts exclude unknown scores and explain the current rule.

Trend title identifies “Cumulative CGPA and PI” or “Semester GPA and PI” accurately. Do not reuse cumulative labels for semester data. AI summary shows freshness, estimate language, and a link to the relevant tab. Sponsor content must retain a label and dismissal; prefer a quiet inline slot. If the existing modal placement remains, migrate its behavior to canonical Modal and preserve dismissal policy.

Accept: real and empty fixtures, timestamp ties/legacy records, selected metric persistence, total-only/grade-only records, risk counts, result navigation/parent Back, light/dark, 320px long titles, smooth downward seam.

### `/results` — semester library

Source: `app/(student)/results/page.tsx`; extract `components/results/SemesterList.tsx`, `SemesterDisclosure.tsx`.

Header: My results, context sentence, Add semester. Filters: session/level and status only if they aid available data; avoid a toolbar larger than an empty list. Show newest academic semester first with session label, GPA/PI/credits, and Completed/Ongoing/Awaiting results text.

Disclosure expands course preview without navigation; explicit Open/Edit semester link navigates. Keep disclosure semantics and separate Delete action. Skeleton remains within expanded row; retry stays there after course-fetch failure. Delete confirms exact semester and effects; check subcollection/analytics behavior before claiming complete deletion.

Empty CTA adds a semester. Disabled add capability shows maintenance explanation and leaves existing records usable. No duplicate ids for tour targets in the empty state.

### `/results/new` — create a semester

Source: `app/(student)/results/new/page.tsx`.

720px form with parent link, heading, level/semester selectors, session field and explanation, optional existing state controls, Create semester action. Prefill from academic timeline but allow correction. Validate session and duplicate level/semester/session combination before creating. Use whole-form validation and pending/error states.

Success navigates to the created semester id and focuses course entry. Back goes to `/results`; dirty form uses discard confirmation. The final session field and submit action remain usable with phone keyboard open.

### `/results/[semesterId]` — semester workspace

Source: `app/(student)/results/[semesterId]/page.tsx`, `components/cgpa/GradeTable.tsx`. Extract `components/results/SemesterHeader.tsx`, `CourseEditor.tsx`, `ResultImportDialog.tsx`, `CodeTransferDialog.tsx`.

Pinned context row: Results breadcrumb/parent, full semester name/session, completion badge, saved/unsaved state. Primary action Save changes. Secondary toolbar groups Add course; Import (file or code); Export/share code. Do not present four equal primary buttons.

Desktop: editable table with code/title, units, CA/exam or supported mode, total/grade and row actions; bottom summary and completion confirmation. Phone: compact read-only rows with an explicit Edit opening a keyboard-aware sheet; do not force an 800px editable grid for every phone interaction.

Course editor validates mode-specific data and preserves saved totals/letter grades. Blank numeric input is missing, not zero. Show calculated result as a labeled preview, not a second unsaved copy. Add/remove within a draft can be undone locally before Save; saved destructive changes require the defined workflow.

OCR and code dialogs follow `06`: choose/preview/review/apply/save. Add course, import/export, and share sheets all support backdrop, X, Escape, and deliberate swipe down where sheets are used. Pending request semantics and dirty-dismiss are consistent.

Accept: invalid/missing semester, permission denied, failed save with draft retained, imported total-only data, grade-only data, CA/exam update, mode switching, duplicate imports, AR, deleting the last row, keyboard visibility, and correct parent navigation.

### `/insights` — evidence and decisions

Source: `app/(student)/insights/page.tsx`; extract panels under `components/insights/`.

Pinned page heading with explanation and Refresh; then URL-backed tabs: Forecast, What-if, Risk, Written analysis. Keep 16px clear space between tab seam and quota/freshness notice. Merge duplicate warnings when they describe the same state.

| Tab | Hierarchy | User action and completion |
|---|---|---|
| Forecast | Metric choice → historical/forecast plot → projected value + uncertainty note → assumptions | Refresh obeys quotas; new estimate gets timestamp; prior usable data remains on failure |
| What-if | Target and remaining credits → editable scenario → computed requirement → feasibility explanation | Calculate/Reset explicit; impossible target is explained, not clipped to maximum GPA |
| Risk | Risk summary → ranked courses/periods → reasons and next steps | Open related semester/course; distinguish recorded risk from model estimate |
| Written | Analysis title/date → summary → structured strengths/risks/actions → provenance | Refresh available within policy; long text readable with headings, not one giant card |

The CGPA/PI toggle is visibly a control, not two tiny text labels. Use shared SegmentedControl with selected fill and explanation of PI. Persist scenario state across tabs. Loading stays in the selected panel with named activity. Do not obscure all navigation with a full-screen AI animation.

Accept: direct links and browser Back; arrow-key tabs; preserved what-if draft; stale/rate-limited/error states; no extra API call on mount from animation; reduced motion; no invented interval data.

### `/transcript` — preview, export, and share management

Source: `app/(student)/transcript/page.tsx`; extract `components/transcript/TranscriptDocument.tsx`, `TranscriptToolbar.tsx`, `ShareTranscriptDialog.tsx`, `ActiveShareList.tsx`.

App surface: page title and simple description, toolbar (Download PDF primary; Print; Share), photo choice with impact explained. Share management collapses under “Active links” after the main preview, so long URLs do not dominate.

Paper remains white/black in both app themes; this is an intentional document exception. Profile institution/department/programme, unofficial label, semesters, CA/exam/total/grade/grade point/PI correctly defined, cumulative summary. Missing values use an em dash; estimated values carry a note. Preserve content parity with `lib/pdf/transcript.ts` and shared snapshots. Use shared classification logic rather than hardcoded ESUT/five-point thresholds.

Share dialog first explains disclosure and expiry; after creation shows local QR if available, selectable link, Copy, and Done. Revoke uses canonical confirmation. Long documents print across pages with repeating table headings and no clipped horizontal columns. Test A4 and multi-page output.

### `/notifications` — actionable updates

Source: `app/(student)/notifications/page.tsx`, `components/layout/NotificationDropdown.tsx`.

Header: Notifications, unread count, Mark all read, secondary Clear notifications. Group by Today/Earlier using actual timestamps. Each item has type icon, title, body, date, unread indicator, explicit mark-read action and destination link when provided. No whole-row click-div wrapping another button.

Clear all requires confirmation if there is no supported undo. Dropdown uses the same item content in a compact list with View all; fresh pushes do not steal focus. Empty: “You're up to date.” Failed mutation retains state and offers retry. Missing action destination is displayed as information, not an empty button.

### `/settings` — account and preferences

Source: `app/(student)/settings/page.tsx`; extract sections under `components/settings/`.

Desktop left local navigation, right 720px form content. Phone local sections use a labeled selector or wrapped anchor list, then normal document scrolling. Sections: Profile, Academic setup, Appearance, Notifications, Account/security.

Profile: compact image/name, explicit Upload photo, progress/error/retry, name and academic identity fields using common selectors. Matric restriction explains how changes are supported. Academic setup: timeline summary, record mode with consequence dialog, default metric. Appearance: Light/Dark/System visual options using actual tokens, not hardcoded thumbnail colors. Notifications: browser permission status plus individually named pending-aware switches. Security: connected provider, appropriate password action, export data/transcript path, isolated Delete account.

Save buttons apply only to their section and indicate dirty/saving/saved. Do not persist every text keystroke. Provider-only password controls follow `06`. Delete retains existing reauthentication/server deletion. No new account-link endpoint is implied by a decorative provider button.

## Admin Routes

### `/admin/login`

Source: `app/(admin)/admin/login/page.tsx`.

AuthShell variant with small Administration badge and clear restricted-access copy, email/password, one reveal control, Sign in. Both themes supported. No red full-page wash. Semantic form with app validation and sanitized errors. Successful auth must still verify admin status; denied user sees an allowed return path.

### `/admin/dashboard` — overview

Source: `app/(admin)/admin/dashboard/page.tsx`; extract `components/admin/OverviewMetrics.tsx` and `OverviewCharts.tsx`.

Header: Overview, last refreshed and Refresh. Four concise metrics from real API data with basis/date. Main grid: registration trend 8 columns, degree distribution 4; department summary below with View analytics. Activity list only if it contains real events. No invented percentage-change arrows when comparison data is absent.

Remove the global onboarding-test reset from overview. Loading/error are section-local. Charts use ChartFrame and share a date range only when backend filters support it. Empty data has context. A platform total of zero is distinct from failed fetch.

### `/admin/users` — manage accounts

Source: `app/(admin)/admin/users/page.tsx`; extract `components/admin/users/UsersTable.tsx`, `UserDetailPanel.tsx`, `AccountStatusDialog.tsx`.

Header: Users, result count if complete, Export only with a defined scope. Toolbar: labeled search, status, level, department, Clear filters. Backend support required per `10`; unsupported filters must not silently act only on one page.

Table: Name/email, matric, department, level, CGPA, status, joined date, actions. Numeric cells tabular. Row details in a drawer show existing data, semester count, and account status; no unsolicited edit/delete-user feature. Enable/disable is explicit with confirmation and pending/error outcome. Filters and selected user can persist in URL without exposing private field values there.

Cursor pagination with page size 25; no fabricated exact page count. Search purpose must match supported fields and matching behavior. CSV export is permitted only if implemented securely and labeled “current filtered results” or “this page” truthfully.

### `/admin/courses` — catalogue

Source: `app/(admin)/admin/courses/page.tsx`; extract `components/admin/courses/CatalogTable.tsx`, `CatalogCourseForm.tsx`.

Header: Course catalogue and Add course. Toolbar: code/title search, department, level, semester; server support before enabling. Table: code, title, units, department, level, semester, actions. Add/edit form uses shared fields and authored selectors. Resolve existing `department` API versus `dept` type inconsistency through a boundary adapter.

Validate normalized code, title, unit limits, level/semester. Keep draft on failed save, focus the edited row on success, and handle a deleted record. Delete dialog names the catalogue entry and clarifies whether existing student copies remain unchanged based on actual data behavior. Do not delete student course records implicitly.

### `/admin/analytics` — academic reporting

Source: `app/(admin)/admin/analytics/page.tsx`.

Header: Academic analytics, scope/date context, Refresh, precisely scoped export. Summary: available sample size and completeness. Main plots: degree distribution, department comparison, registration trend if appropriate. CGPA/PI scatter requires real paired observations; absent pairs render “PI comparison unavailable” with an explanation, or omit the plot. Absolutely no `Math.random()` or approximate PI presented as measured.

Each plot includes denominator/sample label, table alternative, and a meaningful empty/error state. Rank department bars consistently; show full names on focus/touch. Do not compare departments with missing data as zero. Export column labels and chart definitions must agree.

### `/admin/api-analytics` — service monitoring

Source: `app/(admin)/admin/api-analytics/page.tsx`; extract `components/admin/monitor/MonitorToolbar.tsx`, `EndpointTable.tsx`, `ErrorEvents.tsx`.

Header: API monitor, selected time window, latest successful fetch. Toolbar: range, auto-refresh switch with label, manual Refresh. Summary metrics: requests, errors, latency, provider usage from current response. Explicit “At most 5,000 events”/truncated-window disclosure until complete aggregation exists.

Request timeline above endpoint table; error events and top-user usage below as accessible disclosures/tables. Replace the hidden 12-item truncation with a labeled “Top 12 endpoints” plus View all available endpoints, or pagination. Range changes keep old data visibly marked while fetching. No spinning icon merely because auto-refresh is enabled.

Do not add alerts, uptime guarantees, cost estimates, or spend controls unless the API supplies corresponding data. Never expose tokens or request secrets in error detail.

### `/admin/settings` — configuration workspace

Source: `app/(admin)/admin/settings/page.tsx`; extract each domain under `components/admin/settings/`.

Use local navigation and one active section at a time with `?section=` URL state. Sections:

| Section | Content | Save/impact treatment |
|---|---|---|
| Availability | Maintenance and feature flags | Explain affected workflows; confirm disruptive activation |
| Grading | Current grade scale and preview examples | Validate ranges/gaps/overlaps, show impact; never silently regrade history |
| AI configuration | Existing prompt/config controls | Large labeled editor; dirty/save status; no exposed secrets |
| Announcements | Message and preview | Preview in both themes; save/publish semantics match API |
| Mobile apps | Android/iOS URLs | Validate URL, show configured/Coming soon, test-link action |
| Adverts | Existing banners, active state, destination | File validation/progress; desktop/mobile preview; preserve unsaved state |
| About content | Existing copy/images/team fields | Structured form, reorder only if supported, preview, save |

Sticky section footer: “Unsaved changes” + Discard + Save section. Leaving a dirty section asks to discard; saving one section cannot overwrite unrelated settings. Long inputs and image previews remain bounded. Re-auth/permission expiry retains local edits while requesting sign-in. Backend field allowlists and conflict handling are dependencies listed in `10`.

## System and Missing Boundaries

`/maintenance`: current `app/maintenance/page.tsx`; brand, explanation, safe Retry, existing sign-in/support destination only. Do not promise a restoration time without data.

`/offline`: current `app/offline/page.tsx`; explain actual unavailable operations, Retry, keep any safe existing view. No claim that writes are queued if they are not.

Add `app/not-found.tsx`, `app/error.tsx`, and group-level error/loading boundaries where appropriate during implementation. Global error must include required HTML/body if using Next's global-error mechanism. Do not turn every server/API failure into a generic 404. Protected access denial should remain inside its guard and must not mount forbidden data.

All utility/system screens use theme tokens, a real heading, clear next action, and complete keyboard focus behavior.
