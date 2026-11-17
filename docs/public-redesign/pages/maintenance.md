# Page plan · Maintenance (`/maintenance`)

A restyle of `app/maintenance/page.tsx` in the minimal shell, with two additions the brief asks for: a support contact and an automatic re-check every 60 seconds that returns the visitor when maintenance ends. It inherits `01`–`04`, uses the `MinimalShell` from `share-transcript.md` §8.1, and follows the structure of `pages/home.md`.

## 1. Purpose

- **Mode:** System. **Shell:** Minimal.
- **Visitor:** a student sent here by the maintenance switch (`config/settings.maintenanceMode`) from sign in, register or any student page, usually mid-task on a phone. Sometimes someone with an old bookmark.
- **First question:** "Is something wrong with my account, and when can I get back in?" Answer: nothing is wrong with you; AcadeGrade is being updated; this page brings you back by itself.
- **One action:** **Check now**. Text links: Go to the home page, and the support contact.

## 2. The argument (each block exists because of one claim)

| # | Claim | Proof on the page | Block |
|---|---|---|---|
| 1 | This is planned work, not your fault | Calm heading and sentence; no red, no alarm icon | The slip |
| 2 | You don't need to keep refreshing | "This page checks every minute" and a "Last checked" time | Re-check line |
| 3 | You will land where you were | The return path, said in words ("We'll take you back to your dashboard") | Re-check line |
| 4 | You can reach a person | The support email | Slip foot |

## 3. First screen

### Desktop (1440×900)

- `MinimalShell` header; on the ground, a centred `stub` slip 560px wide, padding 48px, square, flat:
  1. Stripe band 40px (static).
  2. Mark (32px) centred.
  3. h1 "AcadeGrade is being updated", centred, at `--pg-head` capped at 44px.
  4. Sentence at body, centred, 40ch: "We're making some improvements and will be back shortly. Your saved records are not affected."
  5. Re-check line at small, soft ink: "This page checks every minute and takes you back to your dashboard when we're done. Last checked 14:32."
  6. Primary **Check now**, centred.
  7. A perforation, then the slip foot at small: "Need something urgently? Write to support@acadegrade.app" (the configured address) and "Go to the home page".
- The whole slip is on the first screen.

### Phone (390×844)

- Header 60px; the slip full width inside 16px margins, padding 24px; h1 at 40px over two lines; the button full width. Everything on the first screen.

### Why this works

- It reads as a notice pinned by the department, not an error: plain words, the brand stripe, one thing to do.

## 4. Copy deck (final wording; sentence case)

- **Title (tab):** "Back soon" ("Back soon | AcadeGrade").
- **h1:** "AcadeGrade is being updated"
- **Sentence:** "We're making some improvements and will be back shortly. Your saved records are not affected." (the second sentence needs owner confirmation, §13)
- **Re-check line** (the destination in words, from `next`): "This page checks every minute and takes you back to {your dashboard | sign in | registration | where you were} when we're done. Last checked {HH:MM}."
- **Checking:** button label "Checking…" (busy); the line reads "Checking now…".
- **Back:** "We're back. Taking you there…" (announced).
- **Check failed** (offline or Firestore unreachable): "Couldn't check just now. We'll try again in a minute." (quiet, not red).
- **Primary:** "Check now".
- **Foot:** "Need something urgently? Write to {email}" or, with no configured email, "Need something urgently? Visit Support" (`/support`); "Go to the home page".

## 5. Sections

### 5.1 The notice slip

- Server component. No icon (today a red `AlertTriangle` in a red circle), no promised end time (no data for one).
- The stripe band is static; nothing loops while the visitor waits (`03` §1).

### 5.2 Support contact

- `getContactEmail()` on the server (admin `config/about.contactEmail`, then `NEXT_PUBLIC_SUPPORT_EMAIL`, then none). It is cached for 300 seconds and fails open, so the page still renders when Firestore is down; with no email the link is `/support`.
- `contactHref(email, 'During maintenance')` gives a `mailto:` with that subject.

### 5.3 Re-check (client island `MaintenanceWatch`)

