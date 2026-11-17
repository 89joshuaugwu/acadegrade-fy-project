# Page plan · Reset your password (`/forgot-password`)

A restyle. The four phases, the three calls and the redirect in `app/(public)/forgot-password/page.tsx` stay exactly as they are; only the look, the copy, the layout and the states change. It inherits `01`–`04`, reuses the auth pieces in `login.md` §8 and `StepStripe` / `CodeField` from `register.md` §8, and follows the structure of `pages/home.md`. §5 is the step list.

## 1. Purpose

- **Mode:** Operate. **Shell:** Auth, photograph: a lecture theatre from the home set.
- **Visitor:** a student locked out, often in a hurry before checking a result, on a phone, switching between this tab and their email app.
- **First question:** "Can I get back in without losing anything?" Answer: "We'll email you a code. Your results are not touched."
- **One action per step:** Email me a code / Verify code / Save new password. Back and resend are text links.

## 2. The argument (each block exists because of one claim)

| # | Claim | Proof on the page | Where |
|---|---|---|---|
| 1 | Three short steps | StepStripe: "Step 1 of 3 · Your email" | Every step |
| 2 | Your results are safe | The photograph tab line and the step 1 sentence | First screen |
| 3 | The code is easy | Paste a whole email line; it checks itself | Step 2 |
| 4 | You won't get stuck | Resend with a visible countdown; clear expiry; a way to start again | Steps 2 and 3 |
| 5 | It worked | The gold block fills; "Password changed" | Done |

## 3. First screen

### Desktop (1440×900)

- As `login.md` §3: the slip in columns 1–6, the sticky photograph in 7–12 with the paper tab line "Resetting your password never changes your results." and its caption.
- **On the slip:** StepStripe (block 1 filled), mark and wordmark, h1 "Reset your password", step line "Step 1 of 3 · Your email", the step heading and sentence, the Email field, **Email me a code**, then below a perforation "Remember it? Sign in".
- Everything above the fold at 1440×900.

### Phone (390×844)

- Compact header (mark, wordmark, "Back to site"), no photograph, the slip full width. The h1, the email field and the button are on the first screen with the keyboard closed; with the keyboard open the field and button stay visible (the slip has no tall header to push them down).

### Why this works

- It looks and moves exactly like sign in and register, so the student knows they are still in the same place.
- The code step is built for switching apps: the code can be pasted from anywhere and the phone's code suggestion fills it.

## 4. Copy deck (final wording; sentence case)

- **Title (tab):** "Reset your password".
- **h1:** "Reset your password" (kept on every step).
- **Step names:** "Your email" · "The code" · "New password". Done is not a step; the step line reads "Step 2 of 3 · The code". (Today: four labels including "Done" and "Step n of 4".)
- **Photograph tab:** "Resetting your password never changes your results."
- **Support line:** "Remember it? Sign in" (hidden on done, as today).
- Step copy and messages in §5.

## 5. Sections: the step list

### 5.1 Step 1 · Your email

- **Heading:** "Your email". **Sentence:** "We'll send a 6-digit code to the email on your account."
- **Field:** label "Email" (today "Email Address"), `type="email"`, `inputMode="email"`, `autoComplete="email"`, placeholder "you@example.com", `autoFocus` on desktop only (on phones the keyboard would cover the h1).
- **Button:** "Email me a code" (busy "Sending your code…"). Enter submits (carried form submit).
- **Carried call:** POST `/api/auth/otp/send` `{ email: email.trim(), type: 'reset' }`; on 200 go to step 2 and start the 60-second cooldown.
- **Messages** (inline `AuthMessage`, replacing toasts):

| Trigger | Message |
|---|---|
| Client check fails (empty or no `@` and dot) | under the field: "Enter a valid email address, like you@example.com" |
| 404 "No account found with this email" | "There's no AcadeGrade account with that email. Check it, or create a free account." ("create a free account" links to `/register`) |
| 429 with `cooldownRemaining` | "You asked for a code a moment ago. You can ask again in 0:42." (live countdown) |
| 502 delivery failed | "We couldn't send the email just now. Try again in a minute." |
| network | "No connection. Check your data and try again." |
| other | "We couldn't send your code. Please try again." |

