# Page plan · Android app (`/app`, new)

Inherits `01`–`04` and follows the template of `pages/home.md`. Anything not stated here follows those files. **New page:** it is the header's **Android app** link, the home page's "Get the Android app" link and every "Download for Android" context. The old download URL `/app/download/android` stays exactly as it is (a redirect to the admin-set APK) so links already shared on WhatsApp keep working; this page explains what that file is and how to install it.

## 1. Purpose

- **Mode:** Persuade, with an Operate step (download and install).
- **Visitor:** a student told "get the app" by a classmate, usually on an Android phone from a WhatsApp link, sometimes on a laptop; some have never installed an APK and are wary of it. A smaller group arrives on an iPhone.
- **First question:** "How do I get it, and is the file safe?" Answer within five seconds: *the Download button, the file size and version, and a plain install guide just below*.
- **One action:** **Download for Android** (`/app/download/android`). When a Google Play URL is set, the official **Get it on Google Play** badge takes its place and the APK becomes a text link (§5.1, "Google Play").
- **Secondary (text links):** "How to install" (`#install`), "On an iPhone?" (`#iphone`), "Use it on the website" (`/register`).
- **Must say plainly:** what the app adds (offline timetable reminders, the camera scanner, App Lock, screen privacy, update notices, and coins from short ads when coins are on); how to install an APK safely ("Allow from this source", Play Protect, where to download from); file size and version from config when known; iPhone users use the website and can add it to the Home Screen; no "coming soon".

## 2. The argument (each section exists because of one claim)

| # | Claim | Proof on the page | Section |
|---|---|---|---|
| 1 | The app is the website plus a few things only a phone can do | The logo arc with the phone in front; choosing each extra shows its real screen | Hero |
| 2 | Installing takes about two minutes | Every tap, printed as an itinerary | Install in about two minutes (`#install`) |
| 3 | Installing from a file is safe when you do it right | Ten plain answers, all visible | Installing safely |
| 4 | iPhone users are not left out | The website on a phone screen and the Add to Home Screen steps | On an iPhone? (`#iphone`) |
| 5 | Getting it is one tap | The word "Download" as the whole band | Download |

## 3. First screen

### Desktop (1440×900)

