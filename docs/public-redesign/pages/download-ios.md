# Page plan · iPhone (`/app/download/ios`)

Inherits `01`–`04` and follows the template of `pages/home.md`, at the size a one-screen System page needs. Anything not stated here follows those files.

## 1. Purpose

- **Mode:** System (a page people land on from a "Download for iOS" link, an old share, or the Android page's "Full iPhone guide").
- **Shell:** the minimal shell (`04` §2): mark, wordmark and one link home at the top; one imprint line at the bottom; no Firestore needed for the shell.
- **Visitor:** a student on an iPhone, often inside WhatsApp's or Instagram's in-app browser, who expected an App Store app.
- **First question:** "Can I use AcadeGrade on my iPhone?" Answer within five seconds: *yes, on the website; add it to your Home Screen and it opens like an app*.
- **One action:** **Create your free record** (`/register`). Signed in, it reads **Open dashboard** (`/dashboard`).
- **Secondary (text links):** "Sign in" (`/login`), "Have an Android phone? Get the Android app" (`/app`).
- **Rules:** when `config/settings.mobileAppLinks.iosUrl` is set, the route redirects there, exactly as today. When it is not set, the page is an honest iPhone page: no "coming soon", no "we are preparing", no date, no promise of an app.

## 2. The argument (each section exists because of one claim)

| # | Claim | Proof on the page | Section |
|---|---|---|---|
| 1 | AcadeGrade already works on your iPhone | The four Add to Home Screen steps, short enough to do right now | The card |
| 2 | Nothing is missing that matters to you today | One line on what the website does, and the honest note on reminders | The card |
| 3 | You can start now | One button | The card |

## 3. First screen

### Desktop (1440×900)

- **Composition** (blueprint `contact-visit-card-on-photograph`, adjusted for a System page):
  - Minimal shell header (64px): mark and wordmark left, "Back to AcadeGrade" (`/`) right.
  - **Photograph:** full bleed below the header to the bottom of the viewport: the University Gate, University of Nigeria, Nsukka, in the greyscale-indigo treatment (the same file the home hero loads first, so it is often already cached).
  - **The card:** a paper `Slip` (sheet variant) 440px wide (wider than the blueprint's 380px to fit the steps), 32px padding, square corners, fully opaque, placed 60px from the top and from the side where the photograph is calmest (the sky above the gate: upper-left by default; confirm on the downloaded crop). A 40px stripe band runs across its top.
- **On the card, top to bottom:**
  1. The AcadeGrade mark (24px) and wordmark, small.
  2. **h1** at `--pg-head` (capped 48px), two lines: "AcadeGrade works / on your iPhone."
  3. **Sentence** at `--pg-body` (copy in §4).
  4. **Steps** as four rows (the blueprint's "opening hours" rows): what to do on the left at `--pg-body`, a short pointer on the right at `--pg-small`, 4px dot leaders between, 12px apart.
  5. **In-app browser note** at `--pg-small`, soft ink.
  6. **Primary button**, full card width, 52px, flush with the card's bottom padding: **Create your free record**.
  7. Under the card, on a paper tab at `--pg-small`: "Sign in" · "Have an Android phone? Get the Android app".
- **Imprint line** (minimal shell) at the bottom on the ground: "© 2026 AcadeGrade · Personal academic planning, not an official university record · Photograph: University Gate, UNN, by Favouridowu (CC BY-SA 4.0, tinted)".

### Phone (390×844)

- Shell header (60px), then the photograph at 32svh (deviation from the blueprint's 70svh, so the h1 and the steps reach the first screen), then the card spanning the width with 16px margins, overlapping the photograph's bottom edge by 80px.
- On the first screen: the h1, the sentence and the first steps. The button follows the steps; on small phones it may sit just below the first screen, which is right here, because the steps are the point of the page.
- The links sit under the card; the imprint line at the bottom.
- **Data saver or reduced data:** no photograph; the card sits on `--pg-ground` with 24px above it.

## 4. Copy deck (final wording; sentence case)

- **Shell link:** "Back to AcadeGrade".
- **h1:** "AcadeGrade works on your iPhone." (32 characters; lines of 16 and 15)
- **Sentence:** "There's no App Store app to download, and you don't need one. Use AcadeGrade in Safari and add it to your Home Screen: it opens like an app, with your whole record." (163 characters)
- **Steps** (left · right):
  - "Open AcadeGrade in Safari" · "{siteHost}"
  - "Tap Share" · "the square with an arrow"
  - "Choose Add to Home Screen" · "scroll down if you need to"
  - "Tap Add" · "top right"
- **Note under the steps:** "Opened this inside WhatsApp or Instagram? Tap ··· and choose Open in Safari first. On newer iPhones, Share may sit under the ··· button."
- **Reminder line** (one line above the button, `--pg-small`): "Timetable reminders on iPhone come from your calendar: download your timetable as a calendar file (.ics) from the website."
- **Button:** "Create your free record"; signed in "Open dashboard".
- **Links:** "Sign in"; "Have an Android phone? Get the Android app".
- `{siteHost}` is the host of `resolveSiteUrl()` (today `acadegrade.vercel.app`).

## 5. Sections

### 5.1 The card (the only section)

- **Behaviour on the server** (`app/app/download/ios/page.tsx`, stays `force-dynamic` and outside the public layout):
  1. Read `getMobileAppLinks()` inside `try/catch`.
  2. If `iosUrl` is a non-empty HTTPS URL, `redirect(iosUrl)` (unchanged behaviour).
  3. Otherwise, or if the read fails, render this page. A Firestore outage never shows an error here.
- **Signed-in swap:** a tiny client island swaps the button label and target ("Open dashboard", `/dashboard`) after `useAuth` resolves, at the same width (no layout shift); the server renders the signed-out version.
- **Steps markup:** an `<ol>` with `list-style: none` (the order is the reading order; no visible numbers, per the house rules), each item holding the action and its pointer.
- **Why no Android button here:** the visitor is on an iPhone; the Android link is a text link for the few who own both.
- **What the website does on iPhone** (stated nowhere else on this page, so it stays one screen): everything except Android-only extras. The single reminder line covers the one difference students notice.

### 5.2 Home Screen readiness (implementation notes, outside this page's file)

These make "Add to Home Screen" produce a proper AcadeGrade icon and title. They are part of this plan because the page's promise depends on them:

- **Root metadata** (`app/layout.tsx`): add `appleWebApp: { capable: true, title: 'AcadeGrade', statusBarStyle: 'default' }` so the Home Screen name is "AcadeGrade" and it opens without Safari's bars. `apple-touch-icon.png` already exists; re-export it from the vectorised mark at 180×180 on `--pg-ground`.
- **Manifest** (`public/manifest.json`): today `name` is "AcadeGrade v2" and `description` is "Premium Grade Calculator & Academic Advisor" (developer and marketing wording). Change to `name: "AcadeGrade"`, `description: "Your GPA, CGPA and degree class, worked out from your result slip."`, and set `background_color`/`theme_color` to the new ground and ink.
- **Start URL:** `/dashboard` (unchanged); signed-out visitors are sent to sign in from there.

## 6. Imagery for this page

| Slot | Picture | Source and licence | Treatment |
|---|---|---|---|
| Background | "University Gate, University of Nigeria, Nsukka, Nigeria" (`openverse:99d674f4-943c-46d9-8503-c35b425584a1`) | Wikimedia Commons, by Favouridowu, CC BY-SA 4.0, https://commons.wikimedia.org/w/index.php?curid=107195284 | Greyscale-indigo; reuse the home hero's AVIF (under 180 KB); `priority` (it is the first-screen picture); dropped under data saver |

The credit sits in the minimal shell's imprint line (this page does not use the public footer, so `lib/public/credits.ts` is not involved).

## 7. Motion on this page

- **The card is laid down** (the short signature, `03` §3.1): it rises 24px with opacity, then its stripe band fills left to right, one step at a time (60ms each). Once per visit.
- Steps appear 40ms apart after the card lands.
- Nothing else moves. Reduced motion and data saver: the card is simply present.

## 8. Components

- **Used:** `MinimalShell` (header with one link home; imprint line), `Slip` (sheet variant with `Stripe`), `Button`, `TextLink`, `Figure`.
- **New:** `VisitCard` (opaque card on a full-bleed photograph, with a phone overlap mode); `AuthAwareAction` (shared tiny island: signed-out label and target, swapped after auth resolves).
- **Data:** `lib/public/ios-page.ts` (copy and steps); `getMobileAppLinks()` for the redirect.

## 9. SEO

- **Title:** "AcadeGrade on iPhone | AcadeGrade".
- **Description:** "AcadeGrade works on iPhone in Safari. Add it to your Home Screen and it opens like an app, with your GPA, CGPA, transcripts and timetables. Free." (148 characters)
- **Canonical:** `/app/download/ios`.
- **Robots:** indexable (it answers a real search, "AcadeGrade iPhone"), but not in the sitemap, following `04` §6's list. Owner may choose `noindex` instead (§13).
- **Open Graph:** the card on the gate photograph with the h1.
- **JSON-LD:** none.

## 10. Accessibility

- One h1; the steps are an ordered list; the pointer text is part of each item.
- The photograph is decorative here (`alt=""`): the place is credited in the imprint and adds no information the page needs. Text never sits on the photograph; the card is opaque.
- The "···" glyph in the note is followed by its name in words for screen readers ("the More button").
- Focus order: shell link, card content, button, links, imprint.
- Touch targets: button 52px; links at least 44px tall.

## 11. Carried over, replaced and removed

| Today | In the redesign |
|---|---|
| Redirect to `iosUrl` when set | Kept, now inside `try/catch` |
| "iOS is coming soon" / "We are preparing the AcadeGrade iPhone experience. Please check back soon." | Removed. "AcadeGrade works on your iPhone." with the Home Screen steps |
| "AcadeGrade mobile" eyebrow, `Smartphone` icon tile, rounded card with shadow | Removed; the minimal shell and a paper slip card |
| "Download Android instead" primary button | A text link "Have an Android phone? Get the Android app" → `/app` |
| No shell, no metadata | Minimal shell; title, description and canonical |

## 12. Acceptance checklist

- [ ] With `iosUrl` set, the route redirects; with it empty, or with Firestore unreachable, the page renders (unit tests for all three).
- [ ] No "coming soon", "soon", "preparing" or date anywhere on the page.
- [ ] Following the four steps on a real iPhone (Safari) adds an icon titled "AcadeGrade" that opens without Safari's bars (needs §5.2).
- [ ] Phone (390×844): the h1, the sentence and the first steps are on the first screen.
- [ ] `inspect.mjs`: 0 FAIL at 1440/768/390, light and dark; Lighthouse mobile ≥ 90 ×4.
- [ ] Signed-in visitors see **Open dashboard** without a layout shift.

## 13. Open items for the owner

1. Approve the manifest and `appleWebApp` changes in §5.2 (they affect every Home Screen install, Android Chrome included).
2. Choose indexable (planned) or `noindex` for this page.
3. Check the four steps on your own iPhone's iOS version and tell us if Safari's labels differ.
