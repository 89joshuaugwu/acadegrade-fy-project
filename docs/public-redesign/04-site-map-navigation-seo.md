# 04 · Site map, navigation, shells and SEO

## 1. Pages and modes

Mode decides how much the page performs. **Persuade:** the visitor decides and acts. **Operate:** the visitor completes a task. **Read:** the visitor understands something. **System:** a state the visitor lands in.

| Route | Page plan | Mode | Shell | Status |
|---|---|---|---|---|
| `/` | `pages/home.md` | Persuade | Public | Redesign |
| `/features` | `pages/features.md` | Persuade | Public | Redesign |
| `/features/result-scanner` | `pages/features-result-scanner.md` | Persuade | Public | Redesign |
| `/features/ai-insights` | `pages/features-academind.md` | Persuade | Public | Redesign (stays at this URL; the page is titled AcadeMind) |
| `/features/timetable` | `pages/features-timetable.md` | Persuade | Public | **New** |
| `/app` | `pages/android-app.md` | Persuade | Public | **New** (the download and install page) |
| `/calculator` | `pages/calculator.md` | Operate | Public | Redesign |
| `/tools` | `pages/tools-hub.md` | Operate | Public | **New** (hub for the free tools) |
| `/tools/degree-class-checker` | `pages/tool-degree-class-checker.md` | Operate | Public | Redesign |
| `/tools/required-gpa` | `pages/tool-required-gpa.md` | Operate | Public | Redesign |
| `/tools/carry-over-impact` | `pages/tool-carry-over-impact.md` | Operate | Public | Redesign |
| `/tools/weighted-average` | `pages/tool-weighted-average.md` | Operate | Public | Redesign |
| `/about` | `pages/about.md` | Read/Persuade | Public | Redesign |
| `/support` | `pages/support.md` | Read | Public | Redesign |
| `/privacy` | `pages/legal-privacy.md` | Read | Public | Restyle (content from admin) |
| `/terms` | `pages/legal-terms.md` | Read | Public | Restyle (content from admin) |
| `/account-deletion` | `pages/account-deletion.md` | Read | Public | Restyle |
| `/login` | `pages/login.md` | Operate | Auth | Restyle |
| `/register` | `pages/register.md` | Operate | Auth | Restyle (flow unchanged) |
| `/forgot-password` | `pages/forgot-password.md` | Operate | Auth | Restyle |
| `/share/[shareId]` | `pages/share-transcript.md` | System/Read | Minimal | Restyle |
| `/c/[code]` | `pages/share-course-code.md` | System/Operate | Minimal | Restyle |
| `/app/download/android` | `pages/android-app.md` §redirects | n/a | n/a | Keep as a redirect to the APK (old links keep working) |
| `/app/download/ios` | `pages/download-ios.md` | System | Minimal | Restyle; no "coming soon" |
| `/maintenance` | `pages/maintenance.md` | System | Minimal | Restyle |
| `/offline` | `pages/offline.md` | System | Minimal | Restyle; remove the false claim |
| 404 | `pages/not-found.md` | System | Minimal | Restyle |
| `/grading-scales/[scale]` | none yet | Read | Public | **Reserved** for when a second grading scale goes live; not built now |

## 2. Shells

- **Public shell** (`app/(public)/layout.tsx`): skip link, `PublicHeader`, `<main id="content">`, `PublicFooter`, `CookieStub`. Used by every Persuade, Operate and Read page above.
- **Auth shell:** a split layout. On desktop, a paper slip with the form takes columns 1–6, and on the right sits the hero photograph with one line of reassurance. On phones, a compact header (mark, wordmark, "Back to site") over the form slip.
  - It has no full navigation, so attention stays on the form, but it always offers a way back to the site, a link to support, and the appearance control in its footer line.
- **Minimal shell:** mark, wordmark and one link home at the top; one small imprint line at the bottom. Used by share pages, maintenance, offline, iOS and 404.
  - These pages must not depend on Firestore for their shell, so they still render when services are down.

## 3. Navigation

