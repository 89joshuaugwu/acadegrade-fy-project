# Routes

## Router architecture

- Next.js 16 App Router with file-based routing under `app/`; there is no separate router configuration file to dump.
- Parenthesized route groups `(public)`, `(student)`, and `(admin)` do not appear in URLs.
- Root `app/layout.tsx` wraps every route. Student pages additionally pass through `app/(student)/layout.tsx` and StudentShell. Protected admin pages pass through `app/(admin)/layout.tsx`, `app/(admin)/admin/layout.tsx`, and AdminShell.
- Most public pages compose public navigation/footer in the page rather than using a single public route-group layout.
- Layout chains below list every existing ancestor layout file for each page; components mounted by those files are detailed in `layouts.md`.

## Page routes

| URL | Page file | Layout chain | What it renders |
|---|---|---|---|
| `/` | `app/(public)/page.tsx` | `app/layout.tsx` | Marketing home: product story, academic proof, automation, FAQ, and primary signup/calculator calls to action. |
| `/about` | `app/(public)/about/page.tsx` | `app/layout.tsx` → `app/(public)/about/layout.tsx` | Public product/company context with dynamic about content and the shared public navigation/footer. |
| `/admin/ads` | `app/(admin)/admin/ads/page.tsx` | `app/layout.tsx` → `app/(admin)/layout.tsx` → `app/(admin)/admin/layout.tsx` | Admin advertising configuration workspace. |
| `/admin/analytics` | `app/(admin)/admin/analytics/page.tsx` | `app/layout.tsx` → `app/(admin)/layout.tsx` → `app/(admin)/admin/layout.tsx` | Admin academic reporting and distributions. |
| `/admin/api-analytics` | `app/(admin)/admin/api-analytics/page.tsx` | `app/layout.tsx` → `app/(admin)/layout.tsx` → `app/(admin)/admin/layout.tsx` | Admin API/service monitoring. |
| `/admin/courses` | `app/(admin)/admin/courses/page.tsx` | `app/layout.tsx` → `app/(admin)/layout.tsx` → `app/(admin)/admin/layout.tsx` | Admin course catalogue management. |
| `/admin/dashboard` | `app/(admin)/admin/dashboard/page.tsx` | `app/layout.tsx` → `app/(admin)/layout.tsx` → `app/(admin)/admin/layout.tsx` | Admin operational overview metrics and charts. |
| `/admin/login` | `app/(admin)/admin/login/page.tsx` | `app/layout.tsx` → `app/(admin)/layout.tsx` → `app/(admin)/admin/layout.tsx` | Restricted administrator sign-in. |
| `/admin/settings` | `app/(admin)/admin/settings/page.tsx` | `app/layout.tsx` → `app/(admin)/layout.tsx` → `app/(admin)/admin/layout.tsx` | Admin platform configuration workspace. |
| `/admin/users` | `app/(admin)/admin/users/page.tsx` | `app/layout.tsx` → `app/(admin)/layout.tsx` → `app/(admin)/admin/layout.tsx` | Admin account search, filtering, detail, and status management. |
| `/app/download/ios` | `app/app/download/ios/page.tsx` | `app/layout.tsx` | iOS availability/download information page. |
| `/calculator` | `app/(public)/calculator/page.tsx` | `app/layout.tsx` → `app/(public)/calculator/layout.tsx` | Public CGPA calculator with editable academic inputs and calculated summary. |
| `/copy-code` | `app/(public)/copy-code/page.tsx` | `app/layout.tsx` → `app/(public)/copy-code/layout.tsx` | Compact secure code-copy utility. |
| `/dashboard` | `app/(student)/dashboard/page.tsx` | `app/layout.tsx` → `app/(student)/layout.tsx` → `app/(student)/dashboard/layout.tsx` | Student current standing, recent results, next action, trajectory, and insight summary. |
| `/features` | `app/(public)/features/page.tsx` | `app/layout.tsx` | Public feature index linking academic record, result-scanner, and AI-insight capabilities. |
| `/features/ai-insights` | `app/(public)/features/ai-insights/page.tsx` | `app/layout.tsx` | Editorial feature page explaining forecasts, scenarios, risk, and AI provenance. |
| `/features/result-scanner` | `app/(public)/features/result-scanner/page.tsx` | `app/layout.tsx` | Editorial feature page explaining upload, review, correction, and save flow. |
| `/forgot-password` | `app/(public)/forgot-password/page.tsx` | `app/layout.tsx` → `app/(public)/forgot-password/layout.tsx` | Password recovery and OTP/reset flow. |
| `/insights` | `app/(student)/insights/page.tsx` | `app/layout.tsx` → `app/(student)/layout.tsx` → `app/(student)/insights/layout.tsx` | Student forecast, what-if, risk, and written-analysis workspace. |
| `/login` | `app/(public)/login/page.tsx` | `app/layout.tsx` → `app/(public)/login/layout.tsx` | Student sign-in flow inside the branded AuthShell. |
| `/maintenance` | `app/maintenance/page.tsx` | `app/layout.tsx` | Maintenance boundary with retry/navigation. |
| `/notifications` | `app/(student)/notifications/page.tsx` | `app/layout.tsx` → `app/(student)/layout.tsx` → `app/(student)/notifications/layout.tsx` | Student notification inbox and mutation controls. |
| `/offline` | `app/offline/page.tsx` | `app/layout.tsx` | Offline boundary and retry. |
| `/privacy` | `app/(public)/privacy/page.tsx` | `app/layout.tsx` | Privacy policy. |
| `/register` | `app/(public)/register/page.tsx` | `app/layout.tsx` → `app/(public)/register/layout.tsx` | Multi-step account and academic-profile setup wizard with preserved draft behavior. |
| `/results` | `app/(student)/results/page.tsx` | `app/layout.tsx` → `app/(student)/layout.tsx` → `app/(student)/results/layout.tsx` | Student semester library with disclosure, status, and create/delete actions. |
| `/results/[semesterId]` | `app/(student)/results/[semesterId]/page.tsx` | `app/layout.tsx` → `app/(student)/layout.tsx` → `app/(student)/results/layout.tsx` | Student semester workspace for course entry, import, calculation, and save. |
| `/results/new` | `app/(student)/results/new/page.tsx` | `app/layout.tsx` → `app/(student)/layout.tsx` → `app/(student)/results/layout.tsx` | Student semester creation form. |
| `/settings` | `app/(student)/settings/page.tsx` | `app/layout.tsx` → `app/(student)/layout.tsx` → `app/(student)/settings/layout.tsx` | Student profile, academic, appearance, notification, and account settings. |
| `/share/[shareId]` | `app/(public)/share/[shareId]/page.tsx` | `app/layout.tsx` → `app/(public)/share/[shareId]/layout.tsx` | Public read-only unofficial transcript recipient view. |
| `/support` | `app/(public)/support/page.tsx` | `app/layout.tsx` | Public support/help page. |
| `/terms` | `app/(public)/terms/page.tsx` | `app/layout.tsx` | Terms of service. |
| `/transcript` | `app/(student)/transcript/page.tsx` | `app/layout.tsx` → `app/(student)/layout.tsx` → `app/(student)/transcript/layout.tsx` | Student transcript preview, PDF/print, photo choice, share creation, and active links. |