- **Source:** `config/settings` is publicly readable (`firestore.rules`: `match /config/settings { allow read: if true; }`), so the client SDK's `getDocument('config/settings')` works signed out.
- **When:** once on mount, then every 60 seconds while the tab is visible; immediately when the tab becomes visible again (`visibilitychange`) or the browser comes back online (`online`); and on **Check now**. Paused while hidden, so a background tab costs nothing.
- **Decision:** `maintenanceMode !== true` means maintenance has ended: show "We're back. Taking you there…" for one second, then `router.replace(next)`.
- **Failure:** keep the page and the last time; show the quiet line in §4. Never redirect on a failed read.
- **Data cost:** one small document read per minute while visible; no listener held open.
- **No JavaScript:** the page shows the notice and a "Check now" link that reloads `/maintenance` (a plain `<a href>`), and the home link.

### 5.4 Return path (`?next=`)

- **The gap today:** login, register and the student layout all call `router.replace('/maintenance')`, which forgets where the visitor was, so nothing can return them.
- **Plan:** one helper, `maintenanceHref(path)` in `lib/platform/maintenance-link.ts`, used at those three call sites: `/maintenance?next=/login`, `/maintenance?next=/register`, and for student pages the current path with its query (`/maintenance?next=/results/abc?importCode=XYZ`).
- **Safety:** `next` is accepted only if it starts with a single `/`, does not start with `//`, `/\` or `/maintenance`, and is under 512 characters; otherwise it is `/`. The words in the re-check line come from the path: `/dashboard` and student paths "your dashboard" or "where you were", `/login` "sign in", `/register` "registration", anything else "where you were".
- Student pages re-check auth on arrival as usual, so returning a signed-out visitor to a student path simply leads to sign in.

### 5.5 States

| State | What shows |
|---|---|
| Waiting | §3 |
| Checking | Button busy "Checking…"; line "Checking now…" |
| Ended | "We're back. Taking you there…" (`role="status"`), then the redirect |
| Check failed | Quiet line; next try in a minute |
| Opened with maintenance already off (old bookmark) | The first check redirects to `next` (or `/`) within a moment |

## 6. Imagery for this page

- None. The page must load on a weak connection while services are busy; the inline SVG mark and the stripe are all it needs. Image-floor WARN defended (System page).

## 7. Motion on this page

- The slip appears without an entrance (a system page should not perform).
- "We're back" fades in over 160ms.
- No spinners or animated dots while waiting; the button's busy spinner shows only during an actual check.

## 8. Components

- **Used:** `MinimalShell`, `Slip` (`stub`), `Stripe`, `Button`, `TextLink`.
- **New:** `MaintenanceWatch` (client island, about 1 KB plus the Firestore client already in the bundle); `maintenanceHref()` and `safeNext()` pure helpers with tests.

## 9. SEO

- **Robots:** add `NO_INDEX_METADATA` (today the page has no metadata and is indexable).
- **Title:** "Back soon". Not in the sitemap.

## 10. Accessibility

- One h1; the re-check line is ordinary text (the "Last checked" time is not a live region, so nothing is read out every minute); only the "We're back" line is `role="status"`.
- The support link names the address; the home link and the button are 44px.
- Contrast as the rest of the site; no meaning carried by colour.

## 11. Carried over, replaced and removed

| Today | In the redesign |
|---|---|
| Red `AlertTriangle` in a red circle | Removed; the stripe and the mark |
| "Under Maintenance" (Title Case) | "AcadeGrade is being updated" |
| "…undergoing scheduled maintenance to improve your experience. Please check back later." | "We're making some improvements and will be back shortly." |
| No logo, no contact, no re-check, indexable | Mark in the minimal shell, support contact, 60-second re-check with return, noindex |
| Redirects from login, register and student layout to `/maintenance` | The same redirects, with `?next=` |

## 12. Acceptance checklist

- [ ] With maintenance on, sign in, register and a student page each land here with the right `next`.
- [ ] Turning maintenance off in the admin returns an open page within 60 seconds (or at once on Check now), to the right place.
- [ ] Hidden tab: no reads; becoming visible triggers a check.
- [ ] Offline: no redirect, quiet line, recovers when back online.
- [ ] `next=//evil.example` and `next=/maintenance` fall back to `/`.
- [ ] Renders with Firestore unreachable (shell and copy; contact falls back to `/support`).
- [ ] noindex present; `inspect.mjs` 0 FAIL at 1440/768/390, light and dark.

## 13. Open items for the owner

1. Confirm the sentence "Your saved records are not affected." (true for ordinary maintenance; if you ever run data migrations behind the switch, drop it).
2. Approve the `?next=` change at the three redirect call sites (login, register, student layout).
3. The redirect to this page is web-only (the Android app does not show a maintenance screen; several APIs answer `503 MAINTENANCE`). The page copy does not mention devices; confirm that is right.
