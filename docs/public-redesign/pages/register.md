# Page plan · Create your account (`/register`)

A restyle with the flow unchanged. Every step, field, validation rule, call, redirect, kill switch and draft rule in `app/(public)/register/page.tsx`, `RegistrationConsents.tsx` and `consent.ts` is carried exactly; only the look, the copy, the layout and the states change. It inherits `01`–`04`, uses the auth pieces defined in `login.md` §8, and follows the structure of `pages/home.md`. For this page, **§5 is the step list**.

## 1. Purpose

- **Mode:** Operate. **Shell:** Auth (`login.md` §8.1), photograph: the UNN Faculty of Arts building.
- **Visitor:** a student who decided to start a record, often straight from the home slip or the calculator (with a handoff), on a phone, sometimes a 16- or 17-year-old fresher, sometimes a direct-entry or spill-over student whose timeline is not the usual one.
- **First question:** "How long is this, and what will it ask me?" Answer on the first screen: the step meter ("Step 1 of 4: Your account"), Google first, and the line that answers are kept while they go.
- **One action per step:** the step's ink button (Email me a code / Continue / Verify email / Create my record). Back is a text link on every step after the first.

## 2. The argument (each block exists because of one claim)

| # | Claim | Proof on the page | Where |
|---|---|---|---|
| 1 | It is short and you can see the end | The stripe meter fills one block per step; the count is honest (3 steps when starting fresh, 4 with past semesters) | Every step |
| 2 | What you typed is not lost | "Filled in so far" stub; the draft line; restore notice | Every step after the first |
| 3 | It understands your situation | Direct entry, spill-over, auto-worked current level, strikes shifting sessions | Steps 2 and 4 |
| 4 | Your email is really yours | A six-digit code that pastes and checks itself | Step 1, code |
| 5 | You choose what happens to your data | Equal age choice, optional AI consent, terms and privacy notice | Step 3 |
| 6 | It worked | The gold block fills; "Your record is ready" | Done |

### Can the long wizard feel shorter without changing the flow? Yes, by these seven decisions

1. **Progress as the slip's stripe.** The five-block stripe at the top of the slip is the meter: block *n* fills while the student is on step *n*, and the gold fifth block (the logo's gold dot) fills only when the record is created. Gold means finished, everywhere on the site. Justification: a meter made of the brand's own arc reads at a glance, costs no space, and replaces the thin grey bars of `AuthProgress`.
2. **An honest count that only shrinks.** Today it always says "of 4". Steps 1 and 2 still say "of 4" (the record choice is not made yet, and the default is the shorter path, so promising 3 and then growing to 4 would feel like the form got longer). On step 3, while "Start with this semester" is selected, step 4 will not happen, so the line reads "Step 3 of 3" and the jump to done fills blocks 4 and 5 together. Same flow, truer number, never a surprise extra step.
3. **"Filled in so far".** Each finished step collapses into one read-only line on a stub at the top of the slip (for example "Ada Obi · 2021/243567 · ada@example.com"). The student sees the form fill up like a registration form being stamped, and never wonders whether step 1 was kept. Read-only on purpose: jumping back several steps would change the flow (going back to step 1 forces a new email code for email sign-ups), so only the existing one-step Back stays.
4. **Step 2 in two short blocks.** The nine controls of "Academic details" split visually, on the same step, into "Where you study" (three fields) and "Your timeline" (five controls with smart defaults), with a perforation between. One screen, two small jobs.
5. **Fewer fiddly controls.** The two range sliders (course duration, semesters finished) become steppers with − and + keys; the level and spill-over chips become square keys like the grade keys. Faster on a thumb, exact, and accessible.
6. **The code types itself.** The verification code field accepts a pasted email line, keeps the six digits, and checks them as soon as the sixth arrives (§5.3). One tap saved, and no copy button needed in the email.
7. **Reassurance that is true.** One small line says answers stay in this tab and passwords are never stored. On restore, a line says so, and for email sign-ups it says why they are back on step 1.

