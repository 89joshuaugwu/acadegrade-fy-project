# Page plan · Privacy notice (`/privacy`)

Inherits `01`–`04` and follows the structure of `pages/home.md`. Anything not stated here follows those files. This plan also defines the **shared legal layout** (`LegalDocument`), which `pages/legal-terms.md` uses too; that plan repeats the layout so it stands alone, and where the two ever differ on the shared layout, this file wins.

## 1. Purpose

- **Mode:** Read.
- **Visitors:**
  - a student deciding whether to sign up, or one asked by the app to review a new version (`RequirementsGate`);
  - a parent or guardian of an under-18 student;
  - a Google Play reviewer, an ad network or a regulator checking the NDPA disclosures;
  - someone who followed "Privacy notice" from the cookie stub, the footer, Settings or the sign-up consent step.
- **First question:** "What do you do with my data, and what can I do about it?" Answer within five seconds: *the title, the admin summary, the version and date, and a contents list whose entries name the answers (AI providers, sharing, where data is stored, how long, your rights).*
- **One action:** none is pushed. The page has no primary button: reading is the task. Every route out is a text link (contents, in-text links, the tear-off strip).
- **What must never change:** the text is the admin-published version from Firestore with the built-in fallback; this plan changes only how it is set, never what it says (content problems found are listed for the owner in §13).

## 2. The argument (each section exists because of one claim)

| # | Claim | Proof on the page | Section |
|---|---|---|---|
| 1 | This is the current, dated notice | Title, summary, version and effective date as plain text, the reading time | Document head |
| 2 | You can find your question without reading everything | A contents list that stays beside the text and shows where you are | Contents |
| 3 | The notice is readable, not fine print | A long document set on paper at body size, 68-character lines, tables that work on a phone | The notice |
| 4 | You can keep a copy and find related rules | Version again, print or save as PDF, links to Terms, deletion, cookie choices and support | Tear-off strip |

## 3. First screen

### Desktop (1440×900)

- **Composition:** "Document sheet with sticky contents", built from two blueprints:
  - `list-printed-menu-sheet` (The printed menu sheet) for the document: one tall paper sheet, square corners, top and bottom edges cut into shallow scallops, set like a printed card at its head.
  - `list-sticky-photo-active-list` (Sticky photograph, active list) for the geometry of the contents: a sticky left column and an active row that follows the reader. The blueprint's photograph is dropped (a legal text has no honest picture), and the list takes the sticky column itself.
- **Ground:** `--pg-ground`, 64px between the header and the sheet.
- **Columns:**
  - Columns 1–3: the **contents**, `position: sticky; top: 96px` (header 72 + 24), `max-height: calc(100svh - 120px)` with its own scroll if a long document needs it.
  - Columns 4–11: the **sheet** (about 900px), 64px padding, so the text measure is about 770px, held to 68ch at body.
  - Column 12 stays empty (it keeps the measure honest; the sheet is not stretched).
