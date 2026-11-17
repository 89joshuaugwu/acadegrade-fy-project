# Page plan · Shared course list (`/c/[code]`)

A restyle. The lookup, the kill switch, the privacy filter, the cache and the three ways in from `app/(public)/c/` stay as they are; only the look, the copy, the layout and the states change, plus one fix the brief asks for: the Android deep link is offered only on Android. It inherits `01`–`04`, uses the `MinimalShell` from `share-transcript.md` §8.1, and follows the structure of `pages/home.md`.

## 1. Purpose

- **Mode:** System/Operate. **Shell:** Minimal.
- **Visitor:** a classmate who got a six-character code or link on WhatsApp ("use ABC123 for this semester's courses"), usually on an Android phone, sometimes without an AcadeGrade account yet.
- **First question:** "Are these my courses, and how do I get them into my record?" Answer: the list itself, the totals, and one button that fits their device.
- **One action:** on Android, **Open in the Android app**; everywhere else, **Import on the web**. The other ways are text links.

## 2. The argument (each block exists because of one claim)

| # | Claim | Proof on the page | Block |
|---|---|---|---|
| 1 | These are the courses your classmate shared | The course slip: code, title, units, totals | The slip |
| 2 | Nothing private travels | "Only codes, titles and units are shared. Scores stay private." | Slip foot |
| 3 | Nothing is added without you | "You'll check each course before it's added." | Under the action |
| 4 | There is a way in from your device | Android: the app link; elsewhere: web import; no account: create one | Actions |

## 3. First screen

### Desktop (1440×900)

- **MinimalShell header**, then on the ground a centred slip 640px wide (Slip `result` variant without grade columns):
  1. Stripe band 40px.
  2. Centred header: mark (24px), h1 "Shared course list" at lead, then the code on its own line at head in tabular Hanken Grotesk with 0.08em tracking ("ABC123"; today in Geist Mono), then the meta line at small: "Shared by a classmate · 8 courses · 22 units".
  3. The table (Code, Course title, Units), body size, rows 48px, units right-aligned.
  4. A perforation, then the foot bar (ink, paper text): "Total" and "22 units".
  5. Under the foot bar, on the slip: the privacy line at small, the primary button at full slip width, its hint, and the text links (§5.3).
- A list of up to about 9 courses fits above the fold at 1440×900 with the button; longer lists scroll, and the button stays at the slip's foot (no sticky bar).

### Phone (390×844)

- Header 60px; the slip full width inside 16px margins, padding 20px, stripe 32px. The code at 40px.
- Table rows become two lines: code (weight 500) and units on line 1, the title on line 2 at small in ink. Nothing is dropped.
- The primary button full width at the slip's foot, then the text links stacked. For long lists, the meta line carries an extra text link "Jump to import" (an anchor to the actions) so the button is one tap away.

### Why this works

- It is the course form students fill every semester, already filled in for them.
- The device decides the button, so nobody presses a link that does nothing.

## 4. Copy deck (final wording; sentence case)

- **Title (tab):** "Shared course list" (kept).
- **h1:** "Shared course list"; the code below it.
- **Meta:** "Shared by a classmate · {n} course(s) · {n} unit(s)" (singular and plural via the existing `plural` helper).
- **Table caption** (visually hidden): "Courses in this shared list" (kept).
- **Foot bar:** "Total" · "{n} units".
- **Privacy line:** "Only course codes, titles and units are shared. Scores stay private."
- **Android actions:** primary "Open in the Android app"; hint "Opens the app and asks you to check each course before it's added."; text links "Import on the web instead" and "Don't have the app? Get it for Android".
- **Other devices:** primary "Import on the web"; hint "You'll sign in first, then check each course before it's added."; text links "Create a free account" and "Get the Android app".
- **States:** §5.4.

## 5. Sections

### 5.1 The course slip

- **Data carried:** `loadSharedCourseList(code)` on the server: code normalised to six letters and digits (`normaliseImportCode`), the `share_code` kill switch checked first, `shareCodes/{CODE}` read with the Admin SDK, `disabled === true` or no usable courses read as not found, and only `code`, `title` and `units` kept (`publicCourses`, max 100 rows, code 16 characters, title 140, units 0–6). `revalidate = 300` kept.
- **Table:** a real `<table>` with `<th scope="col">` "Code", "Course title", "Units"; row rules 1px inside the table; tabular figures; units right-aligned; a title that is empty prints a grey dash.
- **Totals:** computed from the rows (`totalUnits` as today); the foot bar and the meta line use the same variable.

### 5.2 Privacy line

On the slip, under the foot bar, at small in ink: §4. It replaces the long sentence under today's h1.

### 5.3 Actions (`ImportActions`, client island)