**Not done (they would change the flow):** merging steps, moving the agreements earlier, skipping the email code, saving the draft beyond the tab, or editing earlier steps from the stub.

## 3. First screen

### Desktop (1440×900)

- **Shell:** as `login.md` §3: the slip in columns 1–6 (668px, padding 48px), the sticky photograph in 7–12 with the paper tab line "Your record stays private. You decide who sees it." and the caption "Faculty of Arts, University of Nigeria, Nsukka".
- **On the slip, in order:**
  1. **StepStripe** (40px): block 1 filled violet, blocks 2–5 `--pg-paper-2`.
  2. **Mark and wordmark,** centred.
  3. **h1** "Create your free record", centred, `--pg-head` capped at 44px.
  4. **Step line** at small, centred: "Step 1 of 4 · Your account".
  5. **Draft line** at small, soft ink, centred: "Your answers stay in this tab until you finish. Passwords are never stored."
  6. **Handoff stub** (only with a calculator handoff; copy as `login.md` §4: "Your 5 calculator courses are kept in this browser tab. After you finish, add them as your first semester from Results.").
  7. **Step 1 content** (§5.2): Google, divider, five fields, **Email me a code**.
  8. **Below a perforation:** "Already have an account? Sign in" and "Get the Android app".
- **Fit:** stripe to the Full name field above the fold; the button is one short scroll on 900px. The step is a form, so a scroll is acceptable; the meter and the h1 stay at the top.

### Phone (390×844)

- Compact header (mark, wordmark, "Back to site"); no photograph.
- The slip full width, padding 24px: stripe 40px, h1 at 40px over two lines ("Create your / free record"), step line, draft line, then Google at full width, the divider and the fields. Google and the first two fields are on the first screen.
- The ink button is full width at the end of each step; Back sits as a text link to its left on desktop and above it on phones (so the thumb lands on the primary).

### Why this works

- The meter and the step name answer "how long" before anything is asked.
- Each step is one short job on one paper slip; nothing slides sideways in a carousel and nothing hides in a modal.

## 4. Copy deck (final wording; sentence case; no Title Case anywhere)

- **Title (tab):** "Create your account".
- **h1:** "Create your free record" (stays the same on every step; the step heading below it changes).
- **Step names** (step line and screen-reader progress): "Your account" · "Where you study" · "Your record" · "Past semesters". The step line reads "Step 2 of 4 · Where you study"; on step 3 it reads "Step 3 of 3 · Your record" while "Start with this semester" is selected (§2, decision 2).
- **Draft line:** "Your answers stay in this tab until you finish. Passwords are never stored."
- **Restore lines:** Google sign-up: "We kept your answers from earlier in this tab." Email sign-up (always restored to step 1, because passwords and codes are never kept): "We kept your answers from earlier in this tab. Enter your password again to get a new code."
- **Support:** "Already have an account? Sign in" · "Get the Android app".
- Step copy, field labels, hints and every message are in §5 under each step; the finalize error map is in §5.10.

## 5. Sections: the step list

### 5.1 The frame of every step

- **StepStripe** at the slip's top (§8). Accessible version: `nav aria-label="Registration progress"` (kept; tested) with a visually hidden ordered list ("Your account, complete", "Where you study, current step", …) and the visible step line.
- **Step heading:** an h2 at lead, left-aligned, 32px below the step line, then one sentence at body.
- **Filled in so far** (steps 2, 3, 4): a `stub` on `--pg-paper-2` with a notch, one line per finished step at small, each prefixed by the step name in weight 500:
  - "Your account · Ada Obi · 2021/243567 · ada@example.com" (Google: "· with Google")
  - "Where you study · University of Nigeria, Nsukka · Computer Science · B.Sc. Computer Science · 300L"
  - "Your record · Adding 4 past semesters" or "Your record · Starting with this semester"
