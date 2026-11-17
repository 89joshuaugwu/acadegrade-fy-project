# Page plan · Delete your account (`/account-deletion`)

Inherits `01`–`04` and follows the structure of `pages/home.md`. Anything not stated here follows those files.

## 1. Purpose

- **Mode:** Read (`04` §1). This is also AcadeGrade's **Google Play data-deletion page**: the URL is given in the Play Console and must, on its own, name the app and its developer, explain how to request deletion (including without the app), and say what is deleted, what is kept and for how long. Every fact on today's page is kept (§11 maps each one).
- **Visitors:**
  - a student who wants to leave, usually on a phone, often arriving from the Play listing or from the app;
  - a student who cannot sign in and still wants their data gone;
  - a Google Play reviewer.
- **First question:** "How do I delete my account, and what happens to my data?" Answer within five seconds: *the steps for Android and the web are on the first screen, and the page says it is permanent.*
- **One action:** **Go to Settings** (signed-in deletion on the web). The Android steps are text, because they happen in the app.
- **Secondary:** "Can't sign in?" and "What is kept, and for how long" (in-page links), Download my data, the Privacy notice.

## 2. The argument (each section exists because of one claim)

| # | Claim | Proof on the page | Section |
|---|---|---|---|
| 1 | You can delete your account yourself, in a minute, on either platform | The exact steps for the Android app and the website, with the real button names | How to delete (`#how-to-delete`) |
| 2 | Everything tied to you is deleted | The full list, taken from the deletion code | What is deleted (`#what-is-deleted`) |
| 3 | What stays, stays briefly and for a stated reason | Each kept item with its period and its reason | What may be kept (`#what-is-kept`) |
| 4 | Even without signing in, you can have it deleted | The four steps of the request route, with the 21-day promise | Can't sign in? (`#cannot-sign-in`) |

## 3. First screen

### Desktop (1440×900)

