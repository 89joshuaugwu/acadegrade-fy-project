# 00 · Current public site: audit and inventory

Recorded 17 November 2026 from the code and from the live site (`acadegrade.vercel.app`). This is the "before". Everything listed here must either be carried into the redesign, deliberately replaced, or deliberately removed. Nothing is dropped by accident.

## 1. Measured problems (tasteskill inspector, live home page)

Screenshots are in `acadegrade-web/.taste-skill/before/` (desktop 1440, tablet 768, mobile 390).

| Check | Result | What it means |
|---|---|---|
| Monospace outside code | FAIL | Geist Mono on "3.71", "+0.08", "CSC 415", scores. Numbers should use the text face with tabular figures. |
| Gradients | FAIL ×4 | Nav shell fade, nav capsule animated gradient border, ledger-line background, gradient text in the logo wordmark. |
| Shadows at rest | FAIL | Cards and buttons carry shadows while not floating. |
| Covered text | FAIL | Stacked cards cover "3.71 +0.08", "3.71", "Turn a result slip into fields you can review." (25% hidden) and "Grade" (50% hidden) while scrolling. |
| Glass | WARN ×7 | Seven backdrop-blur surfaces. |
| Font sizes | WARN | 16 sizes in use (13–204px). A page needs about five. |
| Typefaces | WARN | Three families (DM Sans, Bricolage Grotesque, Geist Mono). |
| Frame | WARN | Margins differ (134px left, 152px right at 1440px). |
| Outlined boxes / dashed border | WARN | 1px outlined boxes and a dashed "iOS coming soon" pill. |
| Video | WARN | None (acceptable; see imagery plan). |

What a person sees (screenshots): a dark navy page with violet glows and decorative curves, a glass "capsule" nav with an animated border, a stock/composite photo of a smiling student holding a phone, a sticky deck of overlapping cards, and on a phone the cookie panel covering most of the first screen including the main button. The headline "See the path behind every result." does not say what AcadeGrade is or who it is for. It reads as a generic AI-product template, not as a tool for Nigerian university students.

## 2. Shells in use today (three different ones)

- **Marketing shell:** `Navbar` + `LandingMotion` + `PublicFooter` (via `components/marketing/PublicPage.tsx` or hand-built). Home, features pages, about, calculator, support, legal, account deletion, share page.
- **Thin shell:** `PublicHeader` + `PublicFooter` (`components/layout/PublicShell.tsx`). Tools and `/c/[code]`. Different header: no Features link, no mobile menu, Sign in hidden below `sm`.
- **Auth shell:** `components/auth/AuthShell.tsx`. Login, register, forgot password. No marketing nav or footer.
- **No shell:** maintenance, offline, 404, iOS download page.

The redesign replaces these with one public shell (header + footer) plus a focused auth shell and a minimal system shell (see `04-site-map-navigation-seo.md`).

## 3. Route inventory

| Route | Purpose today | Key content to carry | Problems |
|---|---|---|---|
| `/` | Sign up (`/register`); secondary calculator | Hero claim, live GPA/PI demo (real engine), scanner story, AcadeMind story, Record/Understand/Plan, Android download, FAQ (4) | Vague headline, typewriter loop, three 2 MB hero photos load at once, phone shows "Hello, John!" held by a woman, unlabelled sample 3.71, repeated numbers, developer's real profile in showcase art, no page metadata, no FAQ JSON-LD |
| `/about` | Credibility then `/register` | Mission, commitment, three principles, contact | Client-fetched headline flashes, pill badge, icon cards, no imagery, nav starts in scrolled state |
| `/features` | Overview then `/register` | Five capabilities (record, CGPA+PI, scanning, AcadeMind, transcripts), privacy statement | Zig-zag template, pill chips, cards inside cards, reused hero photo |
| `/features/ai-insights` | AcadeMind explainer | Trend, forward view, what-if, "guidance not a verdict" checklist | Sparkles cliché, no real screenshot, duplicated quote |
| `/features/result-scanner` | Scanner explainer | Four steps with a human check, "faster entry without blind trust" | No before/after proof of slip → rows (the core claim), 1.9 MB photo |
| `/calculator` | Free calculator then save to profile | Letter grades / scores modes, add/remove courses, live GPA & PI, share link (`?m=&c=`), save handoff (24 h) | Share needlessly login-gated, no link to the four tools, mono, icon tile, shadowed cards |
| `/tools/degree-class-checker` | SEO tool | CGPA → class and gap to next | Orphaned (not linked from nav/footer/home/calculator), thin header, raw controls |
| `/tools/required-gpa` | SEO tool | Current, target, units done/left → needed GPA | same |
| `/tools/carry-over-impact` | SEO tool | Two rule outcomes for a retake | same |
| `/tools/weighted-average` | SEO tool | Up to 20 score/unit rows | same |
| `/support` | Self-help then email | Routing categories, recovery checks, contact | Developer jargon ("Firebase token"), unfinished-state copy exposed, "Explore product guides" goes to `/features` |
| `/privacy`, `/terms` | Legal | Admin-editable versions (`config/legal`, `legal_documents`), TOC, built-in fallback | Pill version badge; cookie banner calls it "Privacy Policy" |
| `/account-deletion` | Play data-deletion page | Steps (Android, web), what is deleted, what is kept and why, can't sign in | Red trash icon list; otherwise sound |
| `/login` | Sign in | Google + email, forgot password, calculator handoff notice, maintenance redirect | Typewriter on h1, proof aside hidden below lg, no way back to the site except the logo |
| `/register` | Create account (4 steps + OTP) | Account, academic details (catalogue), record setup, consents (age, AI, terms), past semesters, success | 1,274 lines, Title Case, glow shadows, developer handle as placeholder, long wizard |
| `/forgot-password` | Reset with OTP | Email, verify, new password, done | Icon tiles, inconsistent motion |
| `/share/[shareId]` | Shared transcript view | PIN prompt, expired/not found, A4 paper record, cumulative summary, print, PDF | Hard-coded palette and serif, blur, Title Case, no visitor next step |
| `/c/[code]` | Shared course list | Table, open in app / import on web / create account, paused/unavailable states | Deep-link button dead on desktop and iPhone, mono h1 |
| `/app/download/android` | 307 redirect to APK (`config/settings.mobileAppLinks.androidUrl`) | Keep as a redirect for old links | No landing page explaining install |
| `/app/download/ios` | "iOS is coming soon" card | Redirect when an iOS URL exists | "Coming soon" wording, eyebrow, shadow, no nav/footer, no metadata |
| `/maintenance` | Shown during maintenance | Message | Red alert icon, no logo, no contact, no auto re-check, indexable |
| `/offline` | Offline fallback | Message | Claims saved data is available, which is false (service workers are removed) |
| 404 (`app/not-found.tsx`) | Unknown URLs | Home, calculator, dashboard | Built 17 Nov in the old style; will be restyled |