- **Back:** a text link "Back" with a left chevron drawn from two strokes, carried behaviour: step 2 → 1, step 3 → 2, step 4 → 3 (and step 4's Back clears `pastSemesters`, as today).
- **Step change motion:** §7.
- **Scroll:** on every step change, focus moves to the new step heading and the slip's top is scrolled into view (today the page can stay scrolled to the old button).

### 5.2 Step 1 · Your account

- **Heading:** "Your account". **Sentence:** "Use Google, or your email and a password."
- **Google** (`GoogleButton`, `login.md` §8.3), shown only while `authMethod === 'email'` (as today). Calls `signInWithGoogle`, sets `authMethod: 'google'`, clears `verificationToken`, fills email and full name from Google. Popup closed: no message (as today). Failure: inline "Google sign-in didn't work. Try again, or use your email."
- **After Google** (replaces the green success box): a plain `--pg-paper-2` band with the G mark at 20px: "Signed in with Google as ada@example.com. Check your name and add your matric number." Email field read-only.
- **Divider:** "or use your email" (PerforationDivider).
- **Fields** (labels above; react-hook-form `mode: 'onTouched'`, zod schema unchanged in rules):

| Field | Label | Placeholder | Hint | Messages (rule unchanged) |
|---|---|---|---|---|
| `fullName` | Full name | none | "As it appears on your school records." | "Enter your full name" (min 2) · "That name is too long" (max 100) |
| `matric` | Matric number | "e.g. 2021/243567" | "As printed on your ID card." | "Enter your matric number" (min 4) · "That matric number is too long" (max 64) · "Use only letters, numbers and / - _ ." (pattern) |
| `email` | Email | "you@example.com" | none | "Enter a valid email address" · read-only when Google or already signed in (as today) |
| `password` (email only) | Password | none | "At least 8 characters." | "Use at least 8 characters" · "That password is too long" (max 128) |
| `confirmPassword` (email only) | Type the password again | none | none | "The two passwords don't match" |

- **Removed:** the developer handle used as the Full name placeholder, and the 13-digit placeholder for matric.
- **Button:** email path "Email me a code" (busy "Sending your code…"); Google path "Continue" (busy "Saving…"). Behaviour carried: validate the step's fields, then for email POST `/api/auth/otp/send` `{ email, type: 'registration' }`; for Google go to step 2.
- **Send messages** (inline `AuthMessage`, replacing toasts):

| Response | Message |
|---|---|
| 200 | moves to the code screen (no toast; the code screen says where it went) |
| 400 "Email already registered" | "This email already has an AcadeGrade account. Sign in instead." ("Sign in" links to `/login`) |
| 403 signups paused | switches to the paused screen (§5.9) instead of a toast |
| 429 with `cooldownRemaining` | "You asked for a code a moment ago. You can ask again in 0:42." (counts down; sets the cooldown as today) |
| 502 delivery failed | "We couldn't send the email just now. Try again in a minute." |
| network error | "No connection. Check your data and try again." |
| other | "We couldn't send your code. Please try again." |

### 5.3 Step 1, second screen · Check your email (code)

- **Heading:** "Check your email". **Sentence:** "We sent a 6-digit code to **ada@example.com**. It works for five minutes."
- **CodeField** (§8): six paper cells, tabular figures in Hanken Grotesk at lead, no monospace. One real input underneath (`inputMode="numeric"`, `autoComplete="one-time-code"`, `maxLength` 6), label "Verification code".
  - **Paste:** any pasted text is stripped to digits and the first six are kept ("Your code is 482 913" becomes 482913).
  - **Auto-advance:** when the sixth digit arrives (typed, pasted or filled by the phone's code suggestion), verification starts once, with no tap. If that attempt fails, the digits stay selected so the next key replaces them, and the same six digits are never sent twice in a row automatically.
  - **Keys:** Backspace clears the last cell; arrow keys move the caret; the caret shows as a 2px ink bar in the active cell.
- **Button:** "Verify email" (busy "Checking…"), disabled until six digits (as today), kept for keyboards and for retries.
- **Links:** "Use a different email" (today's Back: hides the code screen and clears `verificationToken`) and "Send a new code" / "Send a new code in 0:42" (today's Resend, disabled during the 60-second cooldown).
- **Verify messages** (POST `/api/auth/otp/verify` `{ email, type: 'registration', code }`, carried):

| Server answer | Message |
|---|---|
| ok with `verificationToken` | goes to step 2; the step line on step 2 starts with "Email checked." for one view |
| ok without `verificationToken` | "We couldn't secure the check. Send a new code." |
| "Invalid OTP" | "That code isn't right. Check the latest email from AcadeGrade." |
| "OTP expired" | "That code has expired. Send a new one." |
| "OTP already used" | "That code was already used. Send a new one." |
| "Too many failed attempts…" (5 tries) | "Too many wrong tries. Send a new code." |
| network | "No connection. Check your data and try again." |

- **Behaviour to protect:** the verification ticket the server issues lasts 10 minutes (`REGISTRATION_TICKET_TTL_MS`). If steps 2–4 take longer, finalize returns `verification-expired` and the student is sent to step 1 (§5.10). The copy for that case is planned; the TTL itself is an owner decision (§13).

### 5.4 Step 2 · Where you study

- **Heading:** "Where you study". **Sentence:** "Pick from the list or type your own. You can change these later in Settings."
- **Block A, "Where you study"** (three `Field`s with the existing datalists from `loadAcademicCatalog()`):
  - University (label "University", hint "Start typing, for example University of Nigeria, Nsukka"). Default value carried from `DEFAULT_UNIVERSITY` (see §13).
  - Department (placeholder "e.g. Computer Science").
  - Programme (placeholder "e.g. B.Sc. Computer Science").
  - Hint under the three: "Can't find yours? Type it in full and we'll use it as you typed it."
  - Checkbox (unticked, carried `suggestToCatalog`): "Also suggest what I typed for the shared list. An admin checks it first."
- **Perforation, then block B, "Your timeline"** (an h3 at body weight 500):
  - **Entry session** `Field`, label "Session you started", placeholder "e.g. 2022/2023", message "Use two years in a row, for example 2022/2023".
  - **Level you started in** `ChoiceKeys` (radiogroup, kept `aria-labelledby`): "100L" · "200L" · "300L". Hint: "Came in by direct entry? Choose 200L or 300L."
  - **Course duration** `Stepper` (1–10 years, default 4): label "Length of your programme", unit "years". Hint: "From 100L to your final year: 4 for most degrees, 5 for engineering, 6 for medicine. Direct entry? Keep the full length; we take off the years you skipped." (This matches `buildAcademicSlots`: years = duration − (entry level ÷ 100 − 1).)
  - **Current level** `ChoiceKeys` (today plain buttons; now a radiogroup): keys from the entry level upward for the programme's years. Auto-set from the entry session with the September rollover (`inferCurrentLevel`, carried). Hint: "Worked out from your session. Change it if it's wrong." Messages: "Your current level is beyond the length of your programme. Check the length." · "Your current level can't be lower than the level you started in."
  - **Spill-over** `ChoiceKeys`: "0" · "1" · "2" · "3" · "4" (accessible names kept: "No extra semesters", "1 extra semester", …). Label "Extra semesters after your final year", hint "For a spill-over. Leave at 0 if this isn't you."
  - **Timeline line** (small, soft ink, live): "Started 2022/2023 in 100L · now 300L · final year 2025/2026". Today's "Expected graduation" uses `graduationSession(entrySession, duration)`, which ignores direct entry (a 200L entrant shows one year too late); the line should use the programme's years (owner to approve, §13).
- **Button:** "Continue" (validates the same eight fields as today).

### 5.5 Step 3 · Your record

- **Heading:** "Your record". **Sentence:** "Start with this semester, or add the semesters you've already finished."
- **Record choice** (radiogroup of two full-width choice rows; today two motion cards with Sparkles and Database icons and glow shadows):
  - "Start with this semester" · small: "Add results as they come out. Good for freshers." (`fromScratch`, the default, as today)
  - "Add my past semesters now" · small: "Enter earlier results to build your CGPA from the start." (`complete`; sets `semestersCompleted` to 1 if empty, as today)
  - Each row: `--pg-paper-2` fill, 64px or taller, a square key at left; the selected row turns ink with paper text. Equal size; no icons.
- **Semesters finished** (only for `complete`): `Stepper` 1 to `maxCompletedSemesters(duration, currentLevel, entryLevel)`, label "Semesters you've finished", hint "Up to 6 by 300L if you started in 100L" (built from the real maximum). Clamped when the maximum falls (carried `useEffect`). Message: "That's more semesters than you could have finished by your current level."
- **Perforation, then "Before you finish"** (h3) — `RegistrationConsents`, neutral and equal-weight:
  - **Age** (fieldset radiogroup, `aria-required`): legend "How old are you?" (kept from `consent.ts`). Two keys of identical size, fill and type, side by side on desktop and stacked in the same order on phones, neither selected: "I'm 18 or older" · "I'm under 18". No colour, icon or wording suggests one answer is better. Message if empty: "Choose your age group to continue".
  - **Adult:** the AI checkbox appears, unticked and optional, label exactly `AI_CONSENT_LABEL`, with the hint "Optional. You can change this later in Settings."
  - **Under 18:** the AI checkbox is not shown and any tick is cleared (carried `useEffect`); `MINOR_NOTICE` shows as a plain `--pg-paper-2` note in ink, no info icon, no tint colour, `role="note"`. Tracking works exactly the same for them.
  - **Terms:** required checkbox "I agree to the Terms and Privacy notice", both links opening in a new tab (kept, so the form is not lost; each link says "(opens in a new tab)" to screen readers). Message: "Agree to the Terms and Privacy notice to continue".
  - Agreements are never restored from the draft (carried).
- **Button:** "Create my record" for `fromScratch` (calls the submit), "Continue" for `complete` (goes to step 4).

### 5.6 Step 4 · Past semesters (only for "Add my past semesters now")

- **Heading:** "Check your past semesters". **Sentence:** "We filled in each session from the year you started. Fix any that moved, for example after a strike or a repeated year."
- **The list** is a real table on the slip (Slip body): columns "Semester" (the slot label, e.g. "100L First Semester") and "Session" (an editable 52px `Field`, tabular figures, 9ch wide). Rows generated by `generatePastSemesters` when empty (carried).
- **Row error** under the field: "Use two years in a row, for example 2022/2023" (`aria-invalid` on that field).
- **Message** if the count does not match: "Confirm every finished semester before continuing" (carried rule).
- **Long lists:** no inner scroll box (today `max-h-[300px] overflow-y-auto`); the table grows and the page scrolls, so nothing is hidden on phones.
- **Button:** "Create my record" (submit). Back returns to step 3 and clears the list (carried).

### 5.7 Creating (while `isSubmitting`)

- The step content is replaced in place (no overlay box, no shadow): the slip shows "Setting up your record…" at lead and "Keep this page open. It takes a few seconds." at small, `role="status" aria-live="polite"`. The stripe stays still (no pulsing block: no idle loops, `03` §1).
- Carried: the guard that a verified email exists before submit ("Verify your email again before creating the account." becomes the inline line "Your email check has ended. Get a new code to finish." and returns to step 1, as today), the finalize POST with the same body, the email sign-in after finalize, the catalogue suggestions (fire and forget), clearing the draft.

### 5.8 Done

- The gold fifth block fills (and block 4 too when starting fresh). h2 "Your record is ready" at head (capped 44px), sentence "Opening your dashboard…", and a text link "Open it now" (`/dashboard`) for anyone who does not want to wait. `role="status"`.
- Carried: `router.push('/dashboard')` after 3 seconds; the signed-in-and-complete redirect does not fire during success.
- Removed: the green tick tile.

### 5.9 Registration paused (`config/settings.disableSignups`)

- Same shell; the stripe decorative (no meter). h1 "Registration is paused". Sentence: "New accounts can't be created right now. If you already have one, you can sign in as usual." Primary **Sign in** (`/login`). Text link "Back to the site".
- Also shown when `/api/auth/otp/send` or finalize answers 403 `signups-disabled` (today: a toast).
- Removed: the amber alert icon tile, the eyebrow "Account availability", the proof aside.

### 5.10 Finalize errors (`/api/auth/register/finalize`; inline at the button, replacing toasts)

| Code | Message | Where the student lands (carried) |
|---|---|---|
| `verification-expired` | "Your email check timed out while you were filling this in. Get a new code; your other answers are kept." | Step 1 (today) |
| `verification-mismatch` | "That code was for a different email. Get a new code for this one." | Step 1 (today) |
| `matric-in-use` | "That matric number is already linked to another account. Go back to Your account to check it, or contact Support." | Stays (today) |
| `email-in-use` | "An account with this email already exists. Sign in instead." | Stays |
| `google-session-expired` / `google-provider-required` / `google-email-mismatch` | "Your Google sign-in timed out. Continue with Google again." | Stays |
| `setup-complete` | "This account is already set up. Open your dashboard." | Stays (the redirect effect usually catches it first) |
| `invalid-timeline` | "Your past semesters don't line up with the session you started. Check them again." | Stays |
| `invalid-registration-data` | the server's field message, shown as is | Stays |
| `signups-disabled` | the paused screen (§5.9) | |
| other / network | "We couldn't create your account. Your answers are kept; please try again." | Stays |

- Carried: on a failed client validation, "Please review the highlighted registration details." becomes the inline line "Some details need checking." and the step with the first error opens (the same step-routing logic).

### 5.11 Loading and redirect states

| State | What shows |
|---|---|
| `authLoading` or (signed in and `profileLoading`) | The shell, the slip header and grey field bars; "Checking your sign-in…" |
| Signed in with a complete profile | "Opening your dashboard…" while the existing effect clears the draft and replaces to `/dashboard` (today: `null`, a blank page) |
| Signed in, profile incomplete (interrupted sign-up) | The wizard, with provider, email and name pre-filled (carried) and the restore line |
| `maintenanceMode` | Redirect to `/maintenance` before anything is used (see `maintenance.md` for the return path) |

### 5.12 Draft rules (carried exactly; copy must not promise more)

- Key `acadegrade:registration-draft:v2` in **`sessionStorage`** (per tab; it is not `localStorage`, so closing the tab ends it). The plan's copy says "in this tab" for that reason.
- Never stored: password, confirm password, verification token, terms, AI consent.
- Restored once after auth and profile load. Google sign-ups resume at the saved step (1–4); email sign-ups always restart at step 1 with their answers filled in (they must re-enter the password and get a new code).
- Cleared on success and when a complete profile is found.

## 6. Imagery for this page

| Slot | Picture | Source and licence | Treatment |
|---|---|---|---|
| Right half (≥ 1024px) | Faculty of Arts building, UNN Nsukka | Wikimedia Commons (`openverse:b3c160f7-…`; check the licence on download) | Greyscale with indigo cast, 4:5, AVIF under 180 KB; `getImageProps` art direction so phones download nothing |
| Phone | none | | |

Credit in the auth footer imprint, as on login.

## 7. Motion on this page

- **Load:** the short "laid down" move (rise and stripe), once per session; the stripe fills only up to the current block.
- **Step change:** the outgoing step fades out over 160ms; the incoming one rises 16px with opacity over 320ms (`--pg-ease-paper`); the new stripe block fills in 160ms. No sideways slide (today ±18px on x with a spring), so login, register and forgot password move the same way.
- **Filled in so far:** a new line appears with a 160ms fade.
- **Code cells:** each digit fades into its cell in 160ms; on a failed code the cells shake once like the login form (400ms, transform only).
- **Done:** the gold block fills (320ms), then the heading fades in.
- **Removed:** card hover scale (1.02) and tap scale, row slide-ins with stagger, `DirectionalText` on headings, the spinner overlay.
- **Reduced motion and data saver:** fades only, no rise, no shake, no fill animation.

## 8. Components

- **Used:** `AuthShell`, `Slip`, `GoogleButton`, `PerforationDivider`, `Field`, `PasswordField`, `AuthMessage`, `Button`, `TextLink` (all from `login.md` §8 and `02`), plus the new pieces below.
- **StepStripe:** the five-block brand stripe as a meter. Props `steps` (names), `current` (1-based), `done`. Rule: block *n* is filled while on step *n*; all five fill on done. Visible step line plus a hidden ordered list with "complete / current step / upcoming". Replaces `AuthProgress`. Shared with forgot password.
- **FilledSoFar:** the notched stub of finished-step lines (§5.1). Read-only.
- **CodeField:** six visual cells over one real input (§5.3). The cells are `aria-hidden`; the input carries the label, `autocomplete="one-time-code"`, the hint "Enter the 6 digits from the email" and the error. Paste and auto-submit logic in a pure helper `normaliseCode(text)` with tests. Behaviour reference only: shadcn's InputOTP (input-otp); hand-built here, restyled to these tokens. Shared with forgot password.
- **ChoiceKeys:** the generic square-key radiogroup that `GradeKeys` is built on (`02` §4.7): arrow keys move the choice, 44px minimum, selected key ink-filled. Used for entry level, current level, spill-over and the age question. Add to `02` §4 as the base of `GradeKeys`.
- **Stepper:** a number `Field` with − and + square keys (44px), min/max enforced, unit shown after the value at small. Used for programme length and semesters finished. Replaces the two range sliders.
- **ChoiceRow:** a full-width radio row with title and one line (record choice).
- **Data:** copy and message maps in `lib/public/auth-copy.ts` (shared with login and forgot password); zod messages updated in place with the rules unchanged.

## 9. SEO

- **Title:** "Create your account" (today none; the layout exports only `NO_INDEX_METADATA`).
- **Description:** "Create a free AcadeGrade record for your GPA, CGPA and degree class."
- **Robots:** noindex, nofollow, nocache (kept). Not in the sitemap. Links to `/register` across the site stay as they are.

## 10. Accessibility

- One h1 per page; each step has an h2 that receives focus on change (`tabIndex=-1`), so screen-reader users hear the new step.
- Progress: `nav aria-label="Registration progress"` with an ordered list and `aria-current="step"`.
- Every control has a visible label above it; hints and errors linked with `aria-describedby`; `aria-invalid` on errors; on a failed Continue, focus goes to the first invalid control.
- ChoiceKeys and ChoiceRow are true radiogroups (arrow keys, one tab stop). The current-level keys gain the radiogroup role they lack today.
- The age choice has no default and equal visual weight (tested by "asks the age question with two equal, unselected choices").
- CodeField is one input to assistive tech; auto-submit is announced by the status line "Checking your code…".
- Countdowns update visually every second but announce only at 0 ("You can ask for a new code now"), not every second.
- Terms and Privacy links state that they open a new tab.
- Touch targets 44px or more; the stepper keys and level keys included.

## 11. Carried over, replaced and removed

| Today | In the redesign |
|---|---|
| Title Case headings ("Create Your Account", "Verify Your Email", "Academic Details", "From Scratch", "Complete Record", "Confirm Past Semesters", "Looks Good", "Resend Code") | Sentence case throughout (§4–§5) |
| Full name placeholder is a developer handle | No placeholder; hint "As it appears on your school records." |
| `AuthProgress` thin bars, "Step n of 4" always | `StepStripe` meter; honest "of 3" / "of 4" |
| Eyebrow "Student onboarding", proof aside "Build a record you can trust" | Removed; one reassurance line on the photograph tab |
| Sparkles and Database icon cards with glow shadows and hover scale | Two equal `ChoiceRow`s, no icons, no shadow |
| Range sliders for duration and semesters | `Stepper`s |
| Level chips without a radio role | `ChoiceKeys` radiogroups |
| Code input in monospace with wide tracking | `CodeField`: six cells, tabular Hanken Grotesk, paste and auto-verify |
| Toasts for every message | Inline `AuthMessage` at the place it concerns |
| Spinner overlay with shadow while creating | In-place status on the slip |
| Green tick tile on success | The gold block of the stripe |
| Amber alert tile on "Registration is paused" | Plain slip with one action |
| Inner scroll box for past semesters | The table grows with the page |
| `DirectionalText` / `AUTH_TEXT_MOTION_CLASS` motion | One consistent step motion (§7) |
| "iOS coming soon" in `MobileAppDownload compact` | "Get the Android app" only |
| Every step, field rule, call, kill switch (`disableSignups`, `maintenanceMode`), draft rule, consent rule, catalogue suggestion, redirect | Unchanged |

## 12. Acceptance checklist

- [ ] Email path end to end: send code (cooldown 60s, 429 handled), paste a full email line into the code field and it verifies without a tap, step 2–4, finalize, email sign-in, dashboard after 3 seconds.
- [ ] Google path: no code screen; email read-only; resumes at the saved step after a refresh.
- [ ] Email path refresh: back to step 1 with answers kept and the restore line; password fields empty.
- [ ] Step count reads "of 4" on steps 1–2, "Step 3 of 3" on step 3 while "Start with this semester" is selected and "Step 3 of 4" with past semesters; the stripe fills 1, 2, 3 → 5 or 1, 2, 3, 4 → 5.
- [ ] Direct entry: entry level 200L, duration 4 gives current-level keys 200L–400L and the right final year.
- [ ] Under-18: AI checkbox absent and cleared, minor notice shown, finalize sends no `aiConsent` (existing consent tests pass).
- [ ] `disableSignups` shows the paused screen, also when the send or finalize call returns 403.
- [ ] Each finalize code in §5.10 shows its message; `verification-expired` returns to step 1 with answers kept.
- [ ] No Title Case, no developer handle, no Sparkles icon, no glow, no shadow at rest (`lint.mjs` clean; `inspect.mjs` 0 FAIL at 1440/768/390, light and dark).
- [ ] Phone 390×844: Google and the first two fields on the first screen; the cookie stub never covers the step's button.
- [ ] Keyboard-only completion of both paths; screen reader hears each new step heading.
- [ ] Tests updated for the new copy (`auth-pages.test.tsx`: the main region name follows the new h1 "Create your free record", the `complementary` proof landmark is gone, "Step 1 of 4" stays, step heading "Your account"; `auth-shell.test.tsx` progress test uses `StepStripe`); `register-consents.test.tsx` passes unchanged.

## 13. Open items for the owner

1. **Verification ticket length.** The email check is valid for 10 minutes after the code is accepted; a student who takes longer on steps 2–4 is sent back to get a new code. Keep 10 minutes, or raise `REGISTRATION_TICKET_TTL_MS` to 30 minutes (one constant; no flow change). Recommended: 30.
2. **Default university.** The University field starts filled with "ESUT Agbani" (`DEFAULT_UNIVERSITY`). For students elsewhere this is a wrong default to delete. Keep it, or start the field empty with the catalogue suggestions? Recommended: empty.
3. **Final-year line for direct entry.** Approve computing it from the programme's years (today it shows one year too late for 200L entrants, two for 300L).
4. **AI consent wording.** `AI_CONSENT_LABEL` is legal text and is kept word for word. Should it name AcadeMind ("Let AcadeMind send my results…")? Needs the privacy notice to match.
5. Confirm "Add my past semesters now" and "Start with this semester" as the names of the two record choices.