## Route handlers

These are API/download handlers, not visual page targets.

| URL | Handler file |
|---|---|
| `/api/about` | `app/api/about/route.ts` |
| `/api/admin/ads` | `app/api/admin/ads/route.ts` |
| `/api/admin/api-analytics` | `app/api/admin/api-analytics/route.ts` |
| `/api/admin/courses` | `app/api/admin/courses/route.ts` |
| `/api/admin/settings` | `app/api/admin/settings/route.ts` |
| `/api/admin/stats` | `app/api/admin/stats/route.ts` |
| `/api/admin/users` | `app/api/admin/users/route.ts` |
| `/api/admin/verify` | `app/api/admin/verify/route.ts` |
| `/api/ai/forecast` | `app/api/ai/forecast/route.ts` |
| `/api/ai/insights` | `app/api/ai/insights/route.ts` |
| `/api/ai/whatif` | `app/api/ai/whatif/route.ts` |
| `/api/auth/otp/send` | `app/api/auth/otp/send/route.ts` |
| `/api/auth/otp/verify` | `app/api/auth/otp/verify/route.ts` |
| `/api/auth/password/reset` | `app/api/auth/password/reset/route.ts` |
| `/api/auth/register/finalize` | `app/api/auth/register/finalize/route.ts` |
| `/api/notifications/send` | `app/api/notifications/send/route.ts` |
| `/api/results/extract` | `app/api/results/extract/route.ts` |
| `/api/transcript/generate` | `app/api/transcript/generate/route.ts` |
| `/api/transcript/share` | `app/api/transcript/share/route.ts` |
| `/api/user/delete-account` | `app/api/user/delete-account/route.ts` |
| `/app/download/android` | `app/app/download/android/route.ts` |

## Framework-special routes

- `app/opengraph-image.tsx`
- `app/robots.ts`
- `app/sitemap.ts`

## Layout-only and ownership notes

- `app/share/[shareId]/layout.tsx` is a layout-only branch for the same public share URL whose page currently lives at `app/(public)/share/[shareId]/page.tsx`; inspect both share layouts before changing metadata ownership.
- Route-specific layouts under public and student pages are primarily metadata wrappers. Their full shell behavior comes from the root, StudentShell, AdminShell, Navbar, PublicHeader/PublicFooter, or AuthShell.
- `app/app/download/android/route.ts` is a redirect/handler rather than a visual page; `/app/download/ios` is a page.
- `app/sw.ts`, `app/favicon.ico`, and manifest/static assets are application infrastructure and are not page routes.

## Ten key design targets

1. `/` — public product story and strongest expression of the Degree Meridian.
2. `/features` — public product capability index.
3. `/calculator` — public utility that demonstrates calculation value.
4. `/login` — compact authentication entry.
5. `/register` — high-risk multi-step authentication/setup flow.
6. `/dashboard` — student standing and next-action hub.
7. `/results` — semester library.
8. `/insights` — analytical forecast/what-if/risk workspace.
9. `/transcript` — document preview/export/share workflow.
10. `/admin/dashboard` — operational admin overview.

Their recursively traced local dependency trees are in `pages.md`.