- **Composition** (blueprint `showcase-object-on-a-disc`, adjusted as a first screen): one section a viewport tall on `--pg-ground`.
- **The disc is the logo's own shape:** the AcadeGrade arc, drawn as in `ArcMeter` (`02` §4.6) with five flat stroke segments (`--pg-step-1…5`, never blended), 64vh across, stroke 48px, its centre at 62% of the width, with the gold dot at its end.
- **In front of it:** a flat ink phone outline (allowed on this page only, `02` §4.10: no shine, no tilt, square-ish 24px screen corners because that is the phone's real shape, not a page radius), about 78% of the arc's height, breaking the arc's top. Its screen shows the selected extra's real screen (§5.1).
- **Top-left, columns 1–5** (the blueprint's list is moved down to make room for the first-screen promise):
  1. **h1** at `--pg-display` (capped 80px), two lines: "AcadeGrade / for Android."
  2. **Sentence** at `--pg-lead`, 38ch (copy in §4).
  3. **Primary button:** **Download for Android**.
  4. **Meta line** at `--pg-small`, directly under the button: "Version {latestVersion} · {sizeMb} MB · Android 7.0 or newer · APK file" (parts omitted when unknown; "Android 7.0 or newer" and "APK file" always show).
  5. **Two text links:** "How to install" (`#install`), "On an iPhone?" (`#iphone`).
- **Bottom-left, columns 1–5, ending level with the arc's lower edge:** the list of extras. Its first line, in soft ink at the same size, is the heading "What the app adds" (an h2). Then up to six names at `--pg-head` (capped 40px), leading 1.15, each a button in a `role="tablist"`. The selected name is full ink with a gold dot before it; the others in soft ink (deviation from the blueprint's 25% ink, which fails contrast).
- **The fact** for the selected extra sits at the arc's right edge at `--pg-body`, 30ch.

### Phone (390×844)

- **Order:** h1 at 40px on two lines, sentence at 20px, the full-width button (52px), the meta line, the two links. All on the first screen with the cookie stub open.
- Then the arc at 86vw, centred, with the phone in front; then the extras as one sideways-scrolling row of names at 26px with 24px gaps (selected in full ink with its dot); the fact under them at 16px.

### Why this works

- **Specific:** the phone stands inside AcadeGrade's own arc, and the screens are the real app with the example student, not a glossy mock-up.
- **Honest:** size, version, minimum Android and "APK file" are in plain sight before the visitor taps.

## 4. Copy deck (final wording; sentence case; two-line rule checked)

- **h1:** "AcadeGrade for Android." (23 characters; lines of 10 and 12)
- **Sentence:** "Everything on the website, plus timetable reminders that work without data, a camera scanner and App Lock. Free." (112 characters)
- **Button:** "Download for Android" (`aria-describedby` the meta line, so it is announced as "Download for Android, APK file, {sizeMb} MB").
- **Section headings (h2):**
  1. "What the app adds" (inside the hero)
  2. "Install in about two minutes"
  3. "Installing safely"
  4. "On an iPhone?"
  5. "Download" (the giant word is the band's link text; a visually hidden h2 "Download the app" labels the section)
- No "coming soon", no "beta", no "iOS" promise anywhere.

## 5. Sections

### Live data for this page (server component, revalidated every 5 minutes)

| Value | Source | When missing |
|---|---|---|
| APK link | `/app/download/android` (always this stable URL; it redirects to `config/settings.mobileAppLinks.androidUrl`, default `DEFAULT_ANDROID_DOWNLOAD_URL`) | n/a |
| Version | `config/mobileRelease.latestVersion`, only when `enabled` is true | Omitted from the meta line |
| File size | **New field** `config/settings.mobileAppLinks.androidSizeMb` (whole number, 1–500), set in admin beside the APK URL | Omitted; the button and band still work |
| Google Play URL | **New field** `config/settings.mobileAppLinks.playUrl` (HTTPS, host `play.google.com`) | No badge; the APK stays primary |
| iPhone redirect | `mobileAppLinks.iosUrl` (used only by `/app/download/ios`) | n/a |
| Coins | `config/usage` via `lib/public/usage-public.ts` (`coins.enabled`, `coinsPerAd`) | The coins extra is not listed |

- **Schema work** (code, not this plan): extend the `mobileAppLinks` validation in `lib/admin/settings-schema.ts` with the two optional fields, show them in `components/admin/settings/PublicSiteSettings.tsx` and in the Android release **Download links** panel, and keep `lib/mobile-app-links.ts` returning them trimmed.
- **Failure:** if Firestore cannot be read, the page renders with no version, no size and no badge (never an error page), because the download route has its own fallback.

### 5.1 Hero: the app inside the arc (blueprint `showcase-object-on-a-disc`)

**Extras** (the tablist; each swaps the phone's screen with a 320ms crossfade and moves the arc's gold dot to that item's position on the arc):

| Name | Fact (beside the arc) | Phone screen (real Android screenshot, example data) |
|---|---|---|
| Offline reminders | "Up to 3 reminders per event, set on your phone, so they arrive without data or signal." | The timetable week with the notification "Data Structures · Starts in 10 minutes, at 09:00, LT 2." pulled down over it |
| Camera scanner | "Point your camera at your result slip and check the rows it reads. For students 18 and over." | The scan screen with the example slip in the frame |
| App Lock | "Your fingerprint, face or phone passcode each time you come back to AcadeGrade." | The App Lock screen ("Unlock Now", "Use Passcode") |
| Screen privacy | "Hide AcadeGrade from the recent-apps preview and block screenshots, if you choose." | Settings › Screen privacy with the switch on |
| Update notices | "The app tells you when a new version is ready, and where to get it." | The update notice sheet |
| Coins for extra uses | "Watch a short ad for {coinsPerAd} coins and spend them on extra AcadeMind uses. Not offered to under-18 accounts." | The coins sheet (only listed when `coins.enabled`) |

- **Facts behind the copy:** reminders are local notifications on a rolling 14-day window (`lib/timetable/reminders.ts`); App Lock needs a fingerprint or face unlock set up and offers the device passcode (`student.app-lock` help); screen privacy is "Block screenshots and hide app preview"; update notices are the direct-APK build's release notice (`config/mobileRelease`); coins come from rewarded ads with an admin switch.
- **Screens:** six 2x screenshots captured by the owner on a test account holding the example student's data (no real names, no real matric numbers), exported to AVIF under 60 KB each; the first loads with the page, the rest only on selection or idle. Until they exist, this page does not ship (a placeholder screen is not allowed).
- **Google Play:** when `playUrl` is set, the hero's primary becomes the official **Get it on Google Play** badge (Google's artwork, unaltered, at least 48px tall, linking to `playUrl` in a new tab with "Opens Google Play" in its accessible name), and the APK moves to a text link under it: "Or download the APK ({sizeMb} MB)". The badge is a third-party brand asset, the one exception to square corners and the no-badge rule, as the logo is to the no-gradient rule. The imprint adds "Google Play and the Google Play logo are trademarks of Google LLC."
- **Signed in:** nothing changes (downloading is the same for everyone); the header shows **Open dashboard** as usual.

### 5.2 Install in about two minutes (`#install`; blueprint `how-it-works-itinerary-on-a-slip`)

- **Field:** `--pg-ground-2`.
- **Columns 1–5:** h2 at `--pg-head`: "Install in about two minutes"; paragraph at `--pg-body` (30ch): "The app comes as an APK file from AcadeGrade's own link. Android asks you to allow it once, because it didn't come from the Play Store." When `playUrl` is set, a second line: "Prefer Google Play? Use the Google Play button above; it installs and updates the app for you."
- **Columns 7–11: the slip,** paper, 460px, straight top, zigzag bottom; rows at `--pg-body` with tabular figures and 4px dot leaders; group headings at `--pg-body` weight 500 with 28px above:

| Group | Step (left) | Right |
|---|---|---|
| Download | Tap Download for Android | {sizeMb} MB (or "one file") |
| | Wait for the download to finish | see your notifications |
| Install | Open the file from your notifications, or Files › Downloads | 1 tap |
| | If Android asks, open Settings and turn on Allow from this source | once only |
| | Go back and tap Install | 1 tap |
| | If Play Protect offers to scan the app, let it | a few seconds |
| Open | Open AcadeGrade and sign in | your record is there |
| | Allow notifications so reminders can reach you | 1 tap |

  - Final inverted row (ink bar, paper text, 44px): "You have: AcadeGrade on your phone, in step with the website · about 2 minutes".
- **Phone:** heading and paragraph first; the slip at full width minus 16px, keeping its zigzag; rows keep left text, dots and right value on one line, long steps wrap under the left text; the inverted row stays full width.

### 5.3 Installing safely (blueprint `faq-open-two-column-reading`)

- **Ground:** `--pg-ground`.
- **Columns 1–3:** h2 at `--pg-lead` (blueprint 28–32px): "Installing safely", top-aligned.
- **Columns 5–12:** the answers as reading text in two columns (`columns: 2; column-gap: 56px`, about 36ch each) at `--pg-body`, leading 1.55. Each item is one paragraph: the question as a run-in at weight 500 in full ink, ending in its question mark, then the answer in regular weight on the same line. 20px between paragraphs, `break-inside: avoid`. No toggles, icons or boxes. These also feed the `FAQPage` JSON-LD.
  1. **Is it safe to install from a file?** Yes, when the file comes from AcadeGrade. This page always links to the current official file, and Android's Play Protect can scan it as it installs.
  2. **Where should I download it from?** Only from this page, or a link that starts with {siteHost}/app. If someone sends you the APK itself on WhatsApp, download a fresh copy here instead.
  3. **What does "Allow from this source" do?** It lets your browser, for example Chrome, install this app. You can switch it off again afterwards in Settings › Apps › Special app access › Install unknown apps; the names differ a little between phones.
  4. **What will the app ask for?** Your camera when you scan a slip, your photos or files when you choose one, notifications for reminders and, on some phones, Alarms & reminders so they arrive on time. Android asks for each one when it's needed.
  5. **Is the app the same as the website?** Yes. Sign in with the same account and your record, transcripts and timetables are all there. The app adds the extras above.
  6. **How do I update it?** The app tells you when a new version is out. Download it from this page and install it over the old one. Your record stays, because it's saved to your account.
  7. **Will it use much data?** The download is {sizeMb} MB, once. After that the app is light, and timetable reminders need no data at all. Turn on data saver to make it lighter still.
  8. **Which phones does it work on?** Android 7.0 or newer.
  9. **What if I uninstall it?** Nothing is lost. Your record is saved to your account; sign back in and your reminders are set again.
  10. **Is it free?** Yes, with nothing to pay and no subscription. AcadeMind has free uses every day{coinsClause}.
  11. **Is it on Google Play?** (rendered only when `playUrl` is set) Yes. It's the same app, and Google Play updates it for you.
- **Placeholders resolve as follows:** `{siteHost}` is the host of `resolveSiteUrl()` (today `acadegrade.vercel.app`; the custom domain later). `{sizeMb}` falls back to "small" wording when missing: answer 7 becomes "The download happens once. After that …". `{coinsClause}` is ", and in the app you can earn extra uses with coins from short ads" when coins are on, otherwise empty.
- **Sources:** Android 7.0 = `minSdk 24` (Expo 57 default); permissions from `app.json` (`CAMERA`, `READ_EXTERNAL_STORAGE`, `POST_NOTIFICATIONS`) and `app.config.js` (`SCHEDULE_EXACT_ALARM` on direct builds only); reminders rebuilt after sign-in (`lib/timetable/reminders.ts`).
- **Phone:** one column at 16px with 20px margins; heading at 24px; 18px between paragraphs; it may run to two screens and is never collapsed.

### 5.4 On an iPhone? (`#iphone`; blueprint `showcase-square-plate-spare-text`)

- **Field:** `--pg-paper` full width, at least 88svh, split 50/50.
- **Left half:** a square `--pg-ground-2` plate, the half's width minus 40px, holding a `UiFrame` of the website's dashboard at phone width (390px wide, example student: CGPA 4.43, Second Class Upper, 87 units), captioned "AcadeGrade on the website, at phone size".
- **Right half** (flex column, space-between):
  - **Top:** two text tabs at `--pg-body`: "Safari" and "Other browsers" (active in full ink, the other in soft ink).
  - **Middle:** h2 at `--pg-head` (capped 44px): "On an iPhone?"; 48px below at `--pg-body`, 34ch: "There's no App Store app, and you don't need one. AcadeGrade works fully on the website. Add it to your Home Screen and it opens like an app."
    - **Safari tab steps** (a list with dot leaders, no numbers): "Open AcadeGrade in Safari · Tap Share (the square with an arrow) · Choose Add to Home Screen · Tap Add".
    - **Other browsers tab:** "Many iPhone browsers also offer Add to Home Screen in their share menu. If yours doesn't, open AcadeGrade in Safari first."
  - **Bottom:** one filled ink cell, half the column wide, 72px: **Start on the website** → `/register` (signed in: **Open dashboard**); beside it a text link "Full iPhone guide" → `/app/download/ios`. (Deviation: the blueprint's second filled cell is a text link, per `02` §4.4.)
- **Phone:** the plate first at full width; tabs at 17px; h2 at 28px; the description and steps; the cell full width (60px) with the link under it.

### 5.5 Download (blueprint `cta-giant-word-is-the-button`)

- **Field:** `--pg-gold`, full bleed, about 60svh. The whole band is one `<a href="/app/download/android">` (or `playUrl` when set; then its top-left sentence says "Opens Google Play").
- **Top-left** at `--pg-lead`, ink: "Download AcadeGrade for Android · {sizeMb} MB · version {latestVersion}" (missing parts dropped).
- **Top-right:** an arrow drawn as a simple inline SVG (two 4px strokes), 48px, pointing up and right, `aria-hidden`.
- **The word** "Download" in ink, weight 500 (the type system's heaviest), tight tracking (-0.05em), sized in container units so it spans the content width on one line, baseline 24px above the bottom edge. It counts as the Display step's giant word (`01` §5).
- **Hover and focus:** field and word swap colours instantly (ink field, gold word; about 9:1 either way), plus the gold focus outline offset inside the band.
- **Accessible name:** "Download AcadeGrade for Android, APK file, {sizeMb} MB".
- **Phone:** 46svh; the word fills the width on one line (about 22vw); the sentence top-left at 17px over two lines; arrow 32px; the whole band tappable.
- **Analytics:** `android_download_click` (with `source: 'app_page_band'`, `'app_page_hero'`, `'install_slip'`), only after analytics consent (`04` §7).
- **Footer** follows with 0px gap: the footer's stripe band sits on the ground below the gold field.

### 5.6 Footer

The shared `PublicFooter` (its Product group already lists "Android app").

### 5.7 The download routes (kept, hardened)

- **`/app/download/android`** (`app/app/download/android/route.ts`): unchanged behaviour, a `307` to `getMobileAppLinks().androidUrl`. Two fixes:
  - Wrap the Firestore read in `try/catch` and fall back to `DEFAULT_ANDROID_DOWNLOAD_URL`, so a Firestore outage never breaks a shared download link.
  - Send `Cache-Control: no-store` on the redirect, so an admin change takes effect at once.
- **`/app/download/ios`:** see `pages/download-ios.md`.
- **Where the new page lives:** `app/(public)/app/page.tsx` (inside the public shell). The two download routes stay in `app/app/download/…`, outside the public layout. They resolve to different URLs, so there is no route clash; confirm with `next build`.
- **`MobileAppDownload`** (`components/ui/MobileAppDownload.tsx`, used on today's home, login and register) shows "iOS coming soon". It is replaced on public pages by a small `AppLinks` component: "Get the Android app" → `/app`, and, only when `iosUrl` is set, "Get the iPhone app" → `/app/download/ios`. Otherwise nothing about iOS. The login and register plans should use `AppLinks` too.

## 6. Imagery for this page

| Slot | Picture | Source and licence | Treatment |
|---|---|---|---|
| Hero phone screens (six) | Android app screenshots: timetable with notification, scan screen, App Lock, screen privacy, update notice, coins | Owner, from a test account with the example data | 2x, AVIF under 60 KB each, inside the flat ink phone outline |
| Hero arc | The AcadeGrade arc drawn in SVG as five flat steps | AcadeGrade brand | No gradient; the gold dot moves |
| Install slip | Drawn in code | n/a | Paper and dots |
| iPhone plate | The website dashboard at phone width | AcadeGrade's own components, example data | `UiFrame`, captioned |
| Google Play badge (conditional) | Official "Get it on Google Play" badge | Google Play badge guidelines | Unaltered |

No campus photographs on this page: the product is the picture, and every byte counts for a visitor about to spend data on a download.

## 7. Motion on this page

- **Signature: the phone is set inside the arc.** Once per visit, the arc's five segments draw in order (60ms each), the gold dot lands, then the phone rises 24px into place (640ms, `--pg-ease-paper`). Reduced motion: all present.
- **Extras:** choosing a name crossfades the screen (320ms) and moves the gold dot along the arc (320ms, `03` §3.6). The extras never rotate on their own.
- **Install slip:** prints row by row (40ms apart), inverted row last.
- **Safety text:** a standard entrance only (reading text stays still).
- **iPhone plate:** tab switch crossfades the steps (160ms).
- **Download band:** the arrow nudges 4px up-right on hover (160ms); colour swap is instant.
- **Count:** at least 9 moving elements over load and scroll; data saver stops the screen preloading as well as the travel.

## 8. Components

- **Used:** `PublicHeader`, `ArcMeter` (drawing only, as the disc), `Slip` (`receipt`), `UiFrame`, `Button`, `TextLink`, `SectionHeading`, `CookieStub`, `PublicFooter`.
- **New:**
  - `PhoneOutline` (flat ink outline; Android page only).
  - `ExtrasTabs` (client island: tablist, screen crossfade, dot position).
  - `ReadingQA` (run-in Q&A in two columns; feeds `FAQPage`).
  - `GiantWordLink` (full-band link with colour swap).
  - `AppLinks` (replaces `MobileAppDownload` on public pages).
  - `PlayBadge` (renders only with `playUrl`).
- **Data:** `lib/public/app-release.ts` (server: reads `mobileAppLinks`, `mobileRelease` and the coin switch; returns `{ apkHref, version?, sizeMb?, playUrl?, coinsPerAd? }`; never throws); `lib/public/android-page.ts` (copy, steps, Q&A).

## 9. SEO

- **Title:** "Android app | AcadeGrade".
- **Description:** "Download AcadeGrade for Android: timetable reminders that work offline, a camera result scanner and App Lock. Free. Here's how to install the APK safely." (153 characters)
- **Canonical:** `/app`.
- **Open Graph:** the phone inside the arc with "AcadeGrade for Android."
- **JSON-LD:**
  - `SoftwareApplication`: name "AcadeGrade", `operatingSystem` "Android 7.0 or later", `applicationCategory` "EducationalApplication", `isAccessibleForFree` true, `offers` price 0 (NGN), `downloadUrl` the absolute `/app/download/android`, `softwareVersion` and `fileSize` only when known; no `aggregateRating`.
  - `FAQPage` from §5.3, exactly the rendered items.
- **Sitemap:** add `/app` to `PUBLIC_SITEMAP_ROUTES`. `/app/download/*` stay out of the sitemap.
- **Keywords:** "AcadeGrade APK", "CGPA app Android", "timetable reminder app", "install APK safely".

## 10. Accessibility

- **Download button and band:** say what they do and the size ("APK file, 45 MB"); they download in the same tab (`03` §4 allows APK downloads to say so rather than open a new tab).
- **Extras tablist:** arrow keys move between names; each tab controls the phone screen panel (`aria-controls`); the screen image has alt text describing what it shows ("Timetable week with a reminder for Data Structures at 09:00"); the arc and dot are `aria-hidden`.
- **Install slip:** an ordered list (`<ol>` with no visible numbers; the groups give the order) inside a `<section>` with the h2; dot leaders `aria-hidden`.
- **Reading Q&A:** each paragraph starts with the question in a `<strong>`; a visually hidden h3 per question keeps the heading outline navigable.
- **iPhone tabs:** a tablist; the steps are a list.
- **Contrast:** ink on gold about 9:1; unselected extras use `--pg-on-ground-soft` (soft ink on the light ground, `#A9A6C4` on the night ground), both above 4.5:1; selection is also marked by the gold dot, not by colour alone.

## 11. Carried over, replaced and removed

| Today | In the redesign |
|---|---|
| No page explains the APK; `/app/download/android` downloads straight away | `/app` explains, sizes and guides the install; `/app/download/android` still downloads straight away |
| Home's mobile showcase images with the owner's real profile (`AcadeGrade App Dashboard Showcase*.png`) | Retired; new screenshots with the example data only |
| Home copy "The AcadeGrade mobile app lets you review results, scan a result slip, check your trajectory and keep your unofficial transcript within reach." | "Everything on the website, plus …" and the extras list |
| `MobileAppDownload` with "iOS coming soon" (dashed pill) | `AppLinks` (no iOS line unless an iOS URL exists) and the `#iphone` section |
| Admin-managed `androidUrl` and `iosUrl` | Kept; plus optional `androidSizeMb` and `playUrl` |
| Release notice version (`config/mobileRelease.latestVersion`) shown only inside the app | Also shown on the page's meta line when the release is enabled |

## 12. Acceptance checklist

- [ ] Five-second test: a stranger finds the Download button and can say how big the file is.
- [ ] `/app/download/android` still redirects to the admin URL, and to the default URL when Firestore is unreachable (unit test with a failing read).
- [ ] With `playUrl` empty: no badge, no Play question. With `playUrl` set: the badge is primary, the APK is a text link, the trademark line is in the imprint.
- [ ] Missing version or size never leaves an empty "·" or "MB" behind.
- [ ] The coins extra and the coins clause appear only when coins are on.
- [ ] No "coming soon", "beta" or iOS promise anywhere on the page or in `AppLinks`.
- [ ] Phone: h1, sentence, button and meta on the first screen at 390×844 with the cookie stub open.
- [ ] `inspect.mjs`: 0 FAIL at 1440/768/390, light and dark; the phone outline is the page's single defended WARN (if flagged as a device mock-up). Lighthouse mobile ≥ 90 ×4.
- [ ] `FAQPage` JSON-LD matches the rendered Q&A; `/app` is in the sitemap.

## 13. Open items for the owner

1. Capture the six Android screenshots on a test account with the example student's data.
2. Enter the APK size in admin (new field) each time you upload a new APK, or approve reading it automatically from the file's `Content-Length` at build time instead.
3. When the Google Play listing is live, paste its URL into admin (new field). Decide then whether Google Play or the APK should be the primary action (this plan assumes Google Play).
4. Confirm "about two minutes" for the install (it assumes a 4G connection and a file of about 45 MB or less).
5. Confirm the minimum Android version (7.0, from `minSdk 24` in Expo 57) against the released APK.
