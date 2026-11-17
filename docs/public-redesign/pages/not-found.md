# Page plan · Page not found (404, `app/not-found.tsx`)

A restyle of the 404 page built on 17 November in the old style. It moves into the minimal shell and uses the stationery idea directly: a result slip that found no matching course. Links to home, the calculator and the dashboard are carried. It inherits `01`–`04`, uses the `MinimalShell` from `share-transcript.md` §8.1, and follows the structure of `pages/home.md`.

## 1. Purpose

- **Mode:** System. **Shell:** Minimal.
- **Visitor:** someone who followed a broken or mistyped link (an old shared link, a typo like `/resluts`, a page that moved), signed in or not, often on a phone.
- **First question:** "Did I break something, and where do I go?" Answer: nothing was changed; here are the three places people usually want.
- **One action:** **Go to the home page**. Text links: the CGPA calculator, the dashboard.

## 2. The argument (each block exists because of one claim)

| # | Claim | Proof on the page | Block |
|---|---|---|---|
| 1 | The address found nothing | A result slip whose only row is "404 · No page at this address · 0 units" | The slip |
| 2 | Nothing on your record changed | One plain sentence under the slip's table | Slip body |
| 3 | The way on is one tap | Home, calculator, dashboard | Slip foot |

## 3. First screen

### Desktop (1440×900)

- `MinimalShell` header; on the ground, a centred slip 640px wide (Slip `result` variant), padding 48px:
  1. Stripe band 40px.
  2. Centred header: mark (24px), h1 "We can't find that page" at `--pg-head` capped at 44px, and the meta line at small: "Requested: /resluts" (the path the visitor asked for).
  3. **The table** (a real `<table>`, body size, tabular figures): header row "Code · Course title · Units · Grade"; one row "404 · No page at this address · 0 · –".
  4. Sentence at body under the table: "The link may be mistyped, or the page may have moved. Your results are safe; nothing was changed."
  5. A perforation, then the foot bar (ink, paper text): "Pages found" at left, "0" at right.
  6. Under the foot bar: primary **Go to the home page** at full slip width, then one row of text links: "Open the CGPA calculator" · "Signed in? Go to your dashboard".
- **Optional photograph** (only if a suitable open-licence picture is found, §6): a small greyscale notice-board photograph, 3:4, 200px wide, tipped in at the slip's top-right corner and rotated 2°, like a notice pinned beside the slip. Without one, the slip stands alone.

### Phone (390×844)

- Header 60px; the slip full width inside 16px margins, padding 20px; h1 at 40px over two lines; the table row keeps its four cells (they are short); the button full width; the two links stacked. Everything on the first screen. No photograph on phones.

### Why this works

- Every student knows the slip and knows what a row with no grade means. The joke is gentle and the way out is immediate.

## 4. Copy deck (final wording; sentence case)

- **Title (tab):** "Page not found" (kept).
- **h1:** "We can't find that page" (kept; tested `/can.t find that page/i`).
- **Meta line:** "Requested: {path}" (path only, no query string, cut to 40 characters with an ellipsis); without JavaScript "Requested: this address".
- **Table caption** (visually hidden): "Result for this address".
- **Row:** Code "404" · Course title "No page at this address" · Units "0" · Grade "–" (a grey dash).
- **Sentence:** "The link may be mistyped, or the page may have moved. Your results are safe; nothing was changed."
- **Foot bar:** "Pages found" · "0".
- **Primary:** "Go to the home page" (`/`).
- **Links:** "Open the CGPA calculator" (`/calculator`) · "Signed in? Go to your dashboard" (`/dashboard`).

## 5. Sections

### 5.1 The slip

- Server component (it exports the metadata), with one tiny client island, `RequestedPath`, that reads `usePathname()` for the meta line. Everything else is static HTML, so the page renders when services are down.
- No icon (today a `Compass` in a tinted circle), no "ERROR 404" eyebrow in tracked capitals: the "404" lives in the slip's Code column, where a code belongs.

### 5.2 Links

- Three destinations carried from today: home, calculator, dashboard. The dashboard link stays a text link for everyone (the 404 cannot know cheaply whether the visitor is signed in, and a signed-out visitor who taps it is sent to sign in by the student layout).

## 6. Imagery for this page

| Slot | Picture | Source and licence | Treatment |
|---|---|---|---|
| Optional, desktop only | A departmental notice board at a Nigerian university | To find with `assets.mjs "notice board university Nigeria"` (CC0, BY or BY-SA only; credit in the imprint line) | Greyscale with indigo cast, 3:4, 200px, AVIF under 40 KB, `loading="lazy"` |

- If no honest picture is found, there is none; the slip carries the page. Image-floor WARN defended (System page).

## 7. Motion on this page

- The short "laid down" move for the slip (rise 16px, stripe fill), once per load; the tipped-in photograph, if present, settles from 4° to 2° after the slip (320ms).
- Reduced motion: everything in place at once.

## 8. Components

- **Used:** `MinimalShell`, `Slip` (`result`), `Stripe`, `Button` (as a link), `TextLink`, `Figure` (optional photograph).
- **New:** `RequestedPath` (client island).
- **Removed:** the large `Logo`, the `Compass` icon tile, the "ERROR 404" eyebrow, the rounded pill links with Home and Calculator icons.

## 9. SEO

- **Robots:** noindex, nofollow (kept). Next.js sends the 404 status (kept).
- **Title:** "Page not found". Not in the sitemap.

## 10. Accessibility

- One h1; the slip's table has a caption and column headers; the dash in the Grade cell has the accessible text "no grade".
- The requested path is plain text (never a link).
- Primary and links 44px or more; focus visible with the gold outline.
- The optional photograph has alt text describing the notice board, or is omitted.

## 11. Carried over, replaced and removed

| Today | In the redesign |
|---|---|
| No shell, large logo, `Compass` icon tile | `MinimalShell` and the result slip |
| "ERROR 404" tracked capitals above the h1 | "404" in the slip's Code column |
| h1 "We can't find that page" | Kept |
| "The link may be mistyped or the page may have moved. Your results are safe; nothing was changed." | Kept, with a comma |
| "Go to home" pill + "Open the calculator" outlined pill | One primary "Go to the home page" + text link "Open the CGPA calculator" |
| "Already have an account? Go to your dashboard" | "Signed in? Go to your dashboard" |
| noindex, 404 status | Kept |

## 12. Acceptance checklist

- [ ] An unknown URL returns status 404 with the slip, and the meta line shows the requested path without its query string.
- [ ] Home, calculator and dashboard links resolve.
- [ ] Renders with JavaScript off ("Requested: this address") and with Firestore unreachable.
- [ ] noindex present; `inspect.mjs` 0 FAIL at 1440/768/390, light and dark.
- [ ] `not-found-page.test.tsx` updated: the h1 regex stays; link names become `/go to the home page/i`, `/open the cgpa calculator/i`, `/go to your dashboard/i`.

## 13. Open items for the owner

1. Use a notice-board photograph if a good open-licence one exists, or keep the slip alone?
2. Should the 404 also offer "Free tools" (`/tools`) or "Support"? Today it offers three ways; the plan keeps three.
