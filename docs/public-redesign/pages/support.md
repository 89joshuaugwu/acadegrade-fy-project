# Page plan · Support (`/support`)

Inherits `01`–`04` and follows the structure of `pages/home.md`. Anything not stated here follows those files.

## 1. Purpose

- **Mode:** Read (`04` §1), with one task built in: sending a request.
- **Visitors:**
  - a student who is stuck: a verification code that has not arrived, a forgotten password, a CGPA that looks wrong, a scanner that missed a row, a link a sponsor cannot open;
  - a student who wants a copy of their data or to delete their account;
  - someone who cannot sign in at all.
- **First question:** "How do I get this fixed, fast?" Answer within five seconds: *send a request from your account and we reply in your inbox and by email; most problems have a one-minute fix below.*
- **One action:** **Send a request** (the in-app support inbox: `POST /api/support/tickets`). Signed out, the same place reads **Sign in to send a request**.
- **Secondary:** the quick fixes on the page, the support email when one is set, the password reset, and Delete your account, as text links only.
- **What changes today:** the page stops being "read the guidance, then email us" and becomes the front door of the support inbox that already exists in Settings (web) and Profile (Android). It no longer exposes unfinished states ("Our support email address will be published on this page") or developer jargon ("Firebase token"), and "Explore product guides" (which went to `/features`) is removed.

## 2. The argument (each section exists because of one claim)

| # | Claim | Proof on the page | Section |
|---|---|---|---|
| 1 | Getting help takes one short message | The request form itself (or the sign-in that leads to it), and where the reply arrives | Request coupon (`#request`) |
| 2 | Most problems are fixed in a minute without waiting for anyone | Fourteen real problems answered in plain text, all visible at once | Quick fixes (`#quick-fixes`) |
| 3 | A good request gets a fast answer, and your account stays safe | What to include for each request type, and what never to send | Before you write (`#before-you-write`) |
| 4 | You can see what happens to your request | The three statuses and how long requests are kept | Before you write, foot |
| 5 | If you are still stuck, the way back is one tap | A plain closing line and the action | Still stuck |

## 3. First screen

### Desktop (1440×900)