- **Device rule (new, the brief's fix):** Android is detected on the client: `navigator.userAgentData?.platform === 'Android'` or `/Android/i.test(navigator.userAgent)`. The server renders the "other devices" set (so the page stays cacheable for five minutes); after hydration an Android visitor gets the Android set. Both sets have the same shape (one 52px button, one hint line, two text links), so the swap causes no layout shift.
- **Android set:**
  - **Open in the Android app** → `androidImportLink(code)` = `acadegrade://import-code?code=ABC123` (kept).
  - "Import on the web instead" → `webImportPath(code)` = `/results?importCode=ABC123`, calling `rememberPendingImportCode(code)` first (kept).
  - "Don't have the app? Get it for Android" → `/app` (the install page; `/app/download/android` stays the direct APK redirect).
- **Other devices** (desktop, iPhone, unknown):
  - **Import on the web** → `/results?importCode=ABC123`, remembering the code first (kept).
  - "Create a free account" → `/register` (kept). Recommended addition: remember the code here too, so a new student who registers first still finds the list waiting in Results within 24 hours (owner decision, §13).
  - "Get the Android app" → `/app`.
- **Why the deep link is hidden off Android:** today it is the primary button on every device, and on desktop and iPhone it does nothing.

### 5.4 States (each a `stub` slip centred on the ground, with an h1, one sentence and one action)

| Status | h1 | Sentence | Action |
|---|---|---|---|
| `paused` (`share_code` switched off) | "Course sharing is paused" | "Sharing and importing course lists is switched off for a short while. Try this link again later." | Primary **Back to AcadeGrade** (`/`) |
| `unavailable` (Firestore read failed) | "We couldn't load this list" | "Something went wrong while reading the list. Check your connection and try the link again." | Primary **Try again** (reloads the page); text link "Back to AcadeGrade" |
| `invalid` or `not_found` | "This code isn't available" | "It may have been typed wrongly, or your classmate may have stopped sharing it. Ask them to send it again." | Primary **Back to AcadeGrade** |

- Copy carried with small fixes: today's headings are "Course code sharing is paused", "We could not load this list" and "This code is not available" (tests match `/Course code sharing is paused/`, `/could not load/i` and `/This code is not available/`; update the first and last, keep "could not load" matching by writing "couldn't load" with a test regex `/couldn.t load/i`).
- The paused state can lag the admin switch by up to five minutes on a cached page (`revalidate = 300`) plus the 30-second settings cache. Existing behaviour; noted for the admin help text.

## 6. Imagery for this page

- None. The slip is the object; a System page with one job. Image-floor WARN defended.

## 7. Motion on this page

- The short "laid down" move for the slip (rise 16px and stripe fill), once per load.
- The device swap on Android happens before the slip finishes its entrance, so it is never seen as a change.
- Reduced motion: no movement.

## 8. Components

- **Used:** `MinimalShell`, `Slip` (`result` variant, grade columns off; `stub` for states), `Stripe`, `Button` (as a link), `TextLink`.
- **Changed:** `ImportActions` gains the device rule and the two sets; `isAndroidDevice()` goes in `app/(public)/c/import-link.ts` as a pure helper (with a test for both user-agent forms).
- **Removed:** `Shell` and `Notice` local components (replaced by `MinimalShell` and the stub), the `public-atmosphere` background, `PublicHeader` / `PublicFooter` (thin shell), `LinkButton` outline and ghost variants on this page.

## 9. SEO

- **Robots:** noindex, nofollow, nocache, noimageindex (kept). Not in the sitemap.
- **Title:** "Shared course list"; **description:** "A course list shared by a classmate on AcadeGrade." (kept).
- **Open Graph:** the generic slip image ("Shared course list"), never the code or the courses.

## 10. Accessibility

- One h1; the code is part of the heading block with an accessible name "Code ABC123".
- Real table with a caption and column headers; two-line phone rows keep their header association.
- The primary is a link styled as a button (it navigates); the hint is linked to it with `aria-describedby`.
- On Android the deep-link button's name says where it goes: "Open in the Android app".
- 44px targets for every link.

## 11. Carried over, replaced and removed

| Today | In the redesign |
|---|---|
| Thin `PublicHeader` + `PublicFooter` on the atmosphere background | `MinimalShell` |
| Eyebrow-like line "Shared by a classmate" above the h1 | Moved into the meta line under the code |
| Code in Geist Mono | Tabular Hanken Grotesk, tracked |
| Plain table with divided rows | The course slip with a totals foot bar |
| "Open in the Android app" as the primary on every device (dead on desktop and iPhone) | Only on Android; elsewhere "Import on the web" leads |
| Three buttons (primary, outline, ghost) | One button and two text links |
| Notice pages with an outline "Back to AcadeGrade" button | `stub` slips with one primary action |
| Lookup, privacy filter, kill switch, cache, pending-code memory, deep-link format, web import path | Unchanged |

## 12. Acceptance checklist

- [ ] Android user agent: primary is the `acadegrade://import-code?code=` link; "Import on the web instead" remembers the code.
- [ ] Desktop and iPhone: no deep link anywhere on the page; "Import on the web" remembers the code and goes to `/results?importCode=`.
- [ ] Only code, title and units appear in the HTML (no scores, no owner fields).
- [ ] `share_code` off shows the paused slip; invalid, disabled and unknown codes show "This code isn't available".
- [ ] Totals in the meta line and the foot bar agree.
- [ ] No layout shift when the Android set swaps in (CLS under 0.05 on an Android emulation).
- [ ] `inspect.mjs` 0 FAIL at 1440/768/390, light and dark.
- [ ] `share-code-link-page.test.tsx` updated: the Android link test sets an Android user agent; a new test asserts no `acadegrade://` link for a desktop user agent; state heading regexes as in §5.4.

## 13. Open items for the owner

1. Remember the code on "Create a free account" too (one call to `rememberPendingImportCode`), so a student who registers first still gets the list in Results? Recommended: yes.
2. On Android, if the app is not installed, the deep link does nothing. The page always shows "Don't have the app? Get it for Android" under it; a timed fallback ("Nothing happened?") is possible but not planned. Confirm that is enough.