- **The document head** (on the sheet, centred like a printed slip's header, `02` §4.5):
  1. the AcadeGrade mark, 24px;
  2. the **h1** at `--pg-head` (64px), the published `title` ("Privacy notice");
  3. the published `summary` at `--pg-lead`, centred, held to 52ch (three lines for today's text);
  4. the **meta line** at `--pg-small` in soft ink, plain text, no pill: "Version 2026-11-13 · Effective 13 November 2026 · About 10 minutes to read";
  5. when the published version has a change note: a second line at small, "What changed: {changeNote}" (see §8);
  6. a perforation (a row of 5px round dots in `--pg-ground`) across the full sheet width, 40px below.
- **Then the body** begins on the left edge of the measure with the first section's h2.
- **Above the fold at 900px:** header 72 + 64 + scallop 12 + padding 64 + mark 24 + 16 + h1 64 + 24 + summary about 105 + 16 + meta 22 + 40 perforation = about 523px; the first section heading and its first paragraph are visible, and the full contents list beside them.

### Phone (390×844)

- The sheet spans the width inside the 16px margins, 20px padding, scallops kept top and bottom.
- Head: the mark, the h1 at head (32px) on one line, the summary at lead (20px), the meta line at small (wrapping to two lines: "Version 2026-11-13 · Effective 13 November 2026" / "About 10 minutes to read").
- Under the perforation: the contents as a native `<details>` (closed), summary "Contents · 13 sections" at body weight 500 with the house chevron; open, it lists the same links at body with 44px rows.
- Then the body. The first section heading is visible on the first screen with the cookie stub open.

### Why this works

- **Fast:** title, date and the map of the document fill the first screen; the reader jumps straight to "How long we keep information" or "Your rights".
- **Specific:** the notice is printed on the same paper as every AcadeGrade slip, so it reads as part of the product, not as a pasted policy.

## 4. Copy deck (final wording; sentence case; checked against the two-line rule)

The document's own words (title, summary, sections) come from the published version and are not rewritten here. The page adds only these strings:

- **Meta line:** "Version {version} · Effective {formatLegalDate(effectiveDate)} · About {n} minutes to read" (`n` = words ÷ 200, rounded up; today about 10).
- **Change note line** (only when present): "What changed: {changeNote}".
- **Contents heading** (desktop, small, weight 500): "Contents". Phone summary: "Contents · {count} sections".
- **Tear-off strip:**
  - "Privacy notice · Version {version} · Effective {date}"
  - text button "Print or save as PDF"
  - links "Terms of use" (`/terms`), "Delete your account" (`/account-deletion`), "Cookie choices" (`#cookie-choices`), "Support" (`/support`).
- **Naming, sitewide (the cookie fix):** the document is always **"Privacy notice"** and the other one **"Terms of use"**, in sentence case. The strings to change are listed in §11 (web and Android), including the cookie banner's "Read our Privacy Policy".
- **Removed:** the pill-shaped "Version · Effective" badge (replaced by the plain meta line).

## 5. Sections

### 5.1 Document head

- **Composition:** see §3.
- **Data:** `getPublishedLegal('privacy')` (`lib/legal/server.ts`), unchanged order: the version named by `config/legal.privacyVersion`, else the most recently published version in `legal_documents/privacy/versions`, else `BUILTIN_LEGAL.privacy` (`lib/legal/builtin.ts`). Any read error falls back to the built-in text, so the page never fails.
- **States:**
  - **Published** (`source: 'published'`): the admin's title, summary, version, effective date, body.
  - **Built-in** (`source: 'builtin'`): the same layout with the built-in text; nothing tells the visitor which source is live (both are complete, production notices).
  - **Empty summary** (allowed by `validateLegalDraft`): the summary line is not rendered and the meta line moves up.
  - **Draft** (`draft` prop; never used on a public route): a plain-text line in `--pg-mark` above the h1, "Draft — pending legal review" (`LEGAL_DRAFT_NOTICE`), no border, no badge. Kept so an admin preview can use the same component.
- **Freshness:** `export const revalidate = 300`; a publish in Admin > Legal documents calls `revalidatePath('/privacy')` (`app/api/admin/legal/documents/[doc]/publish/route.ts`), so the new version is live at once.

### 5.2 Contents

- **Data:** the parsed sections (`parseLegalMarkup(legal.body).sections`), each `{ id, title }`.
- **Desktop:** an `<ol>` in a `<nav aria-label="Privacy notice contents">`. Each item is a link to `#{id}` at small, 44px tall, in soft ink, with the list's own decimal markers in soft ink (a real ordered list: the order of a legal text matters; no "01" styling).
  - **Active row:** the section currently in view (an `IntersectionObserver` over the section headings, rootMargin `-96px 0px -60% 0px`) gets `aria-current="location"`, full ink at weight 500 and a 3px ink bar on its left (a filled bar, like the header's current-page underline, not a hairline). Without JavaScript the list is plain links.
  - **Long titles** ("How we use information, and why we are allowed to") wrap to two lines inside the 44px-minimum row.
- **Phone:** the `<details>` from §3. Choosing a link closes it and jumps to the section.
- **Scroll:** anchor jumps use `scroll-behavior: smooth` (instant under reduced motion), and every section has `scroll-margin-top: 96px` so its heading is never under the header.

### 5.3 The notice (the body)

Rendered by `renderLegalSections(sections, email)` (`lib/legal/render.tsx`), whose block and inline types come from `lib/legal/markup.ts`. Every markup feature has a set style:

| Markup | Element | Style on the sheet |
|---|---|---|
| `## Heading {#id}` | `<section id aria-labelledby>` with `<h2 id="{id}-title">` | h2 at `--pg-lead`, weight 500, tracking -0.01em; 64px above (0 for the first), 16px below |
| Paragraph | `<p>` | body, leading 1.55, full ink, 16px between paragraphs, max 68ch |
| `- item` | `<ul><li>` | body; 8px between items; `::marker` in soft ink; 24px indent |
| `\| A \| B \|` table | `<table>` with `<th scope="col">` | Head cells at small, weight 500, soft ink, on `--pg-paper-2`; body cells at body; alternate rows on `--pg-paper-2`; 12px cell padding; 1px row lines are allowed inside the table (`02` §2) but not needed |
| `**bold**` | `<strong>` | weight 500 (the house face has no bold) |
| `[label](/path)` | Next `<Link>` | Text link: ink, 2px underline offset 4px, 3px on hover |
| `[label](#anchor)` | `<a>` | Same; `#cookie-choices` reopens the cookie stub through the existing hash listener (`COOKIE_CHOICES_HASH`) |
| `[label](https://…)` | `<a rel="noopener noreferrer">` | Same, **no new tab** on public pages (`03` §4); in print the address follows in brackets |
| `{{contact}}`, `{{contact:Subject}}` | `LegalContact` | Email set: the address as a `mailto:` link with the subject; no email: "the AcadeGrade support page" → `/support` (unchanged) |

- **Tables on a phone:** below 640px each row becomes a stacked block: every cell shows its column heading above its value (from a `data-label` attribute the renderer adds, taken from the head cell's text), with 16px between rows and the row fill kept. No horizontal scroll, no truncation. Both privacy tables (lawful basis; retention) read as "What we do / Lawful basis" pairs.
- **Safety:** unchanged. React escapes all text; only `/`, `#` and `https://` links are allowed (`isSafeLegalHref`); unknown tokens render literally.
- **Today's sections** (built-in 2026-11-13, for checking the layout): Who runs AcadeGrade · Information we collect · How we use information, and why we are allowed to · AI processing and result scanning · Who we share information with · Where your data is stored · How long we keep information · Ads, cookies and your consent · Users under 18 · Your rights and how to use them · Complaints · Security and data breaches · Changes to this notice (13 sections, two tables, about 2,000 words).

### 5.4 Tear-off strip (geometry from the sheet variant of `about-founders-letter`)

- After the last section: a row of 5px round dots across the sheet, then a 72px strip on `--pg-paper-2` (taller on phones) at small:
  - left: "Privacy notice · Version 2026-11-13 · Effective 13 November 2026";
  - right: "Print or save as PDF" (a text-styled `<button>` that calls `window.print()`, rendered by a tiny client island; absent without JavaScript, where the browser's own print still works), then the four related links.
- The sheet's scalloped bottom edge follows the strip.
- **Phone:** the strip stacks: the version line, the print button (44px), then the links in two columns.

### 5.5 Footer

The shared `PublicFooter`. Its "Help and legal" group reads "Privacy notice" (current page: `aria-current="page"` and the 3px underline).

### 5.6 Print (`@media print`, in `public.css`, applied to every legal page)

- **Hidden:** the skip link, `PublicHeader`, the contents, the cookie stub, the footer, the print button, the scallop and perforation shapes, and all motion.
- **Page:** `@page { size: A4; margin: 18mm 16mm 20mm; }`; white background, `#000` text, no ground colour (the user prints paper, not the desk).
- **Type:** Hanken Grotesk at 10.5pt body, leading 1.45; h1 20pt; h2 12.5pt weight 500; small 8.5pt. Same five-step logic, print sizes.
- **Head and end:** the document head prints once at the top (title, summary, meta line), followed by the page address in small type, "acadegrade.vercel.app/privacy" (from `resolveSiteUrl()`, so it follows the custom domain). The tear-off strip's version line stays visible in print and closes the document. Browsers do not support running headers, so no per-page header is attempted; the browser's own page numbers are left on.
- **Links:** external links print their address after the label (`a[href^="https"]::after { content: " (" attr(href) ")"; }`); internal links print the site address plus path; `mailto:` links already show the address.
- **Breaks:** `h2 { break-after: avoid; }`, `tr, li { break-inside: avoid; }`, `p { orphans: 3; widows: 3; }`; tables keep their head on every page (`thead { display: table-header-group; }`).
- **Check:** print preview in Chromium and Firefox fits today's notice on about 6 A4 pages, with no clipped table.

## 6. Imagery for this page

- **None in the content area.** A legal text has no honest photograph, and a decorative one would slow the page for people on mobile data. The only picture is the footer stamp (UNN gate). The tasteskill floor of four pictures is waived for legal pages; the inspector report records this as a defended exception (Read mode, `04` §1).
- **Drawn in code:** the sheet's scallops, the perforation and the AcadeGrade mark.

## 7. Motion on this page

- **Mode rule:** Read page; entrances only (`03` §5), and **body text never moves**.
- **Load:** the sheet is laid down (rise 24px with opacity, 640ms), and the contents items enter one after another (opacity and an 8px rise, 30ms apart, 13 items).
- **Scroll:** each section's h2 rises 16px with opacity when it reaches 15% visibility; its paragraphs, lists and tables are visible from the start and never animate. A section reached by an anchor jump or a deep link (`/privacy#retention-security`) is shown already settled (the reveal helper marks any section above or at the landing point as revealed before the first paint).
- **Contents:** the active bar moves between rows with a 160ms opacity crossfade (no sliding indicator).
- **Count:** about 28 moving elements (13 contents items, 13 headings, the sheet, the strip), above the inspector's minimum of 8. Reduced motion and data saver: no travel at all.

## 8. Components

- **New shared component:** `components/public/LegalDocument/` (server component) replacing `components/marketing/LegalPage.tsx`. Props unchanged so both pages switch by import only: `{ title, summary, version, effectiveDate, sections, draft?, changeNote?, readingMinutes? }`. It renders the head, the contents, the body, the tear-off strip and the print styles hook (`data-legal-document`).
- **Client islands (tiny):** `LegalContentsSpy` (the active row, about 1 KB) and `PrintButton` (a few lines).
- **Kept exactly:**
  - `lib/legal/server.ts` `getPublishedLegal()` and its fallback order; `lib/legal/builtin.ts`; `lib/legal/markup.ts` (format, safety rules, ids, issues); `lib/legal/versions.ts` (`formatLegalDate`, `nextLegalVersion`, ids); `lib/legal/draft.ts` (admin validation); `lib/legal/http.ts`.
  - The admin Legal editor at `/admin/legal` (`components/admin/legal/LegalEditor.tsx`) and its publish route with `revalidatePath`.
  - `LegalContact` (`components/marketing/LegalContact.tsx`), moved to `components/public/LegalContact.tsx` with a `className` prop.
  - `revalidate = 300` and `Promise.all([getContactEmail(), getPublishedLegal('privacy')])` in the page.
- **Small changes:**
  - **`lib/legal/render.tsx`:** `renderLegalSections(sections, email, options?)` gains `options = { linkClassName?, externalLinksInNewTab?: boolean }`. Public pages pass the public text-link class and `false` (no new tab); the admin preview passes the old `legalLinkClass` and `true`, so clicking a link in the preview never navigates away from an unsaved draft. The table renderer adds `data-label` to each `<td>` from its column's head text.
  - **`lib/legal/server.ts`:** `readVersionDocument` also returns `changeNote` (already stored on each published version by the editor; empty for the built-in text), so the head can show "What changed".
  - **Reading time:** `readingMinutes = Math.ceil(words(body) / 200)`, computed on the server from the markup text.
  - **Retired:** `LegalPage`'s pill badge and the `Placeholder` component (unused on every route today; the existing test already asserts no `[data-legal-placeholder]`). If a future text needs placeholders, the markup format, not the page, should support them.
- **Cookie stub link:** `CookieStub` (`02` §4.11) links "Privacy notice" to `/privacy`, and its two buttons use the **same labels the notice quotes** (see §13, item 1).

## 9. SEO

- **Title:** "Privacy notice" (renders as "Privacy notice | AcadeGrade"). Unchanged.
- **Description:** "What AcadeGrade collects, why, the lawful basis for each use, AI providers, international transfers, retention, ads and cookies, under-18 rules and your rights." (160 characters, unchanged)
- **Canonical:** `/privacy`.
- **Open Graph:** the sheet's head (title, version and date) on the ground, with the stripe.
- **JSON-LD:** `WebPage` with `name` = title, `dateModified` = effective date, `inLanguage: "en-NG"`, `isPartOf` the site, `publisher` = the home `Organization` @id. No FAQ or other rich-result markup.
- **Headings:** one h1 (the title) and one h2 per section, in document order.
- **Indexing:** indexed and in the sitemap (unchanged).

## 10. Accessibility

- **Landmarks:** header, `<main id="content">` containing an `<article>` (the document) and a `<nav>` (contents), footer. The skip link is first.
- **Headings:** h1, then h2 per section; table captions are not added by the admin format, so each table gets `aria-labelledby` pointing at its section heading.
- **Contents:** `aria-current="location"` on the active link; the phone `<details>` announces "Contents, 13 sections, collapsed".
- **Tables:** real `<table>` with `<th scope="col">`; on phones the stacked layout keeps the table semantics (CSS only changes display; `data-label` text is shown with `::before` and also exposed because the head cells remain in the DOM). Tested with TalkBack and NVDA in both layouts.
- **Links:** external links are announced normally (no new tab, so no "opens in a new window" warning is needed); the `#cookie-choices` link moves focus into the cookie stub when it opens.
- **Measure and size:** body at 17–19px, 68ch, leading 1.55; text never below 14px; zoom to 200% reflows to one column without horizontal scroll.
- **Contrast:** ink on paper 16.6:1; soft ink on paper 8.3:1; table head soft ink on `--pg-paper-2` 7.5:1.
- **Print button:** a real `<button>` named "Print or save as PDF".

## 11. Carried over, replaced and removed

| Today | In the redesign |
|---|---|
| `getPublishedLegal('privacy')`, Firestore `config/legal` + `legal_documents/privacy/versions`, built-in fallback | Kept exactly |
| `parseLegalMarkup` + `renderLegalSections`, `{{contact}}` tokens, safe links | Kept; renderer gains link-class and new-tab options and table `data-label`s |
| `revalidate = 300`, `revalidatePath` on publish | Kept |
| `LegalPage` header on `public-atmosphere-section`, Bricolage h1, pill "Version · Effective" | Document head on the paper sheet, Hanken h1, plain meta line with reading time and change note |
| Sticky "On this page" list with hover fills | Sticky "Contents" `<ol>` with an active row; phone `<details>` |
| Article on `--acade-deep` with Tailwind arbitrary child styles | `LegalDocument` styles in `public.css` (`[data-legal-document]` scope) |
| External links open in a new tab | Same tab on public pages (`03` §4); new tab kept in the admin preview only |
| `draft` prop and "Draft — pending legal review" | Kept as a plain-text line for previews |
| `Placeholder` component | Removed (unused) |
| No print styles | Print and save-as-PDF styles (§5.6) and a print button |
| Cookie banner: "Read our Privacy Policy" | CookieStub: "Read the Privacy notice" |
| "Privacy Policy" in `PrivacyChoices.tsx` (lines 267, 269), `RequirementsGate.tsx` (257–258), `lib/user/requirements.ts` (118–119, 124–125, 195), admin `LegalVersions.tsx` (18–19, "Terms of Service" / "Privacy Policy") | "Privacy notice" and "Terms of use" everywhere |
| Android: "Terms of Use and Privacy Policy" in `app/(auth)/register.tsx` (279, 600), `components/access/TermsGate.tsx` (55), `components/legal/LegalLinks.tsx` (16, 26, 40) | "Terms of use and Privacy notice" (same change in the `acadegrade-mobile` repo, Android only) |
| Tests: `legal-pages.test.tsx`, `legal-builtin.test.tsx`, `cookie-consent.test.tsx`, `admin-legal-page.test.tsx` | Kept passing: the version still renders as its own text node ("2026-11-13"), the formatted date, every topic, the NDPC link, `#cookie-choices`, the deletion link, the configured email and the `/support` fallback; new tests for the active contents, `data-label`, no `target="_blank"` on public pages, and the naming (no "Privacy Policy" string in `app/`, `components/`, `lib/`) |

## 12. Acceptance checklist

- [ ] The published version renders with its own title, summary, version and effective date; with Firestore unreachable the built-in text renders with status 200.
- [ ] Publishing a new version in `/admin/legal` shows on `/privacy` at once; its change note appears under the meta line.
- [ ] Version and effective date are plain text (no pill, no badge); the meta line reads "Version … · Effective … · About n minutes to read".
- [ ] Desktop: the contents stay beside the text for the whole document and mark the current section; phone: the contents `<details>` works without JavaScript.
- [ ] Deep links (`/privacy#ads-cookies`) land with the heading below the header and nothing animating; `#cookie-choices` opens the cookie stub.
- [ ] Both tables read as stacked pairs at 390px with no horizontal scroll.
- [ ] No public link opens a new tab; the admin preview's links still do.
- [ ] Print preview: no header, contents, footer or stub; tables keep their heads; external addresses print; about 6 A4 pages.
- [ ] The words "Privacy Policy", "Terms of Service" and "Terms of Use" appear nowhere in the web `app/`, `components/` and `lib/` folders or in the Android app's screens (grep test).
- [ ] The cookie stub's button labels match the words the notice quotes.
- [ ] `inspect.mjs`: 0 FAIL at 1440/768/390, light and dark; image-floor WARN defended; Lighthouse mobile ≥ 90 ×4.

## 13. Open items for the owner

These are **content** points in the published text. The page plan does not change them; they need a new version published from `/admin/legal` (and the same edit in `lib/legal/builtin.ts`, so the fallback matches).

1. **Cookie button wording:** the notice tells people to choose "Allow ads & analytics" (today's banner label), but `02` §4.11 names the new stub's buttons "Accept all" and "Necessary only". Decide one: keep "Allow ads & analytics" and "Necessary only" on the stub (recommended: clearer, and no new notice version is needed; `02` §4.11 is then amended), or publish a new notice version that says "Accept all".
2. **Share-link expiry:** the notice says a share link "stops working 30 days after it is created" (sections "Who we share information with" and "How long we keep information"), but students choose 1, 7 or 30 days (`SHARE_EXPIRY_CHOICES`). Suggested wording: "The link stops working after the period you choose (1, 7 or 30 days)."
3. **Support requests are missing from the retention table.** Suggested row: "Help and support requests | Until 180 days after the request is closed. Deleted when you delete your account." (from `SUPPORT_PURGE_AFTER_MS` and `lib/user/account-deletion.ts`).
4. **Timetables and catalogue suggestions** are not named in "Information we collect", though both are stored and deleted with the account. Suggested additions to "You give us": "Timetables you build: lectures, reading and exams, and their reminders" and "Suggestions you send for the university and course lists".
5. **AcadeMind naming:** the notice names the features (Written Analysis, AI forecast labels, What-if notes, result scanning) but never says "AcadeMind", the name students see. Suggested: "AI features (shown in AcadeGrade as AcadeMind) …". If "Build with AcadeMind" (the rule-based timetable builder) is open to under-18s or runs without AI consent, add one sentence saying it does not use AI providers, so readers do not think it sends their data.
6. **An "At a glance" section** (optional): if you want a short summary at the top, add it as the first `## At a glance {#at-a-glance}` section in the editor (five bullets). The page will list it first in the contents; no code is needed.
7. **Earlier versions** (optional, later): every published version is already stored in `legal_documents/privacy/versions`; a public archive (`/privacy/versions/{version}`) could list them. Not planned for this phase unless you want it.
