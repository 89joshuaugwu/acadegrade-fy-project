# Source Inventory and Preservation Map

Snapshot: 197 tracked files in the web repository at the planning audit. The full path inventory below was generated from `git ls-files`; it excludes dependencies, build output, local environment secrets, and the new untracked upgrade folder. `DESIGN.md` was also read as available local design context but is not in this tracked-file snapshot.

## Coverage and Confidence

- All current page routes and route shells were inventoried and their main render/interaction paths inspected.
- Shared primitives, charts, grade presentation, public/auth/student/admin route composition, and direct data dependencies were reviewed at source level.
- API implementation was inspected where it affects these UI contracts. This was not an exhaustive penetration test, email-client rendering audit, or review of every AI provider implementation.
- Brand asset paths and manifests were inventoried; this pass did not visually inspect every raster asset.
- Existing handover documents were cross-checked where they describe features to preserve. They contain older API/rate-limit statements, so source is authoritative.
- No authenticated production mutation, screenshot automation run, complete build, or mobile code change occurred during this planning task.

## Directory Responsibilities and Upgrade Treatment

| Area | Treatment | Implementation owner |
|---|---|---|
| Public routes and metadata | Recompose story/forms/utilities; preserve destinations and account behavior | Wave 2 |
| Student routes | Shared domain presentation, correct result modes, predictable navigation | Wave 3 |
| Admin routes | Neutral dense console, real tables/data, permission and mutation states | Wave 4 |
| Root/layout/theme | Canonical tokens, titles, shell boundaries and error states | Wave 1 / Wave 5 |
| UI primitives | Improve existing components, retire clones only after migration | Wave 1 |
| Charts/CGPA/AI presentation | Shared chart frame and truthful data; readable written analysis | Waves 1 and 3 |
| Auth/profile/timeline/domain math | Preserve guards and rules; fix documented boundary defects with regression fixtures | Waves 2 and 3 |
| Admin APIs | Required list/query/settings contracts; maintain server authorization | Wave 4 |
| AI/OTP/email/API abuse prevention | Preserve existing service behavior; do not rewrite as visual work | All consumers |
| Firestore/RTDB rules | Inspect when new queries/mutations need support; no automatic production deployment | Respective backend task |
| PDF and transcript endpoints | Semantic parity with previews and shared snapshots | Wave 3 |
| FCM/notification hooks | Explicit permission, pending/error states, token cleanup preserved | Wave 3 |
| Brand assets | Reuse logos and icons; remove duplicates only after import/path verification | Wave 5 |
| Package/build configuration | Add compatible verification scripts; avoid unrelated upgrades | Wave 1 |
| Existing docs | Preserve historical context; mark old UI directions superseded during implementation | Wave 5 |

## Easily Missed Features to Preserve

| Feature | Source evidence | Upgrade rule |
|---|---|---|
| Share calculator scenario | `app/(public)/calculator/page.tsx` reads `c`/`m` query parameters and uses base64 | Preserve incoming share links and a clear share action. Validate decoded data; sharing intentionally exposes that scenario |
| Course structure sharing | Semester page writes `shareCodes`, requires at least 3 courses, increments useCount on import | Share code/title/units only; never add scores or private grades to that payload |
| Feature kill switches | `hooks/usePlatformSettings.ts`, `disabledFeatures` | Preserve `add_semester`, `share_code`, `extract_slip`, `ai_insights`, `edit_profile` behavior and explain disabled state |
| Degree-class notification | `app/(student)/insights/page.tsx` sends on class change | Visual remount/tab/theme change must not duplicate push/email side effects |
| Legacy profile aliases | Settings writes `name`, `dept`, `level` alongside current keys | Do not remove compatibility writes/reads without a deliberate shared-data migration |
| Unread-count RTDB | `hooks/useNotifications.ts` uses `notif_counts/{uid}` | Preserve real path and account scoping; do not follow older handover paths blindly |
| Per-device notification cleanup | `lib/firebase/fcm.ts`, both shells | Preserve token removal behavior at sign-out; do not invent a missing API from old docs |
| Transcript snapshot and photo | Transcript share route saves photo choice and 30-day expiry | Shared recipient view remains a snapshot and honors disclosure/expiry/photo choice |
| Reauthenticated deletion | Settings and `/api/user/delete-account` | Preserve password/Google confirmation and server deletion coverage |
| Adverts and announcements | Dashboard/shell/settings config | Preserve content and dismissal semantics or deliberately move sponsor display inline; do not silently remove admin functionality |
| Tour replay and anchors | `StudentTour.tsx`, `ResultsTour.tsx` | Retarget anchors and preserve skip/replay across new layouts |
| Install banner | `PWABanner.tsx` | Resolve undefined color variables and overlap with bottom tabs; show only when install can actually be prompted |
| Static brand marks | `public/logo.png`, `public/acadegradeailogo.png`, icons | Keep AcadeGrade and AcadeMind identities distinct and recognizable |

