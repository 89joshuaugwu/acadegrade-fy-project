# Page plan · Offline (`/offline`)

A restyle of `app/offline/page.tsx` in the minimal shell, and a correction: today the page says "your last saved data is still available on your device", which is false. Service workers are unregistered on every load (`components/shared/ServiceWorkerKill.tsx` removes all registrations and caches) and nothing of the record is stored for offline use on the web. It inherits `01`–`04`, uses the `MinimalShell` from `share-transcript.md` §8.1, and follows the structure of `pages/home.md`.

## 1. Purpose

- **Mode:** System. **Shell:** Minimal.
- **How visitors arrive:** the Serwist worker (`app/sw.ts`) still lists `/offline` as the document fallback, so a visitor whose worker has not yet been removed can be shown this page when a navigation fails; anyone can also open `/offline` directly.
- **Visitor:** a student whose data ran out or whose network dropped, on a phone.
- **First question:** "Is my record gone, and what can I do now?" Answer honestly: nothing loads without a connection on the web, the record is safe on the account, try again when the connection is back; on Android, the app's timetable and reminders keep working offline.
- **One action:** **Try again**.

## 2. The argument (each block exists because of one claim)

| # | Claim | Proof on the page | Block |
|---|---|---|---|
| 1 | You're offline, and that is the only problem | Plain heading and sentence | The slip |
| 2 | Your record is safe | "It's saved on your account, not on this phone." | The slip |
| 3 | You don't need to keep tapping | The page notices when the connection returns | Status line |
| 4 | Something does work offline | The Android app's timetable and reminders | Slip foot |

## 3. First screen

### Desktop (1440×900)

- `MinimalShell` header; a centred `stub` slip 560px wide, padding 48px: stripe band 40px; mark 32px; h1 "You're offline" at `--pg-head` capped at 44px; the two sentences (§4) at body, 40ch; the status line at small; **Try again**; a perforation; the Android line at small.

### Phone (390×844)

- Header 60px; the slip full width inside 16px margins, padding 24px; h1 at 40px; **Try again** full width. Everything on the first screen.

### Why this works

- It says what is true and what to do. The one helpful fact (the Android app works offline for timetables) is offered without a hard sell.

## 4. Copy deck (final wording; sentence case)

- **Title (tab):** "You're offline" ("You're offline | AcadeGrade").
- **h1:** "You're offline"
- **Sentences:** "AcadeGrade needs a connection to load your record on the web. Your record is safe: it's saved on your account, not on this phone."
- **Status line:** offline "We'll notice when your connection is back."; back online "You're back online." (announced).
- **Primary:** "Try again" (back online: the same button, now the obvious next step).
- **Android line:** "On Android? The AcadeGrade app keeps your timetable and reminders working without data." with "Get the Android app" (`/app`).
- **No-JavaScript line:** the same copy, and "Try again" as a plain link.

## 5. Sections

### 5.1 The slip

- A server component with all copy in the HTML; nothing on it needs the network: the mark is inline SVG, no photographs, no web font required (the font falls back to `system-ui` if Hanken Grotesk is not cached; the layout holds because nothing depends on its metrics).

### 5.2 Try again and the connection watch (client island `OfflineWatch`)

- **Try again:** if the current URL is not `/offline` (the worker served this page in place of the one requested), it reloads the same URL (`location.reload()`), so the student gets the page they wanted. If the URL is `/offline` itself, it goes to `history.back()` when there is history, otherwise to `/`.
- **Watch:** listens to the browser's `online` and `offline` events and reads `navigator.onLine` on mount. On `online`, the status line changes to "You're back online." and focus is not moved; it does not reload by itself (a student may be reading), the button does.
- **Opened while online** (`navigator.onLine === true` on mount): the status line reads "You're back online." from the start.

### 5.3 States

| State | Status line | Button |
|---|---|---|
| Offline | "We'll notice when your connection is back." | Try again |
| Back online / opened online | "You're back online." (`role="status"`) | Try again |
| No JavaScript | none | Try again (plain link to `/`) |

## 6. Imagery for this page

- None, by necessity: a page shown without a connection cannot rely on any request. Image-floor WARN defended.

## 7. Motion on this page

- None on load. The status line swaps with a 160ms fade. Reduced motion: an instant swap.

## 8. Components

- **Used:** `MinimalShell`, `Slip` (`stub`), `Stripe`, `Button`, `TextLink`.
- **New:** `OfflineWatch` (client island, well under 1 KB).
- **Removed:** the `WifiOff` icon in a tinted circle, the large `Logo` (the shell carries the mark), the "Return to Dashboard" pill link.

## 9. SEO

- **Robots:** add `NO_INDEX_METADATA` (today the page has no metadata).
- **Title:** "You're offline". Not in the sitemap.

## 10. Accessibility

- One h1; the "back online" line is `role="status"`; the offline line is plain text.
- Try again is a real button (a link without JavaScript), 52px, full width on phones.
- No information carried by colour; no icon needed.

## 11. Carried over, replaced and removed

| Today | In the redesign |
|---|---|
| "Don't worry, your last saved data is still available on your device." (false) | "Your record is safe: it's saved on your account, not on this phone." |
| "Return to Dashboard" (fails while offline, and many visitors are signed out) | **Try again** (reloads what they asked for) |
| `WifiOff` icon in a tinted circle; Bricolage h1 | The stripe and mark; Hanken Grotesk |
| No mention of what works offline | The Android timetable and reminders line |
| No metadata | noindex, title |
| The Serwist fallback route `/offline` | Kept as is (see §13) |

## 12. Acceptance checklist

- [ ] No sentence claims that anything of the record is available offline on the web.
- [ ] With the network off in DevTools: the page renders with no failed requests that change the layout; Try again reloads the requested URL.
- [ ] Switching the network back on shows "You're back online." without a reload.
- [ ] Opened directly at `/offline` while online: "You're back online."; Try again goes back or home.
- [ ] noindex present; `inspect.mjs` 0 FAIL at 1440/768/390, light and dark.

## 13. Open items for the owner

1. The build still generates `public/sw.js` with Serwist while every page load unregisters it (`ServiceWorkerKill`). Decide later whether to remove Serwist from the build (then `/offline` is only reachable directly) or bring a real offline mode back. This plan works either way and promises nothing that is not there.
2. Confirm the Android line: timetables and reminders work offline in the app (per `PRODUCT.md`); anything else to name?