**Header (desktop):** mark and wordmark · **Features** · **Free tools** · **Android app** · **About** · *Sign in* · **[Get started]**.
- Four links plus one action keeps to the house limit.
- "How it works" moves out of the nav, because the home page covers it.
- "Calculator" becomes part of Free tools: the `/tools` hub leads with the calculator.

**Signed in:** **[Open dashboard]** replaces Sign in and Get started (from `useAuth`, client island; the server renders the signed-out version to avoid layout shift, and the swap keeps the same width).

**Phone:** mark, wordmark and **Menu**, which opens the menu sheet: Features, Free tools, Android app, About, then Calculator, Support, Sign in and **[Get started]**.

**Footer:** the full link set (see `02` §4.3), so every public page is reachable within two clicks.
- This fixes the orphaned tools, the unlinked app pages and the missing support link.

**Feature pages:** a plain text trail at the top ("Features / Result scanner"), a "Next feature" link at the foot, and a shared "Other features" line.

**Tools:** every tool links to the hub, the calculator and the other tools. The calculator links to all four tools beside its result.

## 4. Calls to action across the site

| Situation | Primary action | Destination |
|---|---|---|
| Signed out, Persuade pages | **Get started** / **Create your free record** | `/register` |
| Hero live slip | **Save this semester** | `/register` with the calculator handoff (existing session storage, kept 24 hours) |
| Android-specific | **Download for Android** | `/app/download/android` (redirect to the admin-set APK URL); the label states the file size from `config/settings` when set |
| Tools and calculator | **Save to your record** | handoff then `/register`, or `/results` if signed in |
| Signed in | **Open dashboard** | `/dashboard` |

## 5. Redirects and URL care

- **All current URLs keep working.** New pages are additions.
- **Header link change:** "How it works" (`/#how-it-works`) is kept as an anchor on the new home page for old links.
- `/app/download/ios` keeps redirecting when `iosUrl` is set; otherwise it shows the restyled iPhone page.
- **Unknown routes:** the 404 page.
- **Moved content:** if any is moved later, add a 308 in `next.config.ts`.

## 6. SEO plan

- **Metadata per page:**
  - Title pattern: `<Page> | AcadeGrade`. The home title is "AcadeGrade: CGPA, GPA and degree class for Nigerian universities".
  - Description: 140–160 characters, written per page in each plan.
  - Canonical: absolute, on the custom domain once bought; `metadataBase` already uses `resolveSiteUrl()`.
- **Open Graph images:** generated per page with `next/og` in the new style (a paper slip on the ground with the page's headline and the stripe), 1200×630. This fixes the share page's wrong-size logo image.
- **JSON-LD:**
  - Home: `Organization` + `SoftwareApplication` (operatingSystem "Android, Web", `isAccessibleForFree`, `applicationCategory: EducationalApplication`) + `FAQPage` (from the visible FAQ).
  - Tools and calculator: `WebApplication` + `FAQPage`.
  - Feature pages: `BreadcrumbList`.
  - `aggregateRating` is used only once there are real ratings.
- **Robots and sitemap:**
  - noindex: login, register, forgot password, share pages, `/c/*`, maintenance, offline and the 404 page.
  - Sitemap: home, features (four), `/app`, `/calculator`, `/tools` and four tools, about, support, privacy, terms, account deletion. Add `/tools`, `/app` and `/features/timetable` to `PUBLIC_SITEMAP_ROUTES`.
- **Content SEO:**
  - Every tool page carries a real explanation of the rule it uses (the 5-point bands, the class boundaries, the carry-over rules) and 4–6 FAQs written for search ("What CGPA is a First Class in Nigeria?").
  - Internal links between tools and features.
- **Performance is SEO:** the budget in `02` §7.

## 7. Analytics and consent

Page-view and conversion events (`get_started_click`, `save_semester_click`, `android_download_click`, `tool_used`) fire only after consent for analytics, through the existing consent state. Necessary-only visitors get no analytics. Ads (AdSense) stay off public marketing pages: they cheapen the first impression and slow LCP. Ads remain where the admin places them inside the product.