## 4. Global pieces

- **Header:** sticky glass capsule with an animated gradient border; links Features, How it works (`/#how-it-works`), About, Calculator; theme switch in the bar; Sign in + Get started; mobile opens a modal. No Tools, Support or app links.
- **Footer:** brand column + Product / AcadeGrade / Your account groups + giant gradient wordmark. No tools, no app, no social links.
- **Cookie banner:** bottom-right panel (full-width bottom on mobile), covers the hero action on phones; calls the notice "Privacy Policy".
- **PWA banner:** logged-in only; promises offline support that does not exist.
- **Buttons:** five variants, two radii, `sm` and `md` both 48px; many ad hoc anchors and pill buttons; several CSS hook classes with no CSS.
- **Tokens:** indigo/violet primary (`#5148DD` light, `#7C74FF` dark), gold, grade colours, 10-step type scale that marketing ignores (six ad hoc hero sizes), radii 12/16/24, card and popover shadows.
- **Fonts:** Bricolage Grotesque (display), DM Sans (body), Geist Mono (numbers).
- **Motion:** `LandingMotion` reveals, typewriters (hero, about, auth), per-word clip reveals, sticky card deck, animated nav border, hero image crossfade. `motion` v12 installed; `three` installed but only used by dead components.
- **Images:** `light-background.png` (1.33 MB) and `dark-background.png` (1.62 MB) loaded as fixed CSS backgrounds on every public page, never optimised, never cached (`next.config.ts` sends `no-cache, no-store` for every path). Hero photos 1.9–2.3 MB each. `acadegradeailogo.png` (562 KB) rendered at 28px. Unused images in `mobile-app-images/`.
- **SEO:** root metadata only on home; good per-page metadata on features, tools, legal; tools have FAQPage JSON-LD; home has none.

## 5. Every public claim today

- **Social proof:** none (no testimonials, counts, ratings or logos).
- **Sample numbers:** 3.71 CGPA, +0.08, 117 credits (unlabelled on the home hero); CSC 415/463, MTH 321 table; GST 111/MAT 111/GST 113/ICH 111 table; "about 4.63 in each of the next three"; invented signal labels ("Improving", "Trend Rising", "Plan Ready").
- **Capability claims:** 100L–500L, 2025/2026 sessions, private by default, calculation basis included, default Nigerian 5-point scale, no account required (calculator), handoff kept 24 hours, six-digit OTP that expires in five minutes, tools save nothing, Android download, iOS "coming soon", free (JSON-LD).
- **Policy numbers:** backups 30 days, AI provider logs up to 55 days, photo removal up to 30 days, deletion within 21 days, rights response within 21 days, breach notice within 72 hours.
- **False or unsupported today:** offline support (PWA banner, offline page); a "Verified" chip in showcase art; composite photos presented like real users.
- **Personal data exposed:** the owner's real profile and transcript rows in the home showcase images. Remove.

## 6. Must survive the redesign (function)

Calculator engine and URL sharing; calculator → register handoff; tool maths and FAQ JSON-LD; legal versions from Firestore with built-in fallback; account-deletion content (Play requirement); auth flows (Google, email/password, OTP, maintenance redirect, signups paused, consents, catalogue suggestions, drafts); share page PIN, expiry and PDF/print; `/c/[code]` states and kill switch; Android download redirect and admin-managed URLs; contact email from `config/about`; cookie consent choices and the footer "Cookie choices" reopen; theme preference (system/light/dark); all existing URLs (no broken links).