- **Blueprint:** `contact-clip-out-coupon` (Clip-out coupon form), adjusted.
- **Ground:** `--pg-ground`. 64px of ground between the header and the coupon (the blueprint's 120px is shortened so the whole coupon sits on the first screen; deliberate), 120px below it.
- **The coupon:** one filled paper panel (`--pg-paper`, not the blueprint's strong colour: paper is the only surface that stays distinct on both the day and the night desk, and the `Field` styles of `02` §4.8 are designed for paper), columns 2–11 (about 1130px), 2.2:1 (about 513px tall), square corners (the blueprint's 14px radius is replaced by the page's single radius, 0).
  - Semicircular notches 28px across are cut into its top and bottom edges at the 46% mark (`clip-path`), and a vertical row of round dots (a 5px dotted `border-left` in `--pg-ground`) joins them as the perforation.
  - **Left of the perforation** (48px padding): at the top, the **h1** "Tell us what went wrong." at `--pg-head` (64px), two lines ("Tell us what" / "went wrong."). At the bottom, one sentence at body: "Most problems take a minute to fix with the quick fixes below. If yours does not, send us a request." Under it, at small in soft ink: "Using the Android app? Profile → Help & support."
  - **Right of the perforation** (48px padding): the request panel, whose content depends on the visitor's state (§5.1). Its height is fixed by the coupon, so swapping states never moves the page.
- **Below the coupon** (still in view at 900px): the start of the Quick fixes heading.
- **Budget:** header 72 + 64 + coupon 513 = 649px; the heading of the next section starts at about 769px.

### Phone (390×844)

- The coupon turns upright and spans the width inside the 16px margins. The perforation becomes horizontal: notches on the left and right edges at the perforation, dots across.
- **Above the perforation** (24px padding): the h1 at head (32px), two lines; the sentence at body; the Android line at small.
- **Below the perforation:** the request panel; every field and the submit bar are 54px tall; the bar is full width.
- **Budget (signed out):** header 60 + 16 + top part about 230 + perforation 28 + request panel about 330 = about 664px, so the h1, the sentence and the **Sign in to send a request** bar are on the first screen with the 132px cookie stub open.

### Why this works

- **Fast:** the first screen is the help itself, not a promise of help; a signed-in student can send a request without leaving the page.
- **Specific:** it is a coupon you fill in and tear off, the stationery way of "write to us", and the reply goes to the AcadeGrade inbox the student already has.

## 4. Copy deck (final wording; sentence case; checked against the two-line rule)

- **h1:** "Tell us what went wrong." (24 characters; two lines of 12 and 11)
- **Coupon sentence:** "Most problems take a minute to fix with the quick fixes below. If yours does not, send us a request." (100 characters)
- **Android line:** "Using the Android app? Profile → Help & support." (the Android card's own label)
- **Request panel, signed in:** heading "Send a request" (lead); field labels "What is it about?" (select, first option "Choose one") and "Describe the problem" (textarea, 4 rows); hint "At least 10 characters. Do not include your password or any code we sent you."; submit "Send request" (busy: "Sending…"); foot link "See your requests and our replies" → `/settings#help`.
- **Request panel, sent:** "Sent. We will reply in your AcadeGrade inbox and by email." plus "See your requests and our replies" and "Send another request" (resets the form).
- **Request panel, signed out:** heading "Send a request from your account" (lead); sentence "Signing in lets us see the details we need, and your reply arrives in your AcadeGrade inbox as well as by email."; bar "Sign in to send a request"; links "Forgotten your password? Reset it" (`/forgot-password`) and "Can't sign in at all?" (expands the locked-out route, §5.1).
- **Section headings** (h2):
  1. "Quick fixes"
  2. "Never send your password."
  3. "Still stuck?" (visually hidden; the sentence carries it)
- **Category labels** come from `SUPPORT_CATEGORY_LABELS` in `lib/support/tickets.ts` and are never retyped: "Something is broken", "My account or sign-in", "Grades or CGPA", "AI features", "Ads or coins", "Privacy or my data", "Something else". (OWNER TO DECIDE: "AI features" could read "AcadeMind" to match the brand; the label is shared with Settings and Android, so it changes in one place.)
- Section body copy is written inside §5.

**Wording removed:** "Tell us what is getting in your way." (kept in spirit, shortened), "Explore product guides", "Help us route your request.", "Quick recovery checks", "Keep credentials private." with "… or Firebase token", "Share the error message, route, time, and steps…" (developer wording), "Still need help?" with "Our support email address will be published on this page. Until then…" (unfinished state).

## 5. Sections

### 5.1 Request coupon (`#request`; blueprint `contact-clip-out-coupon`)

- **Composition:** see §3.
- **What the server knows** (the page is a server component, `export const revalidate = 300`):
  - `email = await getContactEmail()` (`lib/site/contact.ts`: admin `config/about.contactEmail`, then `NEXT_PUBLIC_SUPPORT_EMAIL`, then null).
  - `supportOpen = !(await getPlatformSettings()).disabledFeatures.includes('support')` (`lib/platform/settings-server.ts`; on a read error, assume open: the API is the real gate).
- **What the client knows:** `useAuth()` (signed in or not). The server always renders the signed-out panel; the client island `SupportCoupon` swaps in the form after auth resolves, inside the same fixed-height panel (no layout shift, CLS 0).
- **Request panel states:**

| State | Panel shows | Action |
|---|---|---|
| Signed out, support open | "Send a request from your account", the sentence, the two links | **Sign in to send a request** → `/login?next=%2Fsupport%23request` (returns here with the form open; needs the `next` parameter, see §8) |
| Signed in, support open | The form: category select, message textarea with counter (`n / 2000`), hint, foot link | **Send request** (disabled until a category is chosen and the message has 10 to 2000 characters, the same rule as `SupportRequestsCard`) |
| Sending | The form, the bar busy ("Sending…"), fields read-only | none |
| Sent (201) | The confirmation and the two links | "Send another request" (text link) |
| Validation error (400) | The form, the API's message under the bar (`role="alert"`), focus moved to the field it names | Send request |
| Too many requests (429) | The API's message: "You have sent several requests already. Please wait before sending another." | none; the bar is disabled for the `Retry-After` time when the header is present |
| Paused (503 `FEATURE_DISABLED`, or `supportOpen` false) | "Requests are paused for a short while." plus, when an email is set, "You can email {email} instead." | Email set: **Email support** (`mailto:` with subject "AcadeGrade support request"). No email: no bar; the quick fixes below carry the page |
| Server error (500) | "Your request could not be sent. Please try again." (the API's text) | Send request |
| Session expired (401) | "Please sign in again to send your request." The typed message is kept in `sessionStorage` for 30 minutes and restored after sign-in | **Sign in to send a request** |

- **The locked-out route** ("Can't sign in at all?", a `<details>` inside the signed-out panel, so it needs no JavaScript):
  - Always first: "Reset your password from Forgot password on the sign-in page. The code we email you expires after 5 minutes." (link `/forgot-password`)
  - **Email set:** "Still locked out? Email {email} from the address on your account. Never include your password or a code we sent you." (mailto with subject "AcadeGrade support request").
  - **No email set, public form built (recommended, §8):** "Still locked out? Write to us without signing in." opens the public variant of the form in the same panel: "Your email address" (`type="email"`, required), "What is it about?" (only "My account or sign-in", "Privacy or my data", "Something else"), "Describe the problem", **Send request**. Confirmation: "Sent. We will reply to {email}."
  - **No email set and no public form:** not allowed in production. This is a release gate (§12): someone who cannot sign in must always have a way to reach us, and the account-deletion page relies on it for Google Play.
- **Android:** the coupon's line points to Profile → Help & support; the request lands in the same inbox.
- **Under-18 students and maintenance:** both may send requests (the API is open to minors and during maintenance); nothing on this page checks age.

### 5.2 Quick fixes (`#quick-fixes`; blueprint `faq-open-two-column-reading`)

- **Ground:** `--pg-ground-2`, padding `--pg-gap-section`.
- **Layout:**
  - Columns 1–3: the h2 "Quick fixes" at lead, weight 500, top-aligned; under it at small in soft ink "Fourteen common problems, answered."; then, 40px lower, one photograph (3:4, 100% of the column) with its caption at small: "A notice pinned on a board at University College, Ibadan, February 1962."
  - Columns 5–12: the answers in two text columns (`columns: 2; column-gap: 56px`), each about 36ch, at body, leading 1.55. Groups open with a plain h3 at body weight 500 in soft ink, 28px above it. Each item is one paragraph: the question as a run-in at body weight 500 in full ink, ending with its punctuation, then the answer in regular weight on the same line. 20px between paragraphs, `break-inside: avoid`. No toggles, no icons, no boxes: everything is answered at a glance.
- **Items** (final wording; facts checked against the code and the legal texts):
  - **Signing in**
    1. **"My verification code hasn't arrived."** Check your spam and promotions folders and make sure the email address is right. Wait a minute, then ask for one new code. Each code expires after 5 minutes.
    2. **"I've forgotten my password."** Choose Forgot password? on the sign-in page and we will email you a code to set a new one.
    3. **"I signed up with Google."** Choose Continue with Google on the sign-in page and pick the same Google account.
    4. **"The site says it's under maintenance."** AcadeGrade is being updated. Try again in a little while.
  - **Your numbers**
    5. **"My CGPA doesn't match what I worked out."** Check the units and the grade or score of every course, and that every semester is entered. AcadeGrade rounds to two places, half up. You can check one semester by hand with the free calculator. If your handbook uses different bands, the handbook is the final word.
    6. **"A course I failed still shows."** An F stays flagged as a carry-over until you record a pass for the same course.
  - **Scanning and AcadeMind**
    7. **"The scanner missed a row or misread a score."** Use a clear, upright, well-lit photo of the slip, then edit any row before you save. Nothing is saved until you confirm.
    8. **"I can't see AcadeMind or the scanner."** They are for students aged 18 or over who have allowed AI processing in Settings → Privacy & AI choices. You get free uses each day, and on Android you can earn extra uses with coins.
  - **Sharing**
    9. **"Someone can't open my transcript link."** Links expire after 1, 7 or 30 days, as you chose, and may need the PIN you set. If it has expired, create a new link.
    10. **"A course-code link says sharing is paused."** Course sharing is switched off for a short while. Try the link again later.
  - **The Android app**
    11. **"How do I install the Android app?"** Follow the steps on the Android app page.
    12. **"My reminders arrive late or not at all."** Allow notifications for AcadeGrade in your phone's settings and turn off battery saving for the app. Reminders work without data.
  - **Your data**
    13. **"I want a copy of my data."** Go to Settings → Privacy & AI choices and choose Download my data.
    14. **"I want to delete my account."** Follow the steps on Delete your account. If you can't sign in, the same page explains what to do.
- **Links inside answers:** "Forgot password?" → `/forgot-password`; "free calculator" → `/calculator`; "Settings → Privacy & AI choices" → `/settings#privacy`; "Android app page" → `/app`; "Delete your account" → `/account-deletion`.
- **Data:** a typed list in `lib/public/support.ts` (`{ group, question, answer, links }`), which also feeds the FAQPage JSON-LD (exactly the visible items).
- **Phone:** one column at body inside the 16px margins. The h2 leads at lead size; the photograph follows at 60% width on the right margin with its caption to its left; then the groups. 18px between paragraphs. The section runs to about three screens and stays open (no accordion, per the blueprint).

### 5.3 Before you write (`#before-you-write`; blueprint `list-statement-table-pushed-right`)

- **Ground:** `--pg-ground`.
- **Heading:** the h2 "Never send your password." spans the full width on one line at `--pg-head` (the blueprint's 3vw indent on the first line is kept), leading 0.98. 24px below it, at lead in columns 1–7: "We will never ask for your password or for a code we sent you. Tell us what happened instead: the more exact, the faster we can fix it."
- **The table,** 96px below, pushed into columns 8–12; columns 1–7 stay open. One plain word at small in column 7, top-aligned with the first row: "Include". Each row is a two-part line at body with 26px between rows: the category label (exactly as in the form) in soft ink at the left, and what to include in full ink from 40% of the measure. Rows are separated by space only; the fifth row has 44px above it to form two groups.

| Category (from `SUPPORT_CATEGORY_LABELS`) | What to include |
|---|---|
| Something is broken | The page or screen, what you tapped, and what you saw |
| My account or sign-in | The email address on your account |
| Grades or CGPA | The session, the semester and the course code |
| AI features | Which feature, and roughly when you used it |
| Ads or coins | When you watched the ad, and your coin balance before and after |
| Privacy or my data | What you want: a copy, a correction, deletion or an objection |
| Something else | Anything that helps us understand |

- **Foot: what happens next** (columns 8–12, 72px below the table): a small `<dl>` at small, term in full ink weight 500, definition in soft ink:
  - "Sent" · "We have your request."
  - "Answered" · "We have replied. The reply is in your AcadeGrade inbox and your email."
  - "Closed" · "It is done."
  - and one line under it: "Requests are text only. We keep a request until 180 days after it is closed, and delete it straight away if you delete your account." (`SUPPORT_PURGE_AFTER_MS`; `lib/user/account-deletion.ts` deletes `support_tickets`.)
- **The status words** come from `STATUS_TEXT` in `SupportRequestsCard` (`open` → "Sent", `waiting` → "Answered", `closed` → "Closed"), so the page and the inbox always agree.
- **Phone:** the heading at head (32px) on two lines without the indent; the lead at body; the table full width, each row stacking the category above what to include; the "Include" word is dropped (the heading already says it); the foot follows full width.

### 5.4 Still stuck (blueprint `cta-plain-sentence-one-action`)

- **Ground:** `--pg-ground`, at least 30svh of empty ground above the sentence and 20svh below the button before the footer (the page's one deliberate rest).
- **Sentence** at lead (the blueprint's 18–22px), in full ink, no wider than 34ch, on the page margin: "Still stuck? Send us a request and we will look at it with you."
- **Action,** 24px beneath: the primary button **Send a request** (signed out: **Sign in to send a request**), which scrolls to `#request` and focuses the first field. When requests are paused and an email is set, it reads **Email support** (`mailto:`); when paused with no email, the whole section is not rendered.
- **Beside it on the same baseline:** a text link "Read the Privacy notice" (`/privacy`).
- The section's h2 "Still stuck?" is visually hidden.
- **Phone:** the sentence at body (17px), the button at its natural width (44px tall), 20svh above and 14svh below.

### 5.5 Footer

The shared `PublicFooter`. Its "Help and legal" group already lists Support, Privacy notice, Terms of use, Delete your account and Cookie choices; its stamp carries the support email when one is set, and the text "Send a request" (`/support#request`) when not.

## 6. Imagery for this page

| Slot | Picture | Source and licence | Treatment |
|---|---|---|---|
| Quick fixes | "University College Ibadan. Thumbtacked notice 'Meet the Dutch students'", 1–13 February 1962 | Wikimedia Commons, ASC Leiden, NSAG, van Dis 4 - 195, by Maarten van Dis, CC BY-SA 4.0 (https://commons.wikimedia.org/wiki/File:ASC_Leiden_-_NSAG_-_van_Dis_4_-_195_-_University_College_Ibadan._Thumbtacked_notice_%22Meet_the_Dutch_students%22_-_Ibadan,_Oyo_State,_South_West_Nigeria_-_1-13_February_1962.tiff) | Already monochrome; the indigo cast; 3:4 crop on the notice; AVIF under 80 KB; lazy |
| Footer stamp | UNN gate (shared footer) | as home | as home |
| Coupon | Drawn in code (notches, perforation) | AcadeGrade's own | Paper on ground |

- **Why so few pictures:** this is a Read page for someone with a problem, often on a slow connection; the first screen carries no image at all so the form is usable at once. The page has two real pictures (with the footer stamp), below the tasteskill floor of four; this is defended as deliberate in the inspector report (`01` §6 puts speed first for task pages).
- **Alternative candidates** (if the owner wants a second picture): "General Post office, Ilorin, Kwara State" (Onyeike Izuchi, CC BY-SA 4.0, https://commons.wikimedia.org/w/index.php?curid=123999880) beside "Before you write", as the place letters go.
- **Credit:** added to `lib/public/credits.ts` and the footer imprint line.

## 7. Motion on this page

- **Mode rule:** Read page; entrances only, and nothing moves inside the form while someone types.
- **Coupon:** laid down on load (`03` §3.1 short version: rise 24px with opacity, 640ms), then the perforation dots appear top to bottom (opacity, 320ms). The h1 is painted on the first frame.
- **Request panel:** state changes crossfade in 160ms (opacity only; the panel's size never changes). The busy spinner turns; under reduced motion it is replaced by the label "Sending…" alone.
- **Quick fixes:** each group's h3 and paragraphs rise 16px with a 40ms stagger as the group reaches 15% visibility; the photograph enters with the heading.
- **Before you write:** the heading, the lead, then the table rows at 40ms each.
- **Still stuck:** the sentence and button rise together.
- **Count:** about 30 moving elements, above the inspector's minimum of 8. Reduced motion and data saver: no travel; the anchor jump to `#request` is instant.

## 8. Components

- **Used:** `PublicHeader`, `Slip` (a new `coupon` treatment of the `stub` variant: notches top and bottom plus a perforation; added to `02` §4.5 as `stub` with `orientation="coupon"`), `Field` (select and textarea, `02` §4.8), `Button`, `TextLink`, `SectionHeading`, `Figure` and `Credit`, `Reveal`, `PublicFooter`, `CookieStub`.
- **New:**
  - `components/public/SupportCoupon/` (client island): renders the request panel states from §5.1. It does not call `fetch` itself; it uses the shared hook below.
  - `components/support/useSupportRequest.ts` (new, client): the submit logic extracted from `SupportRequestsCard` (validation with `SUPPORT_MESSAGE_MIN`/`MAX`, the bearer token from `user.getIdToken()`, `POST /api/support/tickets` with `platform: 'web'` and `route` set to the current path, error text from the response, the 401/429/503 handling). `SupportRequestsCard` in Settings is refactored to use the same hook so the two forms can never drift; its look in Settings does not change in this phase.
  - `lib/public/support.ts`: the quick fixes, the "Include" rows, the status words (imported from the shared constants, not retyped).
- **Kept exactly:** `app/api/support/tickets/route.ts` (POST and GET, rate limits 3/hour and 10/day, open to minors and during maintenance, `support` feature switch, `Cache-Control: private, no-store`), `lib/support/tickets.ts` (categories, labels, limits, validation, `studentTicketView`), the admin inbox (`app/api/admin/support/route.ts`) and its reply email.
- **Small dependencies elsewhere (listed so they are built with this page):**
  - **Settings anchor:** give the `SupportRequestsCard` `<section>` `id="help"` and `scroll-mt-24`; the Settings page already scrolls to `location.hash` once the profile loads. `/settings#help` is then the link for "See your requests and our replies".
  - **Return after sign-in:** `/login` honours `?next=` for same-site paths only (must start with a single `/`, no `//`, no scheme; anything else falls back to today's `/dashboard` or `/register`). Owned by `pages/login.md`; this page needs `next=/support#request`, and `account-deletion.md` needs `next=/settings#delete-account`.
  - **Draft keeping:** the typed message is saved to `sessionStorage` (key `ag:support-draft`, 30 minutes) only when a 401 sends the student to sign in, and cleared on send. It holds no password or code (the hint tells them not to type one).
  - **Public request form (recommended; owner decision, §13):** `POST /api/support/public`, no sign-in. Body `{ email, category, message }` with `category` limited to `account`, `privacy` or `other`, and a hidden honeypot field. Validated with the same message limits; rate-limited by a hash of the IP address (3/hour, 10/day) and by email (3/day); stored in `support_tickets` with `uid: null`, `source: 'public'`, `platform: 'web'`, `route: '/support'`. The admin inbox labels these "Not signed in", and `app/api/admin/support/route.ts` skips the in-app notification when `uid` is null and replies by email only. Deletion requests that arrive this way are still verified against the account's email before anything is deleted (as `account-deletion.md` says). The Privacy notice already covers "messages you send us".
  - **Footer stamp:** shows "Send a request" (`/support#request`) when no email is set.
- **Server data:** `getContactEmail()` and `getPlatformSettings()`; nothing else is read on the server. The page never reads a ticket on the server.

## 9. SEO

- **Title:** "Support" (renders as "Support | AcadeGrade").
- **Description:** "Fix sign-in, verification code, CGPA, scanner and sharing problems in a minute, or send a request from your account. We reply in your inbox and by email." (153 characters)
- **Canonical:** `/support`.
- **Open Graph:** the coupon with the h1, on the ground, with the stripe.
- **JSON-LD:** `FAQPage` built from the fourteen quick fixes in §5.2 (exactly the visible text), plus `ContactPage` with `potentialAction` omitted (the form needs sign-in). When an email is set, the home `Organization` carries `contactPoint: { "@type": "ContactPoint", "contactType": "customer support", "email": "<email>", "areaServed": "NG", "availableLanguage": "en" }`; with no email, no `contactPoint` is emitted.
- **Headings:** one h1 (the coupon line) and an h2 for every section; quick-fix groups are h3.
- **Sitemap:** stays listed. The anchors `#request`, `#quick-fixes` and `#before-you-write` are stable and used by other pages.

## 10. Accessibility

- **The form:** a real `<form>` with `<label>`s (not placeholders); the hint and the character counter are linked with `aria-describedby`; the submit bar is a `<button type="submit">` with `aria-disabled` and a visible reason ("Choose what it is about" / "Write at least 10 characters") under it on the first failed press. Validation happens on blur and submit (`03` §4), not on every keystroke.
- **Feedback:** sent and paused messages use `role="status"`; errors use `role="alert"`; after sending, focus moves to the confirmation.
- **State swap:** when the client replaces the signed-out panel with the form, focus is not moved (nothing was focused there), and the panel has `aria-live="off"` so the swap is not announced on load.
- **Locked-out route:** a native `<details>`, keyboard and screen-reader friendly without JavaScript.
- **Run-in questions:** each quick fix is one `<p>` whose question is a `<span class="runin">` at weight 500 (house type has no bold, so no `<strong>` styling is needed for looks); the outline comes from each group's h3, and the FAQPage JSON-LD carries the question/answer split.
- **Perforation and notches:** decorative, drawn with CSS, `aria-hidden` where they are elements.
- **Photograph alt:** "A typed notice pinned to a board at University College, Ibadan, in 1962".
- **Targets:** fields and the bar 52–54px; links in answers have a 44px hit area through padding.
- **Contrast:** ink on paper 16.6:1; soft ink on paper 8.3:1; soft ink on `--pg-ground-2` 6.2:1.

## 11. Carried over, replaced and removed

| Today | In the redesign |
|---|---|
| `getContactEmail()` (admin, then env, then none) | Kept exactly; drives the locked-out route, the paused state, the footer stamp and `contactPoint` |
| Hero "Tell us what is getting in your way." + "Email support" or "Explore product guides" | The coupon: h1 "Tell us what went wrong." and the in-app request form as the primary route; email as a text link in the locked-out route |
| `SupportPromise` aside ("Keep credentials private", "… or Firebase token", "Share the error message, route, time…") | "Never send your password." section, without jargon; the useful part (say what happened) becomes the "Include" table |
| Four icon cards "Help us route your request." (Account access, Results and records, Result scanning, Privacy and safety) with hints | The "Include" table, keyed to the real seven form categories; every hint carried: email on the account and never the password or OTP (row 2), session/semester/course code (row 3), file and issue (scanner quick fix 7), "use Privacy in the subject" (now the "Privacy or my data" category, which routes it) |
| "Quick recovery checks": code delayed; calculation unfamiliar; scanner missed a value; data or deletion | Quick fixes 1, 5, 7, 13 and 14, plus nine more |
| "Still need help?" panel with email, or "Our support email address will be published on this page…" | Still stuck: one sentence and the request action; the unfinished wording is removed in every state |
| `SUPPORT_SUBJECT` "AcadeGrade support request" on mailto links | Kept for every `mailto:` on this page |
| `EditorialHero`, `PublicPage`, `SectionIntro`, lucide icons | Public shell, `Slip` coupon, `SectionHeading`; no icons |
| Settings > Help and support card (exists, not linked from the public site) | Linked as `/settings#help`; its submit logic shared with the public coupon through `useSupportRequest` |
| New | FAQPage JSON-LD, the public request form (if approved), the paused and rate-limited states, the status explanation and retention line |

## 12. Acceptance checklist

- [ ] Five-second test: a stranger says "I can send them a message here, or fix it myself below".
- [ ] Signed out: the coupon shows **Sign in to send a request**; after signing in, the visitor lands back on `/support#request` with the form ready.
- [ ] Signed in: a request sent from `/support` appears in Settings > Help and support and in the admin inbox with `platform: 'web'` and `route: '/support'`.
- [ ] Every API outcome (201, 400, 401, 429, 500, 503) shows its state from §5.1; unit tests cover each with a mocked `fetch`.
- [ ] With `support` switched off in Admin, the page shows the paused state (email set: **Email support**; no email: no action, quick fixes intact, Still stuck hidden) and still reads as finished.
- [ ] **Release gate:** production has a contact email set **or** the public request form live. A build-time or startup check logs an error, and Admin > Settings shows a warning, when neither is true.
- [ ] No "Firebase", "token", "route", "will be published", "until then" or "coming soon" anywhere in the rendered page (test).
- [ ] Category labels and status words on the page equal `SUPPORT_CATEGORY_LABELS` and `STATUS_TEXT` (test imports both).
- [ ] FAQPage JSON-LD matches the visible quick fixes exactly; every link and anchor resolves.
- [ ] `inspect.mjs`: 0 FAIL at 1440/768/390, light and dark; the image-floor WARN is defended in the report; CLS under 0.05 including the auth swap.
- [ ] Lighthouse mobile ≥ 90 ×4; no image on the first screen; the support page ships no more than about 12 KB of its own JavaScript (the coupon island and the hook).

## 13. Open items for the owner

1. **Contact email:** set `contactEmail` in Admin > Settings > Public site before launch. Without it, and without the public form, someone who cannot sign in has no way to reach you (this also blocks the Google Play account-deletion requirement).
2. **Public request form:** approve building `POST /api/support/public` (§8) so the site never depends on an email address. Recommended.
3. **Reply time:** if you want to promise a usual reply time on the coupon ("We usually reply within two working days"), give the figure; nothing is promised until then.
4. **Category name:** keep "AI features" or rename it "AcadeMind" in `SUPPORT_CATEGORY_LABELS` (shared with Settings and Android).
5. **Android label:** the web card says "Help and support" and the Android card says "Help & support"; pick one wording for both.
6. **Reminder advice:** confirm quick fix 12 matches how Android reminders work today (notifications, battery saving, alarms); adjust if the app asks for an exact-alarm permission.