## Handover Conflicts to Resolve from Code

The older documents describe some rate limits and provider names differently from the current implementation. They also mention an FCM token API path absent from this route inventory. Do not copy those claims into product text or generate new endpoints to make old documentation appear true. Check actual endpoint behavior, hooks, and `RATE_LIMITING.md` before wiring refreshed copy.

The code calls CGPA “official” in some descriptions. In the upgraded product, explain that calculations use the applicable grade scale; the records/transcript remain user-managed and unofficial unless an institution actually verifies them.

## Full Tracked-File Inventory

Each path below is an existing file, not a proposed creation. Proposed component/test paths are defined in the implementation plans.

### Root configuration and documents (15)

```text
.cursorrules
.env.local.example
.gitignore
PUBLIC_UI_UX_UPGRADE.md
RATE_LIMITING.md
README.md
STUDENT_UI_UX_UPGRADE.md
database.rules.json
firestore.rules
next.config.ts
package-lock.json
package.json
postcss.config.mjs
skills-lock.json
tsconfig.json
```

### Routes, layouts, and app metadata (40)

```text
app/(admin)/admin/analytics/page.tsx
app/(admin)/admin/api-analytics/page.tsx
app/(admin)/admin/courses/page.tsx
app/(admin)/admin/dashboard/page.tsx
app/(admin)/admin/login/page.tsx
app/(admin)/admin/settings/page.tsx
app/(admin)/admin/users/page.tsx
app/(admin)/layout.tsx
app/(public)/about/layout.tsx
app/(public)/about/page.tsx
app/(public)/calculator/layout.tsx
app/(public)/calculator/page.tsx
app/(public)/copy-code/layout.tsx
app/(public)/copy-code/page.tsx
app/(public)/forgot-password/page.tsx
app/(public)/login/page.tsx
app/(public)/page.tsx
app/(public)/register/page.tsx
app/(public)/share/[shareId]/layout.tsx
app/(public)/share/[shareId]/page.tsx
app/(student)/dashboard/page.tsx
app/(student)/insights/page.tsx
app/(student)/layout.tsx
app/(student)/notifications/page.tsx
app/(student)/results/[semesterId]/page.tsx
app/(student)/results/new/page.tsx
app/(student)/results/page.tsx
app/(student)/settings/page.tsx
app/(student)/transcript/page.tsx
app/app/download/android/route.ts
app/app/download/ios/page.tsx
app/favicon.ico
app/globals.css
app/layout.tsx
app/maintenance/page.tsx
app/offline/page.tsx
app/robots.ts
app/share/[shareId]/layout.tsx
app/sitemap.ts
app/sw.ts
```

### API endpoints (19)

```text
app/api/about/route.ts
app/api/admin/api-analytics/route.ts
app/api/admin/courses/route.ts
app/api/admin/settings/route.ts
app/api/admin/stats/route.ts
app/api/admin/users/route.ts
app/api/admin/verify/route.ts
app/api/ai/forecast/route.ts
app/api/ai/insights/route.ts
app/api/ai/whatif/route.ts
app/api/auth/otp/send/route.ts
app/api/auth/otp/verify/route.ts
app/api/auth/password/reset/route.ts
app/api/auth/register/finalize/route.ts
app/api/notifications/send/route.ts
app/api/results/extract/route.ts
app/api/transcript/generate/route.ts
app/api/transcript/share/route.ts
app/api/user/delete-account/route.ts
```

### Components (47)