- **Blueprint:** `how-it-works-itinerary-on-a-slip` (Itinerary on a slip): the deletion steps are printed as a receipt.
- **Ground:** `--pg-ground`; the slip stands on a `--pg-ground-2` field that fills columns 7–12 to the right edge of the viewport and runs from the section top to 64px below the slip (the blueprint's "contrasting flat ground").
- **Left, columns 1–6** (top-aligned with the slip, 64px below the header):
  - the **h1** at `--pg-head` (64px), two lines: "Delete your" / "AcadeGrade account" (`text-wrap: balance`);
  - 24px below, the sentence at lead, held to 36ch: "You can delete your AcadeGrade account and its records at any time, in the Android app or on the web. Deletion is permanent and cannot be undone.";
  - 32px below, the primary button **Go to Settings**;
  - 20px below, two text links on one line: "Can't sign in?" (`#cannot-sign-in`) and "What is kept, and for how long" (`#what-is-kept`);
  - 40px below, at small in soft ink, the Play line: "For the AcadeGrade Android app and the AcadeGrade website, operated by Joshua Chimaobie Ugwu, Enugu State, Nigeria."
- **Right, columns 7–11:** the receipt slip (`Slip` variant `receipt`), 460px wide, straight top edge, zigzag bottom edge (`zigzag(n, 10px)`), on paper:
  - **Header,** centred: the AcadeGrade mark (24px); "How to delete your account" at lead; meta at small: "Android app and website".
  - **Group "In the Android app"** (an h3 at body weight 500, 28px above it), an `<ol>` at body with soft-ink decimal markers, 12px between steps:
    1. Open AcadeGrade and sign in.
    2. Go to the Profile tab.
    3. Tap **Delete Account** and confirm.
  - **Group "On the website":**
    1. Sign in to AcadeGrade. (link "Sign in" → `/login?next=%2Fsettings%23delete-account`)
    2. Open Settings.
    3. Under Danger Zone, choose **Delete**.
    4. Type DELETE, then confirm with your password, or with Google if you signed in with Google.
  - **The final inverted row:** a full-width ink bar, 44px, paper text: "Your account and its records are deleted" at the left and "permanent" at the right, with a leader of 4px round dots between (the slip's one leader, on its result line).
  - **Slip foot** (small, on paper, above the zigzag): "Want a copy first? Use Download my data in Settings → Privacy & AI choices before you delete." (link → `/settings#privacy`)
- **Above the fold at 900px:** header 72 + 64, then the h1, sentence, button and links on the left; on the right the slip's header, both groups and the final row (the slip is about 620px tall and ends at about 760px).
- **UI labels** ("Delete Account", "Danger Zone", "Delete", "DELETE") are quoted exactly as the apps show them today and set at weight 500, not in quotation marks; if the apps rename them, this page changes with them (a test pins the labels against the source strings).

### Phone (390×844)

- The h1 at head (32px), two lines; the sentence at body; **Go to Settings** full width (52px); the two links stacked; the Play line at small.
- The slip follows full width inside the 16px margins on its `--pg-ground-2` field (full bleed behind it), keeping the zigzag; steps wrap under their numbers; the final row stays a full-width bar.
- **Budget:** header 60 + 40 + h1 64 + 24 + sentence about 100 + 24 + button 52 + 16 + links 56 + 24 + Play line 40 = about 500px; the slip header and the Android steps start on the first screen (the Android group is what most Play visitors need).

### Why this works

- **Fast:** both sets of steps are visible without scrolling on desktop, and the Android steps on a phone.
- **Specific:** a receipt for deleting your record, printed on the same paper as the result slip, with the outcome on its bottom line.

## 4. Copy deck (final wording; sentence case; checked against the two-line rule)

- **h1:** "Delete your AcadeGrade account" (30 characters; two lines of 11 and 18). The app name stays in the h1 for Google Play.
- **Sentence:** kept word for word from today (above).
- **Button:** "Go to Settings" (signed in or not; signed-out visitors pass through sign-in and land on the Danger Zone).
- **Links:** "Can't sign in?", "What is kept, and for how long".
- **Play line:** "For the AcadeGrade Android app and the AcadeGrade website, operated by Joshua Chimaobie Ugwu, Enugu State, Nigeria." (OWNER TO CONFIRM the developer name matches the Play listing exactly.)
- **Slip header:** "How to delete your account" / "Android app and website".
- **Section headings** (h2):
  1. "How to delete your account" (visually hidden: the slip header carries it; the h2 wraps the slip so the outline has it)
  2. "What is deleted"
  3. "What may be kept for a while, and why"
  4. "Can't sign in? Reset your password first."
- **Deletion subject** (`DELETION_SUBJECT`): "Account deletion request", on every `mailto:` link of this page.
- Section body copy is written inside §5.

## 5. Sections

### 5.1 How to delete (`#how-to-delete`; blueprint `how-it-works-itinerary-on-a-slip`)

- **Composition and steps:** see §3.
- **Go to Settings:** links to `/settings#delete-account`. Signed out, the student layout sends the visitor to `/login`; with the `next` parameter (see §8) they come back to the Danger Zone after signing in.
- **States:** none load from the network. The page is a server component (`getContactEmail()` only), `export const revalidate = 300`.

### 5.2 What is deleted and what may be kept (`#what-is-deleted`, `#what-is-kept`; blueprint `list-printed-menu-sheet`)

- **Ground:** a full-bleed `--pg-ground-2` field.
- **The sheet:** one paper panel 640px wide, centred, square corners, top and bottom edges cut into shallow scallops, 64px padding, set centred like a printed card: group names centred, items left with values right-aligned on a 480px measure (tabular figures), a one-line description at small in soft ink under an item where it explains why. Alignment alone links an item to its value; no leaders. 56px between the groups.
- **Group 1, h2 "What is deleted"** (at lead, centred). Items at body, 14px apart, no values:
  1. Your profile: name, email, matriculation number, institution, programme and profile photo
  2. All semesters, courses, scores and grades
  3. Saved AI analysis, forecasts and notifications
  4. Share links and course share codes you created
  5. Your coin balance and coin history
  6. Verification codes, sign-up records and rewarded-ad records linked to your account
  7. Request and security records linked to your account
  8. **New:** Your timetables
  9. **New:** Help and support requests you sent
  10. **New:** Reports you made about AI answers
  11. **New:** Suggestions you sent for the university and course lists
  12. Your sign-in account itself

  Items 1–7 and 12 are today's list, word for word. Items 8–11 are added because `lib/user/account-deletion.ts` already deletes them (`users/{uid}/timetables`, `support_tickets`, `_ai_feedback`, `_academic_catalog_suggestions`); OWNER TO CONFIRM before publishing (§13).
- **Group 2, h2 "What may be kept for a while, and why"**, items with their period and reason:

| Item | Value (right) | Description (small) |
|---|---|---|
| Proof that the deletion happened | kept | A record that a deletion happened, without your user ID, so we can show the request was completed. |
| Backups | up to 30 days | Copies in backups, until they are overwritten. |
| Hosting provider logs | under its own rules | Request logs held by our hosting provider, under its own retention rules. |
| AI provider logs | up to 55 days | Request logs held by AI providers you used; some keep abuse-monitoring logs for up to 55 days, under their own retention rules. |
| Profile photo | up to 30 days | Your profile photo on our image service, where automatic removal is not available. |
| Messages already delivered | already sent | Emails and push notifications that were already delivered to you. |
| Information the law requires | only as long as needed | Information we must keep by law or to deal with fraud or a dispute, only for as long as needed. |

  Every row is one of today's six bullets (the hosting and AI logs bullet is split into two rows so each has its own period); the words of each fact are unchanged.
- **Closing lines,** centred at small, 40px below the last item: "Anyone who already opened or saved a share link may still have what they saw. The link itself stops working." / "Deletion is permanent and cannot be undone."
- **Phone:** the sheet spans the width with 16px of the field showing at each side and 24px padding, scallops kept; the measure is the full inner width; values stay right-aligned on the item's first line; long items wrap; descriptions sit under the item.

### 5.3 Can't sign in? (`#cannot-sign-in`; blueprint `how-it-works-lines-that-step-across`)

- **Ground:** `--pg-ground`.
- **The staircase:** an `<ol>` of four stages. Each stage is one line at `--pg-head` (64px), weight 500, leading 1.0, starting two columns further right than the one before (grid columns 1, 3, 5, 7), with a sentence of up to 40ch at body in full ink (it carries instructions, so it is not set in the blueprint's soft ink), 12px beneath, on that line's left edge. 56px between stages. The columns left of the last stage stay empty.
  1. **h2 line:** "Can't sign in? Reset your password first." Sentence: "Choose Forgot password? on the sign-in page. We email you a code that expires after 5 minutes." ("Forgot password?" → `/forgot-password`)
  2. **"Still locked out? Write to us."** Sentence depends on the contact route (below).
  3. **"We check it's really you."** "We confirm the request comes from the account holder before deleting anything. Never send us your password or a verification code."
  4. **"Done within 21 days."** "We complete the deletion within 21 days." A 6px gold bar, 120px wide, sits under this line as the page's single accent (a fill; gold is never text).
- **Stage 2, by contact route** (`getContactEmail()`: admin, then env, then none):
  - **Email set:** "Email {email} with the subject "Account deletion request" and the email address on your account." The address is a `mailto:` link with that subject (`LegalContact`).
  - **No email, public request form live** (see `support.md` §8): "Send us a request without signing in, from the address on your account. Choose "Privacy or my data"." Link → `/support?locked=1#request`, which opens the support coupon's locked-out route directly.
  - **No email and no public form:** not allowed in production (release gate, §12). Google Play requires a way to request deletion without the app.
- **Foot,** under stage 4 on its left edge, at small: "More about your data and rights is in the Privacy notice." (→ `/privacy`)
- **Phone:** lines at head (32px), wrapping to two lines; the staircase indent becomes 6vw per stage (stage 4 starts 18vw in); sentences at body on the same indent; 40px between stages.

### 5.4 Footer

The shared `PublicFooter`; its "Help and legal" group lists "Delete your account" with `aria-current="page"`.

## 6. Imagery for this page

- **None in the content area;** only the footer stamp. Someone deleting their account does not need a picture, and the page must load fast on any connection for a Play reviewer. The tasteskill floor of four pictures is waived and recorded as a defended exception in the inspector report.
- **Drawn in code:** the receipt slip (zigzag, header, inverted row), the sheet (scallops), the gold bar.

## 7. Motion on this page

- **Entrances only.**
- **Load:** the receipt slip is laid down (rise 24px with opacity, 640ms); its rows appear in order 40ms apart (the `03` §3.1 short version without a stripe band); the final ink row lands last. The h1 and steps are in the HTML and readable on the first frame.
- **Sheet:** rises as a whole; its two groups' items fade in 30ms apart.
- **Staircase:** each stage's line enters from 24px lower, 90ms after the one before, as the section reaches 15% visibility; the gold bar grows from 0 to 120px with `scaleX` (320ms) after line 4. Reduced motion: shown in place.
- **Deep links:** `/account-deletion#cannot-sign-in` (used by support and Play) lands with the section already settled.
- **Count:** about 30 moving elements. Reduced motion and data saver: no travel.

## 8. Components

- **Used:** `PublicHeader`, `Slip` (`receipt` with zigzag; the sheet with scallops, as on the legal pages), `Button`, `TextLink`, `Reveal`, `LegalContact` (moved to `components/public/`), `PublicFooter`, `CookieStub`.
- **Data:** `lib/public/account-deletion.ts` holds the steps, the deleted list, the kept table, the staircase copy and `DELETION_SUBJECT`. A unit test checks the deleted list against the collections removed in `lib/user/account-deletion.ts` (a list kept beside that function), so a new collection added to deletion fails the test until the page says so.
- **Server:** `getContactEmail()` only. No Firestore read of its own.
- **Dependencies elsewhere (built with this page):**
  - **Settings anchor:** add `id="delete-account"` and `scroll-mt-24` to the Danger Zone block in `app/(student)/settings/page.tsx`; the page's existing hash effect scrolls to it once the profile loads.
  - **Return after sign-in:** `/login?next=` for same-site paths (owned by `pages/login.md`); this page uses `next=/settings#delete-account`.
  - **Public request route:** either a contact email in production or the public request form (`support.md` §8, `/support?locked=1#request` opens it).
- **Kept as is:** `app/api/user/delete-account/route.ts` and `lib/user/account-deletion.ts` (not touched by this page).

## 9. SEO

- **Title:** "Delete your account" (renders as "Delete your account | AcadeGrade"; today's "Delete your AcadeGrade account" renders with "AcadeGrade" twice). The h1 keeps the app name.
- **Description:** "Delete your AcadeGrade account on Android or the web: the steps, what is deleted, what is kept for a short time and why, and what to do if you can't sign in." (157 characters; today's is 174)
- **Canonical:** `/account-deletion` (the URL registered in the Play Console; never change it).
- **Open Graph:** the receipt slip with the h1, on the ground.
- **JSON-LD:** `WebPage` with `name`, `inLanguage: "en-NG"`, `publisher` = the home `Organization` @id. No `HowTo` (no longer shown as a rich result).
- **Headings:** one h1 and the four h2s; the slip's groups are h3.
- **Indexing:** indexed and in the sitemap (unchanged).

## 10. Accessibility

- **Steps:** real `<ol>`s under h3s ("In the Android app", "On the website"); screen readers hear "list, 3 items". UI labels are wrapped in `<span class="ui-label">` at weight 500 so they read as the words they are.
- **Final row:** the dot leader is `aria-hidden`; the row reads "Your account and its records are deleted, permanent."
- **Sheet:** two `<ul>`s under their h2s; in the kept list each item is a `<dl>` row (`<dt>` item, `<dd>` period, `<dd>` reason), so "Backups, up to 30 days, copies in backups until they are overwritten" is read in order.
- **Staircase:** an `<ol>` whose first item holds the h2; the visual indent does not change reading order.
- **Links:** "Can't sign in?" moves focus to the section's h2 (`tabindex="-1"` on the target).
- **Contrast:** ink on paper 16.6:1; soft ink on paper 8.3:1; paper on the ink row 16.6:1; the gold bar is decorative.
- **Targets:** button 52px; inline links have a 44px hit area.

## 11. Carried over, replaced and removed

| Today | In the redesign |
|---|---|
| Metadata title "Delete your AcadeGrade account", 174-character description | Title "Delete your account" (template adds AcadeGrade), 157-character description; same canonical |
| `EditorialHero` with h1, sentence, "Go to Settings" (`/settings`), and "Email a deletion request" / "Get help from support" | h1 and sentence word for word; **Go to Settings** → `/settings#delete-account` via sign-in; email moved to the Can't sign in route; the Play line added |
| Two icon cards: Android (Open and sign in; Profile tab; Delete Account and confirm) and web (Sign in; Settings; Danger Zone, Delete, confirmation, password if asked) | The receipt slip with the same steps; the web confirmation made exact from the Settings code ("Type DELETE", password or Google confirmation) |
| "Want a copy first? Use Download my data in Settings → Privacy & AI choices before you delete." | The slip foot, with a link to `/settings#privacy` |
| "What is deleted": eight items with red trash icons | The sheet's first group: the same eight items word for word, plus four the code already deletes (owner to confirm); no icons |
| "What may be kept for a while, and why": six bullets (deletion record; backups 30 days; hosting and AI provider logs, up to 55 days; profile photo up to 30 days; delivered emails and notifications; legal or fraud holds) | The sheet's second group, one row each with its period on the right (the logs bullet split into two rows, same words) |
| "Anyone who already opened or saved a share link may still have what they saw. The link itself stops working." | Closing line of the sheet, word for word |
| "Can't sign in?": reset password (`/forgot-password`); contact with subject "Account deletion request" and the account email; verified, completed within 21 days; never send password or code; Privacy notice link | The four-stage staircase with every one of those facts, plus the code expiry (5 minutes); the contact route keeps `LegalContact` and `DELETION_SUBJECT` |
| `LegalContact` fallback "the AcadeGrade support page" when no email | Replaced on this page by the public request route (or blocked by the release gate); `LegalContact`'s own fallback is unchanged elsewhere |
| `PublicPage`, Bricolage headings, lucide `Smartphone`, `Globe`, `Trash2` | Public shell, Hanken, no icons |
| h2 ids `how-title`, `what-title`, `kept-title`, `cannot-sign-in-title` | Stable section anchors `#how-to-delete`, `#what-is-deleted`, `#what-is-kept`, `#cannot-sign-in` (no internal links use the old ids; checked with grep) |

## 12. Acceptance checklist

- [ ] **Google Play:** the page names the app (AcadeGrade) and the developer exactly as on the Play listing; shows the in-app steps; shows a way to request deletion without the app; lists what is deleted and what is kept with periods; and matches the Play Data safety answers.
- [ ] **Release gate:** stage 2 of "Can't sign in?" always offers a working route (email set, or the public form live); production with neither fails a check and shows a warning in Admin.
- [ ] Every fact in §11's left column appears on the page (a test asserts the strings: "30 days", "55 days", "21 days", "Account deletion request", "Download my data", "Danger Zone", "Delete Account", "cannot be undone").
- [ ] The deleted list matches `lib/user/account-deletion.ts` (test).
- [ ] **Go to Settings** signed out → sign in → lands on the Danger Zone; signed in → lands there directly.
- [ ] Phone: the h1, sentence, button and the start of the Android steps are on the first screen at 390×844 with the cookie stub open.
- [ ] Deep link `#cannot-sign-in` lands below the header, settled.
- [ ] No red icon list, pills, icon cards, gradients, glass, shadows at rest, monospace or 01/02 numbering; `inspect.mjs` 0 FAIL at 1440/768/390, light and dark; image-floor WARN defended.
- [ ] Lighthouse mobile ≥ 90 ×4.

## 13. Open items for the owner

1. **Play developer name:** confirm the exact developer name on the Google Play listing (for the Play line and to match the Console).
2. **Four additions to "What is deleted"** (timetables, support requests, AI answer reports, catalogue suggestions): the code deletes them today; confirm you want them listed (recommended: the list should be complete).
3. **Reminders on the phone:** when an account is deleted in the Android app, confirm that timetable reminders already scheduled on the device are cancelled. If not, either cancel them on deletion or add "Reminders already set on your phone" to "What may be kept".
4. **Unfinished deletions:** `lib/user/account-deletion.ts` stops after a bounded amount of work per collection and only logs what remains (`report.truncated` in `app/api/user/delete-account/route.ts`). To keep the 21-day promise for every account, add a follow-up job that finishes truncated deletions, or confirm the bound is never reached in practice.
5. **Contact route:** set the contact email or approve the public request form (same decision as `support.md` §13, items 1–2). This page cannot pass the Play requirement without one of them.
6. **In-app deletion timing:** the page promises 21 days only for requests by email. If you want to say how quickly in-app deletion completes ("straight away"), confirm it and the sentence will be added to the slip's final row.