### 5.2 Step 2 · The code

- **Heading:** "Check your email". **Sentence:** "We sent a 6-digit code to **ada@example.com**. It works for five minutes."
- **CodeField** (`register.md` §8): six cells in tabular Hanken Grotesk, one real input with `inputMode="numeric"` and `autoComplete="one-time-code"`, label "Verification code", hint "Enter the 6 digits from the email. You can paste the whole line." Paste keeps the first six digits; the sixth digit starts verification once, with no tap; a failed code stays selected for retyping and is never resent automatically.
- **Button:** "Verify code" (busy "Checking…"), disabled until six digits (carried).
- **Links:** "Use a different email" (today's Back to step 1) and "Send a new code" / "Send a new code in 0:42" (carried cooldown, disabled while busy).
- **Carried call:** POST `/api/auth/otp/verify` `{ email, type: 'reset', code }`; on 200 go to step 3.
- **Messages:**

| Server answer | Message |
|---|---|
| "Invalid OTP" | "That code isn't right. Check the latest email from AcadeGrade." |
| "OTP expired" | "That code has expired. Send a new one." |
| "OTP already used" | "That code was already used. Send a new one." |
| "Too many failed attempts…" (5 tries) | "Too many wrong tries. Send a new code." |
| network | "No connection. Check your data and try again." |
| other | "We couldn't check the code. Please try again." |

- **Success line** (replaces the toast "Code verified!"): step 3's sentence starts with "Code accepted."

### 5.3 Step 3 · New password

- **Heading:** "Choose a new password". **Sentence:** "Code accepted. Use at least 8 characters. You have 15 minutes to save it."
  - The 15 minutes is real: after the code is verified, `/api/auth/password/reset` accepts it for 15 minutes (`verifiedAt` window). The sentence tells the truth so nobody leaves the tab for an hour.
- **Fields** (`PasswordField` with Show/Hide): "New password" (hint "At least 8 characters.", `autoComplete="new-password"`, `autoFocus` desktop only) and "Type it again".
- **Button:** "Save new password" (busy "Saving…"), disabled until 8 characters (carried).
- **Carried call:** POST `/api/auth/password/reset` `{ email, code, newPassword }`; on 200 go to done.
- **Messages:**

| Trigger | Message |
|---|---|
| Client: under 8 characters | under the field: "Use at least 8 characters" |
| Client: no match | under the second field: "The two passwords don't match" |
| "Reset session expired. Please request a new code." / "OTP Expired" | "This reset took longer than 15 minutes. Start again to get a new code." with the text link **Start again** (returns to step 1 with the email kept) |
| "Invalid OTP code" / "Invalid or expired reset session" | "This reset can't be finished. Start again to get a new code." with **Start again** |
| 404 "User not found" | "We couldn't find that account any more. Contact Support." |
| network | "No connection. Your new password isn't saved yet; try again." |
| other | "We couldn't save your password. Please try again." |

- **Start again** is the only addition: today these errors leave the student on step 3 with no way back except a reload. It calls the same `setStep('email')` that step 2's Back already uses.

### 5.4 Done

- All five stripe blocks fill (the gold block last). h2 "Password changed" at head (capped 44px); sentence "You can now sign in with your new password. Taking you to sign in…"; text link "Sign in now" (`/login`). `role="status" aria-live="polite"` (carried; tested "Password reset" becomes "Password changed").
- Carried: `router.push('/login')` after 3 seconds; the support line is hidden.
- Removed: the round green tick.

### 5.5 Shared states

| State | What shows |
|---|---|
| Busy (any step) | The button keeps its width with its busy label and a small spinner; fields read-only |
| Countdown | "Send a new code in 0:42", updated each second, announced only at 0 |
| Offline | The network line at the step's button |

## 6. Imagery for this page

| Slot | Picture | Source and licence | Treatment |
|---|---|---|---|
| Right half (≥ 1024px) | A lecture theatre from the home hero set (frame 3) | Wikimedia Commons, credit as on home | Greyscale with indigo cast, 4:5, AVIF under 180 KB; phones download nothing |

## 7. Motion on this page

- Identical to register (`register.md` §7): load rise and stripe once per session; step change as a 160ms fade out and a 16px rise with fade over 320ms; the stripe block fills in 160ms; the code cells shake once on a wrong code; done fills the gold block.
- Removed: the 16px sideways slide (`x: -16 → 0`) and the scale-in on done, which made this page move differently from login and register.
- Reduced motion and data saver: fades only.

## 8. Components

- **Used:** `AuthShell`, `Slip`, `StepStripe`, `Field`, `PasswordField`, `CodeField`, `AuthMessage`, `Button`, `TextLink`, `Figure`.
- **Removed:** `RecoveryStepHeader` (an icon tile beside each heading: Mail, ShieldCheck, Lock) and the success tone.
- **Data:** messages in `lib/public/auth-copy.ts` (`messageForOtpError`, `messageForResetError`), shared with register.

## 9. SEO

- **Title:** "Reset your password" (today none).
- **Description:** "Reset your AcadeGrade password with a code sent to your email."
- **Robots:** noindex, nofollow, nocache (kept). Not in the sitemap.

## 10. Accessibility

- One h1; each step's h2 takes focus on change.
- Progress `nav aria-label="Password recovery progress"` (kept; tested) with the hidden ordered list and `aria-current="step"`.
- Each step is its own `<form>` with an accessible name (kept: "Request a verification code", "Verify your code", "Choose a new password"), so Enter submits.
- CodeField is one labelled input; the cells are decorative.
- Errors `role="alert"` once; countdowns announce only at the end.
- Show/Hide toggles are buttons with `aria-pressed`.

## 11. Carried over, replaced and removed

| Today | In the redesign |
|---|---|
| Eyebrow "Secure account recovery", proof aside with icon list | Removed; one line on the photograph tab |
| Icon tiles (Mail, ShieldCheck, Lock) beside each heading | Plain h2 and sentence |
| "Step n of 4" including "Done" | "Step n of 3"; done fills the gold block |
| Labels "Email Address", "Verification Code (OTP)", "New Password", "Confirm Password" | "Email", "Verification code", "New password", "Type it again" |
| Code input in monospace with 0.45em tracking | `CodeField` with paste and auto-verify |
| Toasts for every message and success | Inline messages; no success toasts needed (the next step says it) |
| Raw server strings ("OTP expired", "Invalid OTP") | Plain sentences (§5) |
| No way back from a failed step 3 | "Start again" (the existing step 1 transition) |
| Sideways slide and scale-in | The shared step motion |
| The three calls, the cooldown, the 3-second redirect, noindex | Unchanged |

## 12. Acceptance checklist

- [ ] The three payloads are byte-for-byte as today (`auth-pages.test.tsx` "preserves verify and password-reset payloads…" passes with the new labels).
- [ ] Enter submits step 1 (`"submits the email phase with Enter…"` passes).
- [ ] Pasting "Your AcadeGrade code is 482 913." fills 482913 and verifies without a tap; a wrong code stays selected and is not resent.
- [ ] Countdown starts at 60 after a send and at `cooldownRemaining` after a 429.
- [ ] Step 3 expired session shows "Start again", which returns to step 1 with the email filled.
- [ ] Done redirects to `/login` after 3 seconds and offers "Sign in now".
- [ ] Moves exactly like register (side-by-side screen recording); reduced motion: fades only.
- [ ] `inspect.mjs` 0 FAIL at 1440/768/390, light and dark.
- [ ] Tests updated: "Step 1 of 4" becomes "Step 1 of 3"; field names; the `complementary` proof landmark removed; done status text "Password changed".

## 13. Open items for the owner

1. **Account discovery.** Step 1 tells anyone whether an email has an account (the 404 "No account found"). Keep (clearer for students) or answer the same way for every email ("If that email has an account, we've sent a code")? That would be a server change, out of scope for the restyle. Recommended: decide before launch.
2. **Password length.** The page requires 8 characters but `/api/auth/password/reset` accepts 6 (older Android builds may rely on that). Align the server to 8 once old builds are gone?
3. Approve the "Start again" link on step 3 (the only behaviour addition).
