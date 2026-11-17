# Page plan · Sign in (`/login`)

A restyle. The flow, the calls and the redirects stay exactly as they are in `app/(public)/login/page.tsx`; only the look, the copy, the layout and the states change. It inherits `01`–`04` and follows the structure of `pages/home.md`. This plan also defines the auth pieces that `register.md` and `forgot-password.md` reuse (§8).

## 1. Purpose

- **Mode:** Operate. **Shell:** Auth (`04` §2).
- **Visitor:** a returning student, usually on a phone, often on results day; sometimes a new student who pressed "Sign in" by mistake; sometimes a student arriving from the calculator with unsaved courses.
- **First question:** "Is this the right place, and how do I get in?" Answer at once: the AcadeGrade mark, "Welcome back", Google first, email below.
- **One action:** **Sign in** (the email form's submit). Google is the alternative identity button (defended in §8.3). Everything else is a text link: Forgot password, Create a free account, Back to the site, Support, Get the Android app.

## 2. The argument (each block exists because of one claim)

| # | Claim | Proof on the page | Block |
|---|---|---|---|
| 1 | You are in the right place | The mark, the wordmark and "Welcome back" on a paper slip | Slip header |
| 2 | Your calculator courses are not lost | The handoff stub with the real course count | Handoff stub (only when present) |
| 3 | Getting in takes one tap or two fields | Google, then email and password | Form |
| 4 | Forgetting is fine | "Forgot password?" beside the field it concerns | Form |
| 5 | Signing in changes nothing | One line on the photograph's paper tab | Photograph (desktop) |
| 6 | You can always leave | "Back to the site", Support and the appearance control | Auth footer line |

## 3. First screen

### Desktop (1440×900)

- **Ground:** `--pg-ground`. Outer margins `--pg-margin` (32px here).
- **Left, columns 1–6: the sign-in slip** (Slip, quiet variant: stripe band, no table). It is 668px wide, as tall as its content, top-aligned 32px below the top edge, square corners, no shadow, padding 48px. In order:
  1. **Stripe band**, 40px, five flat blocks (`--pg-step-1…5`).
  2. **Mark and wordmark,** centred, the mark at 32px, linking to `/` (accessible name "AcadeGrade home").
  3. **h1** "Welcome back", centred, at `--pg-head` capped at 44px (the same cap as the home sheets).
  4. **Sentence** at body, centred, 16px below: "Sign in to see your record and pick up where you left off."
  5. **Handoff stub** (only when the calculator handoff exists; §5.2).
  6. **Continue with Google** (full width, 52px).
  7. **Perforation divider** with "or sign in with email" (§8.4).
  8. **Email** and **Password** fields (left-aligned, full width), "Forgot password?" right-aligned under the password field.
  9. **Form message** slot (empty until needed; §5.4).
  10. **Sign in** primary button, full width.
  11. **Below a perforation:** "New to AcadeGrade? Create a free account" (body, centred) and, on its own line at small, "Get the Android app".
- **Above the slip, on the ground:** nothing. The slip's own mark is the way home; the auth footer line carries "Back to the site".
- **Below the slip, on the ground, 24px down: the auth footer line** at small, left-aligned with the slip: "Back to the site · Support · Privacy notice", then the appearance control (System / Light / Dark) at the slip's right edge.
- **Right, columns 7–12: the photograph.** Full viewport height inside the margins, square corners, `position: sticky; top: var(--pg-margin)`. The UNN main gate, greyscale with the indigo cast (the same file as home hero frame 1, so it is already cached for visitors who came from home). Bottom-left, a paper tab (padding 16px 20px) carrying one line at lead: "Signing in never changes your saved results." and under it at small: "University of Nigeria, Nsukka".
- **Fit:** at 1440×900 everything from the stripe to the Sign in button is above the fold (about 780px with no handoff stub; with the stub the button sits at about 860px, still inside 900).

### Phone (390×844)

- **No photograph.** The phone downloads nothing for it (art direction with `getImageProps`, §6).
- **Compact header**, 60px, on the ground: the mark (28px) and wordmark linking home at left; "Back to site" text link at right.
- **The slip** runs full width inside the 16px margins, padding 24px, stripe band 40px. The h1 at 40px, the sentence at 17px, then Google, the divider, the fields, Forgot password, and Sign in at full width.
- **Fit:** the h1, Google, both fields and the Sign in button are on the first screen at 390×844 with the keyboard closed. With the cookie stub open, the slip gains bottom padding equal to the stub's height (`02` §4.11), so the stub never covers Sign in.
- **Footer line** under the slip: the same links, stacked in one wrapping row, and the appearance control on its own row.

### Why this works

- The page is one object with one job. No marketing nav competes with the form, but the way back is always visible.
- Google comes first because most students sign up with it and it is one tap; the email form is right under it and never hidden.

## 4. Copy deck (final wording; sentence case)

- **Title (tab):** "Sign in" (renders "Sign in | AcadeGrade").
- **h1:** "Welcome back"
- **Sentence:** "Sign in to see your record and pick up where you left off."
- **Google button:** "Continue with Google"; busy: "Opening Google…"
- **Divider:** "or sign in with email"
- **Email field:** label "Email"; placeholder "you@example.com"; errors "Enter your email" and "Enter a valid email address, like you@example.com".
- **Password field:** label "Password"; no placeholder; toggle "Show" / "Hide"; error "Enter your password".
- **Forgot link:** "Forgot password?"
- **Primary:** "Sign in"; busy: "Signing in…"
- **Below:** "New to AcadeGrade? Create a free account" · "Get the Android app"
- **Photograph tab:** "Signing in never changes your saved results." / "University of Nigeria, Nsukka"
- **Footer line:** "Back to the site · Support · Privacy notice" and the appearance control "Appearance: System / Light / Dark".
- **Handoff stub:** "Your 5 calculator courses are kept in this browser tab. After you sign in, add them as your first semester from Results." (1 course: "Your calculator course is kept in this browser tab. After you sign in, add it as your first semester from Results.")
- **Messages** (each replaces today's toast on this page; §5.4):

| When (today's trigger) | Message | Tone |
|---|---|---|
| Firebase error message contains `invalid` | "That email and password don't match. Check both, or reset your password." with "reset your password" linking to `/forgot-password` | error |
| `auth/too-many-requests` (today: generic) | "Too many tries. Wait a few minutes, or reset your password." | error |
| `auth/network-request-failed` (today: generic) | "No connection. Check your data and try again." | error |
| Any other sign-in error | "We couldn't sign you in. Please try again." | error |
| Google popup closed | "Google sign-in was closed before it finished." | neutral |
| Any other Google error | "Google sign-in didn't work. Try again, or use your email." | error |
| Auth state loading | "Checking your sign-in…" | status |
| Signed in, routing | "Opening your record…" | status |

- **Toasts kept** (they land on the next page, so they stay in the global toaster): after a complete profile "Welcome back." (Google: "Welcome back."); after an incomplete profile "Finish setting up your account to continue."; when the profile read fails "We couldn't load your profile. Please finish setting up." (routes to `/register` as today).

## 5. Sections (the slip's blocks, top to bottom)

### 5.1 Slip header

Stripe band, mark and wordmark, h1, sentence (see §3). The stripe band here is decorative (the full brand stripe); on register and forgot password the same band becomes the progress meter.

### 5.2 Handoff stub (conditional)

- **Logic carried:** `CalculatorHandoffNotice` reads `readCalculatorHandoff()` once after mount; nothing renders when the count is 0 or the handoff is older than 24 hours.
- **Look:** a `stub` slip inside the slip: `--pg-paper-2` fill, a notch on its left edge, padding 16px 20px, the sentence at small in ink. No calculator icon. `role="status"`.
- **Copy fix:** today it says "saved on this device"; the handoff lives in `sessionStorage`, so it is per tab. The new copy says "kept in this browser tab".

### 5.3 Form

- **Order and behaviour carried:** Google button (`signInWithGoogle`), divider, then a `<form aria-label="Sign in with email" noValidate>` with Email (`type="email"`, `autoComplete="email"`, `inputMode="email"`) and Password (`autoComplete="current-password"`). Email is trimmed and lower-cased before `signInWithEmail` (as today).
- **Routing carried:** after either sign-in, `routeAuthenticatedUser` reads `users/{uid}` and replaces to `/dashboard` when `isStudentProfileComplete`, otherwise `/register`. The `useEffect` that routes an already signed-in user stays.
- **Maintenance carried:** on mount, `config/settings.maintenanceMode === true` replaces to `/maintenance` (see `maintenance.md` §5.4 for the added return path).
- **Validation:** on submit, then on blur once touched (react-hook-form `mode: 'onTouched'`). Errors sit under each field (`02` §4.8) and focus moves to the first invalid field.
- **Show password:** a "Show" text button inside the field's right end (44×44 target), toggling `type`; it never submits and is announced as "Show password" / "Hide password". This is the only addition to the form; it helps phone typing and changes no flow.
- **Forgot password?** a text link, right-aligned under the password field, to `/forgot-password`.

### 5.4 Form message and error shake

- **Slot:** one message line above the Sign in button, rendered only when needed, at small with a text icon ("!" in a 20px ink square for errors, nothing for neutral). Error messages use `role="alert"`; neutral and status lines use `role="status"`.
- **Shake carried:** on a failed email sign-in the form shakes (today: x 0, -8, 8, -5, 5, -2, 2, 0 over 500ms). New: x 0, -6, 6, -3, 3, 0 over 400ms, transform only, skipped under reduced motion (`useReducedMotion`, as today).
- **The error is never only red:** the field bottom borders stay neutral for a credentials error (we do not know which one is wrong); the message says "Check both".

### 5.5 Below the form

A perforation, then "New to AcadeGrade? Create a free account" (link to `/register`) and "Get the Android app" (link to `/app/download/android`, which redirects to the admin-set APK; `MobileAppDownload compact` restyled, §11).

### 5.6 States

| State | What shows |
|---|---|
| `authLoading` | The same shell and slip header; in place of the form, three flat grey bars at field height and the line "Checking your sign-in…" (`role="status"`). No spinner card, no shadow. |
| Signed in (today: renders `null`, a blank page) | The slip header and "Opening your record…" (`role="status"`) while `router.replace` runs. |
| Google busy | The Google button keeps its width; label "Opening Google…" and a small spinner at its right; the email form stays usable. |
| Email busy | Sign in keeps its width; label "Signing in…" and spinner; fields read-only. |
| Error | §5.4. |
| Maintenance | Redirect before the form is used (no extra UI). |
| Offline | Sign-in fails with the network message in §4. |

## 6. Imagery for this page

| Slot | Picture | Source and licence | Treatment |
|---|---|---|---|
| Right half (desktop and tablet ≥ 1024px only) | University Gate, UNN Nsukka | Wikimedia Commons, by Favouridowu, CC BY-SA 4.0 (credit in the auth footer imprint) | Greyscale with indigo cast; 4:5 crop; the home hero file, AVIF under 180 KB |
| Phone | none | | |

- **Delivery:** `getImageProps()` art direction in a `<picture>`: a `<source media="(min-width: 1024px)">` with the AVIF/WebP set, and a 1×1 transparent fallback, so phones request nothing. `fetchPriority="high"` on desktop (it is the LCP element there).
- **Credit:** the auth footer line ends with a small imprint: "Photograph: University Gate, UNN, by Favouridowu, CC BY-SA 4.0, tinted". Shown only where the photograph shows.

## 7. Motion on this page

- **Signature (short version, `03` §3.1):** the slip rises 16px with opacity over 320ms and its stripe fills left to right, 60ms a block. Once per session (shared session-storage key with home, so a visitor who just saw the home hero gets no repeat).
- **Feedback:** button stripe on hover, 1px press; the Show toggle swaps instantly; the error shake (§5.4); the message line fades in over 160ms.
- **None:** no typewriter on the h1 (the `AUTH_TEXT_MOTION_CLASS` / `PublicTextMotion` effect is removed), no proof-list entrance, no animated meridian.
- **Reduced motion and data saver:** no rise, no stripe fill, no shake; everything visible at once.

## 8. Components

- **Used:** `AuthShell` (new), `Slip` (quiet variant), `Stripe`, `Field`, `PasswordField` (new), `GoogleButton` (new), `PerforationDivider` (new), `AuthMessage` (new), `Button`, `TextLink`, `Figure`, `Credit`, the appearance control from `PublicFooter`.
- **New data module:** `lib/public/auth-copy.ts` holds the copy deck and the message maps for login, register and forgot password (so tests and pages share one source), plus `messageForSignInError(err)` and `messageForOtpError(status, body)`.

### 8.1 AuthShell (replaces `components/auth/AuthShell.tsx`)

- **Desktop ≥ 1024px:** two columns on the 12-column grid: the slip in 1–6, the sticky photograph in 7–12 (§3). Between 768 and 1023px: the slip centred at 8 columns, the photograph dropped.
- **Phone:** compact header (mark, wordmark, "Back to site"), then the slip, then the footer line.
- **Props:** `title`, `sentence`, `photo` (one of the home set: gate, Faculty of Arts, lecture theatre), `reassurance` (the one line on the photograph's tab), `progress` (optional; `StepStripe` replaces the decorative stripe), `below` (the support line), `children`.
- **Landmarks:** `header` (phone only), `main aria-labelledby` the h1, the photograph as a `figure` with its caption, the footer line as `footer` with a `nav aria-label="Help and site links"`.
- **Removed from today's shell:** the eyebrow ("Student access", "Student onboarding", "Secure account recovery"), the proof aside with its icon list and the "DegreeMeridian" drawing, the card shadow, the radius, the "auth-disclaimer" line (its message moves onto the photograph tab).

### 8.2 PasswordField

`Field` plus the Show/Hide text toggle (§5.3). Used on login (current password), register (new password, confirm) and forgot password (new password, confirm).

### 8.3 GoogleButton (the one defended second button)

- Google's branding rules require the full-colour "G" mark inside a button shape, so this cannot be a text link. It is **not** a second primary: filled `--pg-paper-2` (one tone step on paper), ink label at body weight 500, the official G at 20px, 52px tall, square corners, no outline, no shadow. Hover: fill steps to `--pg-ground-2`. Focus: the gold outline.
- The ink-filled primary stays the only ink button on the screen. This is the defence for the inspector's "one primary" check and for `02` §4.4.

### 8.4 PerforationDivider (replaces `AuthDivider`)

A row of round 5px dots (the stationery perforation, `02` §3) on each side of a small label. `role="separator"` with the label as its accessible name. No hairlines.

### 8.5 AuthMessage

The single message line of §5.4: `tone` (error, neutral, status), optional inline link, `role` set from the tone. Replaces the page's error toasts and today's red `danger-dim` box.

## 9. SEO

- **Title:** "Sign in" (template gives "Sign in | AcadeGrade"). Today the layout exports only `NO_INDEX_METADATA`, so the tab shows the site default; add the title.
- **Description:** "Sign in to AcadeGrade to see your GPA, CGPA and degree class." (not indexed, but used if the link is shared).
- **Robots:** `NO_INDEX_METADATA` kept (noindex, nofollow, nocache). Not in the sitemap.
- **Open Graph:** the site default slip image.

## 10. Accessibility

- One h1 ("Welcome back"); the form has its accessible name "Sign in with email" (kept; tested).
- Labels above fields; hints and errors linked with `aria-describedby`; `aria-invalid` on invalid fields; focus to the first error on submit.
- The Show toggle is a real `button type="button"` with `aria-pressed` and a changing name.
- Messages: errors `role="alert"`; status lines `role="status"` (polite).
- The stripe band and perforations are `aria-hidden`.
- Keyboard: Tab order is mark, Google, Email, Password, Show, Forgot password, Sign in, Create a free account, Get the Android app, footer links, appearance control. Enter in either field submits.
- Touch targets 44px or more, including "Forgot password?" (padded to 44px tall) and footer links.
- The photograph's alt: "The main gate of the University of Nigeria, Nsukka".

## 11. Carried over, replaced and removed

| Today | In the redesign |
|---|---|
| `AuthShell` with eyebrow "Student access", proof aside ("Know where you stand…"), icon list, DegreeMeridian, card shadow | New `AuthShell`: slip plus campus photograph with one reassurance line; no eyebrow, no icons, no shadow |
| h1 typewriter / directional text motion | Static h1; slip laid down once |
| "Sign in to continue tracking your academic progress." | "Sign in to see your record and pick up where you left off." |
| Outlined Google button | `GoogleButton` on paper-2 (§8.3) |
| `AuthDivider` hairlines "Or sign in with email" | `PerforationDivider` "or sign in with email" |
| Placeholder "you@university.edu" | "you@example.com" (most students use personal email) |
| Error toasts plus a red box | One inline `AuthMessage`; success toasts that land on the next page are kept |
| Generic message for every non-`invalid` error | Specific lines for too many tries and no connection (copy only; same flow) |
| Blank page while routing a signed-in user | "Opening your record…" |
| Spinner card with shadow while checking auth | Grey field bars and "Checking your sign-in…" |
| `MobileAppDownload compact`: "Get the Android app • iOS coming soon" (the bullet renders as broken characters `â€¢` today) | "Get the Android app" only; an "iPhone" link appears only if `mobileAppLinks.iosUrl` is set; no "coming soon" |
| "Your academic data stays attached to your account and is never changed by signing in." | On the photograph tab: "Signing in never changes your saved results." |
| Unused `loginSchema` (zod) | Either wire it as the resolver or delete it; the rules (required, email pattern) stay identical |
| Calls, routing, maintenance redirect, handoff notice logic, noindex | Unchanged |

## 12. Acceptance checklist

- [ ] Email sign-in: trimmed, lower-cased email; complete profile → `/dashboard` with "Welcome back." toast; incomplete → `/register` (existing tests "normalizes credentials…" and "keeps incomplete authenticated accounts…" pass).
- [ ] Wrong password shows "That email and password don't match…" inline as `role="alert"`, shakes (not under reduced motion), and links to `/forgot-password`.
- [ ] Google: popup closed shows the neutral line; other failures the error line; success routes as above.
- [ ] `maintenanceMode` redirects to `/maintenance`; signed-in visitors never see the form.
- [ ] Handoff stub shows the right count and singular/plural, and nothing when there is no handoff.
- [ ] Phone 390×844: h1, Google, both fields and Sign in visible with the cookie stub open; no photograph requested (check the network panel).
- [ ] Desktop 1440×900: Sign in above the fold; photograph is the LCP element and loads under 180 KB.
- [ ] `inspect.mjs` 0 FAIL at 1440/768/390, light and dark; the image-count WARN is defended (Operate page, one photograph by design).
- [ ] Keyboard-only sign-in works; screen reader announces errors once.
- [ ] Tests updated for the new copy: `auth-pages.test.tsx` (the `complementary` landmark "Know where you stand…" becomes the photograph `figure`; the theme `radiogroup` "Choose colour theme" stays), `auth-shell.test.tsx` (new shell props).

## 13. Open items for the owner

1. Approve the "Show password" toggle (the only addition to the form).
2. Approve the specific lines for "too many tries" and "no connection" (mapped from Firebase error codes; no flow change).
3. Confirm the photograph per auth page: gate (sign in), Faculty of Arts (register), lecture theatre (forgot password), all from the home set.
