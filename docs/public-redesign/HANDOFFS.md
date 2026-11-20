# Handoffs between build lanes (read with BUILD_BRIEF.md)

## OWNER DECISION 3, 20 Nov: the owner's generated colour images are approved (overrides decision 2 for these slots)

12 full-colour images are in `design-input/images/<slot>.png`, about 2 MB each, untreated colour. They show no school names or signs. The people in them are illustrations, never captioned as users.

| File | Slot(s) |
|---|---|
| `home-showcase.png` | `home.showcase` |
| `home-faq-tall.png` | `home.faq-tall` |
| `home-faq-square.png` | `home.faq-square` |
| `scanner.png` | `scanner.hero` |
| `academind.png` | `academind.close` (and `academind.free` if it fits) |
| `timetable.png` | `timetable.reminders` |
| `about.png` | `about.intro` |
| `support.png` | `support.fixes` |
| `auth-login.png` | `auth.login` |
| `auth-register.png` | `auth.register` |
| `auth-forgot.png` | `auth.forgot` |
| `notfound.png` | `notfound` |

- **Unlisted slots:** every other slot stays `null`, so its drawn or UiFrame fallback stays.
- **Home hero:** it stays the app beside the slip. No photograph.
- **Credits:** none print (the images are the owner's own). `creditId: null`.

## OWNER DECISION 2, 20 Nov: NO PHOTOGRAPHS AT ALL (overrides everything below)

- **No photographs:** the owner rejects the greyscale/tinted photographs ("poor and old"), so the public site ships with **no photographs**.
- **`photoFor()` returns `null` for every slot.** Every section uses its fallback as the real design: full-colour `UiFrame` fragments of the real app, the live slip, drawn stationery (slips, arc meter, stripe, grade keys) and fields of colour. Build those fallbacks as finished designs, not as stand-ins.
- **Later images:** the owner may generate full-colour images later from `docs/public-redesign/image-prompts.md`. Slots will then turn on through `page-photos.ts` with no page changes.
- **Taste rule:** the tasteskill "≥4 real pictures" floor is met by `data-ui` fragments. The inspector's `few-pictures` WARN, if it appears, is defended by this owner decision.

## OWNER DECISION, 20 Nov: no identifiable universities in any image (overrides every plan)

- **The rule:** AcadeGrade is for every Nigerian university, so no photograph may show a recognisable university: no gates, signs, named buildings or landmark campuses. That rules out UNN, ESUT, FUT Minna, IBBU, UI, UniAbuja, FUTO and Mountain Top. Every `CAMPUS_PHOTOS` entry of that kind is withdrawn from page use.
- **Home hero:** the live slip sits beside **the app**, not a campus. The right half shows a large `UiFrame` of the Android dashboard (phone-shaped, flat, built from the example student's data, no glossy mockup), with a slow crossfade between three app screens (dashboard, semester, timetable) instead of photographs. The first-screen picture is the product.
- **Other photo slots:** use the new neutral set (close-ups of a student's world that every Nigerian student recognises, with nothing naming a school). Pages refer to images by **slot name** through `lib/public/page-photos.ts` (owned by the imagery lane): `photoFor('home.showcase')` returns `{src variants, alt, creditId}` or `null`. When it returns `null`, the section falls back to a `UiFrame` or a drawn stationery picture. Never hard-code a slug.
- **Footer stamp:** a drawn AcadeGrade stamp (the mark in a perforated square) instead of a photograph. This is a Foundation-owned file; the lead edits it.
- **Picture floor:** the tasteskill floor of at least 4 real pictures is met by `UiFrame` fragments (≥300×200 with `data-ui`) plus the neutral photos.

## Lead's Wave 3 list (collected from lane reports)

- **Foundation files to change (owner image decision):** replace the footer stamp with a drawn stamp; switch AuthShell's photo prop to `photoFor('auth.*')` or a UiFrame.
- **Student Settings page:** add `id="help"` on the `SupportRequestsCard` section and `id="delete-account"` on the Danger Zone block.
- **Saving About in admin:** `app/api/admin/settings/route.ts` must call `revalidateTag('site-about')`, `revalidateTag(CONTACT_EMAIL_CACHE_TAG)` and `revalidatePath('/about')`. `PublicSiteSettings.tsx` lines 37/39 still hold the old About defaults.
- **Wording:** change "Privacy Policy"/"Terms of Service" to "Privacy notice"/"Terms of use" in `CookieConsentBanner.tsx:91`, `PrivacyChoices.tsx:269`, `RequirementsGate.tsx:258`, `lib/user/requirements.ts:124-125,195`, `LegalVersions.tsx:18-19`, and their tests. Android strings need a later app build.
- **Student layout:** its maintenance redirect should use `buildMaintenanceRedirect`.
- **Login:** honours `?next=` (check the auth lane did it).
- **Foundation absorbs:** `PhotoSlot`, `JsonLd` and `AuthAwareAction` from `components/public/company/`.
- **Register finalize:** `app/api/auth/register/finalize/route.ts` (~L386) stores `graduationSession(entrySession, courseDuration)`, ignoring direct entry; it must use the programme's years (`courseDuration - (entryLevel/100 - 1)`).
- **No-photo follow-up:**
  - Fix 2 Foundation tests (`scales-credits` "looks credits up by id", `stationery` "prints the credit line") to use a fixture `PhotoCredit`.
  - Make the footer stamp drawn.
  - Make `AuthShell` take no photograph (use a UiFrame or a colour field).
  - Then delete `public/images/campus/**` (10.5 MB) and update the `chrome` and `cookie-proof-apps` tests.
  - Point the lane adapters (`home/photo.tsx`, `company/photos.ts`, `product/photos.ts`, `tools/photos.ts`, `system/not-found-photo.ts`) at `photoFor`.
- **Unused now:** `CalculatorHandoffNotice.tsx`. Check whether anything except its test uses it.
- **Clean-up:** delete the old marketing components and old images; remove `serwist` packages; delete `public/site.webmanifest`.

## From the foundation lane (done 18 Nov): how to use it

### Shells

- `app/(public)/layout.tsx` always renders `.public-root`, `MotionReady` and `CookieStub`. `PublicChrome` picks the shell from the pathname:
  - **Default:** the public shell (skip link, `PublicHeader`, `<main id="content">`, `PublicFooter`).
  - **`/login`, `/register`, `/forgot-password`:** the page renders alone and wraps itself in `components/public/shells/AuthShell`.
  - **`/share/*`, `/c/*`:** the page renders alone and wraps itself in `components/public/shells/MinimalShell`.
  - **Maintenance, offline, 404 and iPhone** (outside `(public)`) use `MinimalShell` directly; it imports `public.css` itself.
- **Every page lane:** REMOVE the old `Navbar`, `PublicFooter`, `PublicHeader`, `PublicShell`, `LandingMotion`, `public-atmosphere` wrappers and any `<main>` from your pages. The shell provides them; otherwise you get two headers and nested `<main>`.
- **Server-safe** (no `'use client'`): `Slip`, `Stripe`, `ArcMeter`, `ChoiceKeys`/`GradeKeys` (uncontrolled), `Accordion`, `SectionHeading`, `Figure`, `Credit`, `UiFrame`, `CountLine`, `ProofStub`, `AppLinks`, the shells.
- **Client components:** `Button`/`LinkButton`, `Field`, `Stepper`, `Reveal`, `CodeField`, `PasswordField`, `GoogleButton`.
- **Photos:** already tinted, so `Figure` defaults to `treatment="none"`. Pass `unoptimized` for the pre-sized files in `public/images/campus`.
- **Cookie stub:** while it is open, `<html data-cookie-stub="open">` and `--pg-stub-h` are set. Pad first screens with `padding-bottom: var(--pg-stub-h, 0)` where the plan says so.

### Imports (all `@/…`)

**Brand and shared pieces:**

- `components/public/Logo`:
  - `Logo { size=32, wordmark=true, href?, label? }`
  - `AcadeGradeMark { size, title? }`
  - `AcadeMindMark { size=24, alt? }`
- `components/public/Stripe`: `{ size: 'lg'|'md'|'sm'|'xs', fill? }`
- `components/public/edges`: `zigzag()`, `zigzagStyle()`, `notchStyle(side, r)`, `scallopStyle(n)`, `scallopBottomStyle(n, depth)`, `Perforation`.
- `components/public/Slip`:
  - `Slip` props: `variant` ('result'|'receipt'|'letter'|'stub'|'sheet'|'reply'), `band` ('stripe'|'plain'|'none'|node), `bandFill?`, `mark?`, `title?`, `meta?`, `foot?`, `as`, `notch`, `teeth`, `scallops`, `className`, `style`, `id`, `aria-*`.
  - `SlipFoot { items: {label, value, highlight?}[], live? }`.
  - Table classes: `.pg-slip-table`, `.pg-num` cells, and `tr[data-carry="true"]`, which prints red.

**Actions and inputs:**

- `components/public/Button`:
  - `Button { tone: 'ink'|'paper', size: 'md'|'sm', block?, busy?, disabled? }`
  - `LinkButton { href, external?, prefetch?, tone, size, block }`
- `components/public/TextLink`: `{ href, target44?, external? }`.
- `components/public/ArcMeter`: `{ value: number|null, label='CGPA', ariaLabel?, tickLabels=true, highlight?: {from,to}|null, size=520, children?, scale? }`. Helpers: `arcAngle`, `arcLabel`.
- `components/public/ChoiceKeys`: `ChoiceKeys<V> { name, options: {value, label, accessibleName?, tone?: 'ink'|'mark', disabled?}[], value?|defaultValue?, onChange?, label?|labelledBy?, describedBy? }`. `Segmented` is the same component.
- `components/public/GradeKeys`: `{ name, course, value?, defaultValue?, onChange?, disabled?, scale? }`.
- `components/public/Stepper`: `{ label, hideLabel?, unit?, min, max, value?|defaultValue?, onChange?, hint?, error? }`.
- `components/public/Field`: `Field`, `SelectField` and `TextareaField`, each `{ label, hideLabel?, hint?, error?, suffix?, ref, ...native props }`.

**Content blocks:**

- `components/public/Accordion`: `{ items: {id?, question, answer}[], defaultOpen?, headingLevel=3 }`. `faqPageJsonLd(entries)` builds the matching JSON-LD.
- `components/public/SectionHeading`: `{ id?, title, sentence?, level=2, ariaLabel?, display? }`.
- `components/public/Figure`: `{ src, alt, width?, height?, fill?, aspect?, sizes?, priority?, unoptimized?, treatment, caption?, captionOnTab?, focus? }`.
- `components/public/Credit`: `{ ids?: string[] }`.
- `components/public/UiFrame`: `{ caption, children, scale=1, height?, aspect?, inert=true, href?, linkLabel?, surface }`.
- `components/public/Reveal`: `{ as='div', threshold=0.15 }`. Its direct children stagger in.

**Proof:**

- `components/public/CountLine`: `{ count, fallback? }`.
- `components/public/ProofStub`: `{ item, tilt? }`.
- `components/public/ProofPreviewGate`: `{ children }`. Shows its children only to admins on `?preview=proof`.

**App links:**

- `components/public/AppLinks`: `{ variant='full'|'compact', sizeMb?, version?, playUrl?, iosUrl? }`.
  - Compact links to `/app`; full links to `/app/download/android`.
  - `AppLinksFromSettings` is the async server version.

**Shells and forms:**

- `components/public/shells/AuthShell`:
  - Props: `{ title, sentence?, photo: 'gate'|'arts'|'lecture', reassurance?, progress?, below?, footerLinks?, children }`.
  - The h1 is the title; `main` is labelled by `AUTH_TITLE_ID`.
- `components/public/shells/MinimalShell`: `{ children, imprint?, mainLabel? }`.
- `components/public/forms/*`:
  - `PasswordField`
  - `GoogleButton { busy?, label?, busyLabel? }`
  - `PerforationDivider { label }`
  - `AuthMessage { tone: 'error'|'neutral'|'status' }`
  - `StepStripe { steps, current, done?, label, showLine? }`
  - `CodeField { value?, onChange?, onComplete?, error?, hint?, label? }`, with `normaliseCode()`
  - `ChoiceRows`/`ChoiceRow { name, options: {value, title, line?}[], value?, onChange?, label? }`
  - `FilledSoFar { lines: {label, value}[] }`
- `components/public/nav`: `HEADER_LINKS`, `FOOTER_GROUPS`, `AUTH_LINKS`, `isCurrentPath`, `IMPRINT_LINE`.

**Data (`lib/public/*`):**

- `scales`: `DEFAULT_SCALE`, `LIVE_SCALES`, `hasScaleSwitcher()`, `publicClassFor()` (Fail shows as "Below a Pass"), `classTicks()`, `gradeBandLine()`, `classBandLine()`.
- `example-student`: `EXAMPLE_STUDENT`, `EXAMPLE_META_LINE`, `EXAMPLE_COURSES`, `EXAMPLE_PRIOR_SEMESTERS`/`TOTALS`, `computeExampleSlip(overrides)`, `exampleSemesterFromScores()`, `exampleRunningCgpa()`.
  - Pinned values: GPA 4.15, PI 3.30, CGPA 4.43, then 4.49, then 4.53 First.
- `proof` (server):
  - `resolvePublicProof()` shows samples on `VERCEL_ENV=preview` and fails closed, hiding the section on any error.
  - Also exports `readPublicProof()`, `sampleProof()`, `selectCount()` and `selectTestimonials()`.
- `usage-public`: `readPublicUsage()` returns `PublicUsage|null`.
- `credits`: `creditsFor(ids)`, `formatCredit()`, `formatImprintCredits()`.
- `og`: `renderOgImage({ headline, line?, meta? })`, `OG_SIZE`, `OG_CONTENT_TYPE`. Use it in a page's `opengraph-image.tsx`.
- Brand files: `public/brand/acadegrade-mark.svg` and `public/brand/academind-mark.webp`.

### Notes

- Tests for public components live in `tests/unit/public/`, because vitest only includes `tests/**`.
- `components/privacy/CookieConsentBanner.tsx` now steps aside while `CookieStub` is mounted.

## From the imagery lane (done 17 Nov)

- **Where the photos are:** `public/images/campus/<slug>/<crop>-<width>.{avif,webp}`. The data is in `lib/public/credits-data.ts` (`CAMPUS_PHOTOS`, plus `PHOTO_CREDITS` for the footer). Every id is its slug. Each crop lists its slot in `usedOn`; the full map is in `docs/public-redesign/credits.md`.
- **Tint:** it is already applied to every file. Do NOT add CSS filters.
- **Credits:** print them through the credits helper (`creditsFor([...slugs])`) and never hard-code them. Replacements versus the plans:
  - the UNN gate is by "Hadassah Photostorie group" (not Favouridowu);
  - the timetable uses "Lecture hall, IBBU Lapai";
  - required GPA uses the Temilolub Kenneth Dike photo.
- **ESUT:** no usable open-licence ESUT photo exists yet, so UNN fills those slots until the owner supplies one.
- **Home:** `tests/unit/marketing-home.test.tsx` checks for the old hero file names; update it.
- **Old images:** `mobile-app-images/*` and `public/{light,dark}-background.png` become unused after Wave 2. The lead deletes them.

## From the server fixes lane (done 17 Nov)

- **Product lane:**
  - `app/app/download/android/route.ts` becomes `export async function GET() { return androidDownloadResponse(); }` (from `lib/mobile-app-links.ts`).
  - The `/app` page reads size and Play link from `getMobileAppLinksSafe()`. Links include `androidSizeMb: number|null` and `playUrl: string`.
- **Auth lane:**
  - Change the maintenance redirects in login (`app/(public)/login/page.tsx` ~L71) and register (~L1007) to `router.replace(buildMaintenanceRedirect(pathname + search))` (from `lib/public/maintenance-redirect.ts`).
  - Reset-password send now returns 200 with the same body for unknown emails (there is no 404 any more). Copy: "If that email has an account, we've sent a code."
  - The server minimum password is 8: "Password must be at least 8 characters".
  - The register post-code window is now 30 minutes.
- **System lane:**
  - The maintenance page reads `safeNextPath(searchParams.get('next'))` and returns the visitor there when maintenance ends.
  - The student layout (`app/(student)/layout.tsx` ~L36) redirect is changed by the lead after Wave 2.
- **Company lane:**
  - The public form posts to `POST /api/support/public`:
    - **Body:** `{ name?, email, category: 'account'|'privacy'|'other', message (10–2000), route?, website (honeypot, keep empty and hidden) }`.
    - **Responses:** 201 `{ok:true}`; 400 `{error}`; 429 with `retryAfterSeconds`; 503 `FEATURE_DISABLED`.
    - Use `parsePublicSupportRequest`, `PUBLIC_SUPPORT_CATEGORIES` and `PUBLIC_SUPPORT_HONEYPOT_FIELD` from `lib/support/public-request.ts`.
  - Account deletion: timetables, support requests, AI-answer reports and catalogue suggestions are deleted (tests confirm this). Self-delete may now finish "automatically within 21 days" when queued.
  - Privacy notice: built-in version 2026-11-17 (`lib/legal/builtin.ts`). The owner publishes it from Admin → Legal documents.
- **Foundation lane:** `lib/public/proof.ts` uses `getApprovedTestimonials()`, `getProofCountThreshold()` (`lib/testimonials/server.ts`), `MIN_APPROVED_TO_SHOW` (3) and `PROOF_SAMPLE_TESTIMONIALS` (`lib/public/proof-samples.ts`, admin preview only).
- **Tools lane:** required averages now round up in `tool-math.ts` (4.65225 → 4.66), so the "rounded up, so you never aim too low" FAQ line can be shown.
- **Still open, not done:** renaming the support category "AI features" to "AcadeMind" (it is shared with Settings and Android; it needs an Android build too).