```text
components/ai/InsightCard.tsx
components/ai/WhatIfCalculator.tsx
components/ai/index.ts
components/cgpa/CGPAArc.tsx
components/cgpa/DegreeClassBadge.tsx
components/cgpa/GradeTable.tsx
components/cgpa/index.ts
components/charts/ForecastChart.tsx
components/charts/TrendChart.tsx
components/charts/index.ts
components/forms/index.ts
components/layout/AdminShell.tsx
components/layout/AuthProvider.tsx
components/layout/BottomTabBar.tsx
components/layout/MobileDrawer.tsx
components/layout/Navbar.tsx
components/layout/NotificationDropdown.tsx
components/layout/PublicShell.tsx
components/layout/StudentShell.tsx
components/layout/index.ts
components/onboarding/ResultsTour.tsx
components/onboarding/StudentTour.tsx
components/shared/EmptyState.tsx
components/shared/PageTransition.tsx
components/shared/ServiceWorkerKill.tsx
components/shared/SkeletonCard.tsx
components/shared/index.ts
components/ui/AcademicGraphHero.tsx
components/ui/Badge.tsx
components/ui/Button.tsx
components/ui/Card.tsx
components/ui/HolographicCard.tsx
components/ui/HolographicIDCard.tsx
components/ui/Input.tsx
components/ui/KnowledgeCoreBackground.tsx
components/ui/LiveAcademicGraph.tsx
components/ui/Logo.tsx
components/ui/MobileAppDownload.tsx
components/ui/Modal.tsx
components/ui/OrbitingTechStack.tsx
components/ui/PWABanner.tsx
components/ui/ReactiveAuthBackground.tsx
components/ui/Select.tsx
components/ui/Skeleton.tsx
components/ui/Switch.tsx
components/ui/Toggle.tsx
components/ui/index.ts
```

### Existing handover documentation (13)

```text
docs/project_handover/10_rate_limiting_and_abuse_prevention.md
docs/project_handover/11_ai_provider_strategy_actual.md
docs/project_handover/12_undocumented_features_and_fixes.md
docs/project_handover/1_public_features.md
docs/project_handover/2_student_features.md
docs/project_handover/3_admin_features.md
docs/project_handover/4_design_and_animations.md
docs/project_handover/5_data_architecture.md
docs/project_handover/6_tech_stack_and_env.md
docs/project_handover/7_packages.md
docs/project_handover/8_deployment_and_maintenance.md
docs/project_handover/9_recent_updates_and_monetization.md
docs/project_handover/project-complete.md
```

### Brand assets and manifests (22)

```text
favicon_io/android-chrome-192x192.png
favicon_io/android-chrome-512x512.png
favicon_io/apple-touch-icon.png
favicon_io/favicon-16x16.png
favicon_io/favicon-32x32.png
favicon_io/favicon.ico
favicon_io/site.webmanifest
logo.png
public/acadegradeailogo.png
public/android-chrome-192x192.png
public/android-chrome-512x512.png
public/apple-touch-icon.png
public/favicon-16x16.png
public/favicon-32x32.png
public/favicon.ico
public/icons/gemini.svg
public/icons/icon-192.png
public/icons/icon-512.png
public/icons/icon-maskable.png
public/logo.png
public/manifest.json
public/site.webmanifest
```

### Hooks (9)

```text
hooks/useAnalytics.ts
hooks/useAuth.ts
hooks/useCGPA.ts
hooks/useInsights.ts
hooks/useNotifications.ts
hooks/usePlatformSettings.ts
hooks/useProfile.ts
hooks/useReducedMotion.ts
hooks/useSemesters.ts
```

### Domain and integration libraries (27)

```text
lib/academic/timeline.ts
lib/ai/forecast.ts
lib/ai/gemini.ts
lib/ai/insights.ts
lib/ai/manager.ts
lib/api/auth.ts
lib/api/logger.ts
lib/api/rate-limit.ts
lib/auth/profile.ts
lib/auth/registration-ticket.ts
lib/cgpa/calculator.ts
lib/cgpa/degreeClass.ts
lib/cgpa/gradeScale.ts
lib/email/mailer.ts
lib/firebase/admin.ts
lib/firebase/auth.ts
lib/firebase/client.ts
lib/firebase/fcm.ts
lib/firebase/firestore.ts
lib/firebase/rtdb.ts
lib/mobile-app-links.ts
lib/pdf/transcript.ts
lib/utils/academic-data.ts
lib/utils/cn.ts
lib/utils/constants.ts
lib/utils/format.ts
lib/utils/safeParseJSON.ts
```

### Types (5)

```text
types/ai.ts
types/analytics.ts
types/course.ts
types/semester.ts
types/user.ts
```


