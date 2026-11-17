# Page plan · Terms of use (`/terms`)

Inherits `01`–`04` and follows the structure of `pages/home.md`. Anything not stated here follows those files. The legal layout (`LegalDocument`) is shared with the Privacy notice and defined in full in `pages/legal-privacy.md`; it is restated here so this plan stands alone. If the two plans ever differ on the shared layout, `legal-privacy.md` wins; everything specific to the Terms is decided here.

## 1. Purpose

- **Mode:** Read.
- **Visitors:**
  - a student signing up (the consent step links here) or asked by the app to agree to a new version (`RequirementsGate`, "Terms of use" requirement in `lib/user/requirements.ts`);
  - a student checking a rule: what coins are worth, whether an AcadeGrade transcript is official, what happens if they delete their account;
  - a sponsor, employer or institution handed an AcadeGrade transcript, checking what it is;
  - a Google Play or ad-network reviewer.
- **First question:** "What am I agreeing to, and what is AcadeGrade not responsible for?" Answer within five seconds: *the title, the admin summary, the version and effective date, and a contents list that names the rules (eligibility and age, unofficial records, AI output, coins, acceptable use, ending your account, law).*
- **One action:** none is pushed. Reading is the task; every route out is a text link.
- **What must never change:** the text is the admin-published version from Firestore with the built-in fallback. This plan changes the setting only; content points are listed for the owner in §13.

## 2. The argument (each section exists because of one claim)

| # | Claim | Proof on the page | Section |
|---|---|---|---|
| 1 | These are the current, dated terms you agree to | Title, summary, version and effective date as plain text, the reading time, the change note | Document head |
| 2 | You can find the rule you need without reading everything | A contents list that stays beside the text and marks where you are | Contents |
| 3 | The rules are written to be read | One long document on paper at body size, 68-character lines | The terms |
| 4 | The record is unofficial, and that is said plainly | The "Unofficial records" section set in full, its key sentence at weight 500 | The terms |
| 5 | You can keep a copy and find the related documents | Version again, print or save as PDF, links to the Privacy notice, deletion and support | Tear-off strip |

## 3. First screen

### Desktop (1440×900)

- **Composition:** "Document sheet with sticky contents", from two blueprints:
  - `list-printed-menu-sheet` (The printed menu sheet): the document is one tall paper sheet (`--pg-paper`), square corners, top and bottom edges cut into shallow scallops, its head set centred like a printed card.
  - `list-sticky-photo-active-list` (Sticky photograph, active list): the sticky left column and the active row. The photograph is dropped; the list takes the sticky column.
- **Ground:** `--pg-ground`, 64px between the header and the sheet.
- **Columns:** contents in columns 1–3 (`position: sticky; top: 96px`, `max-height: calc(100svh - 120px)`, own scroll if needed); the sheet in columns 4–11 (about 900px, 64px padding, text measure held to 68ch at body); column 12 empty.
- **Document head** (centred on the sheet):
  1. the AcadeGrade mark, 24px;
  2. the **h1** at `--pg-head` (64px): the published `title` ("Terms of use");
  3. the published `summary` at `--pg-lead`, centred, held to 52ch (today: "The practical rules for using AcadeGrade, and where a personal academic tool ends and your institution's authority begins.", two lines);
  4. the **meta line** at small in soft ink, plain text: "Version 2026-11-13 · Effective 13 November 2026 · About 6 minutes to read";
  5. when the published version has a change note: "What changed: {changeNote}" at small;
  6. a perforation (5px round dots in `--pg-ground`) across the sheet, 40px below.
- **Above the fold at 900px:** header 72 + 64 + scallop 12 + padding 64 + mark 24 + 16 + h1 64 + 24 + summary about 70 + 16 + meta 22 + 40 = about 488px; the first section ("Agreement and eligibility") and most of its first paragraph are visible beside the full contents list.

### Phone (390×844)

- The sheet spans the width inside the 16px margins with 20px padding; scallops kept.
- Head: mark, h1 at head (32px) on one line, summary at lead (20px), meta line at small on two lines ("Version 2026-11-13 · Effective 13 November 2026" / "About 6 minutes to read").
- Under the perforation: the contents as a native `<details>` (closed), summary "Contents · 11 sections"; 44px rows when open.
- The first section heading is on the first screen with the cookie stub open.

### Why this works

- **Fast:** a student checking "can I buy coins?" sees "Coins" in the contents on the first screen and is there in one tap.
- **Specific:** the terms sit on the same paper as the result slips, so "AcadeGrade records are self-reported" reads as part of the product's own stationery, not as fine print.

## 4. Copy deck (final wording; sentence case; checked against the two-line rule)

The document's own words come from the published version and are not rewritten here. The page adds only:

- **Meta line:** "Version {version} · Effective {formatLegalDate(effectiveDate)} · About {n} minutes to read" (`n` = words ÷ 200 rounded up; today about 6).
- **Change note line** (only when present): "What changed: {changeNote}".
- **Contents heading** (desktop, small, weight 500): "Contents"; phone summary "Contents · {count} sections".
- **Tear-off strip:** "Terms of use · Version {version} · Effective {date}"; text button "Print or save as PDF"; links "Privacy notice" (`/privacy`), "Delete your account" (`/account-deletion`), "Support" (`/support`).
- **Naming, sitewide:** "Terms of use" and "Privacy notice", sentence case, everywhere (web and Android; the strings to change are in §11).
- **Removed:** the pill "Version · Effective" badge.

## 5. Sections

### 5.1 Document head

- **Data:** `getPublishedLegal('terms')` (`lib/legal/server.ts`): the version named by `config/legal.termsVersion`, else the newest in `legal_documents/terms/versions`, else `BUILTIN_LEGAL.terms`. Any read error falls back to the built-in text; the page never fails.
- **States:** published; built-in (same layout, no visible difference); empty summary (the line is omitted); `draft` (plain-text line in `--pg-mark`, "Draft — pending legal review", previews only).
- **Freshness:** `export const revalidate = 300`; publishing in `/admin/legal` calls `revalidatePath('/terms')`, so the new version is live at once. Students already signed in are asked to agree to it by `RequirementsGate` (unchanged); the version they agree to is the one in the meta line.

### 5.2 Contents

- An `<ol>` in `<nav aria-label="Terms of use contents">`, links to `#{id}` at small, 44px rows, soft ink, decimal markers in soft ink (a real ordered list; no "01" styling).
- **Active row:** the section in view (an `IntersectionObserver` on the headings, rootMargin `-96px 0px -60% 0px`) gets `aria-current="location"`, full ink at weight 500 and a 3px ink bar on its left. Without JavaScript: plain links.
- **Phone:** the `<details>`; choosing a link closes it and jumps.
- **Scroll:** smooth anchor jumps (instant under reduced motion); `scroll-margin-top: 96px` on every section.
- **Today's sections** (built-in 2026-11-13): Agreement and eligibility · Your account · Unofficial records · AI features and their output · Coins · Acceptable use · Your content and our rights · Ending your account · Availability and liability · Changes to these terms · Governing law and contact (11 sections, about 1,100 words, no tables).

### 5.3 The terms (the body)

Rendered by `renderLegalSections(sections, email, options)` (`lib/legal/render.tsx`) from the markup parsed by `lib/legal/markup.ts`:

| Markup | Element | Style on the sheet |
|---|---|---|
| `## Heading {#id}` | `<section id>` with `<h2>` | h2 at `--pg-lead`, weight 500; 64px above (0 for the first), 16px below |
| Paragraph | `<p>` | body, leading 1.55, full ink, 16px between, max 68ch |
| `- item` | `<ul><li>` | body; 8px between items; soft-ink markers; 24px indent (the Coins rules are six such items) |
| Table | `<table>` | Head cells small/500/soft ink on `--pg-paper-2`, alternate rows on `--pg-paper-2`; stacked with `data-label`s below 640px (none in today's terms, ready for a future version) |
| `**bold**` | `<strong>` | weight 500. In "Unofficial records" the sentence "AcadeGrade records are self-reported. They are not issued, verified or endorsed by any university or by the National Universities Commission" is the key line; it stays exactly as the admin wrote it |
| Links | `<Link>` / `<a>` | Text-link style; `https://` links open in the **same tab** on public pages (`03` §4) and print their address |
| `{{contact:Terms of use question}}` | `LegalContact` | Email set: the address as a `mailto:` with that subject; no email: "the AcadeGrade support page" → `/support` |

- **Safety:** unchanged (escaped text; only `/`, `#`, `https://` links; unknown tokens shown literally).
- **Cross-references kept working:** "[Privacy notice](/privacy)" in Agreement; "[account deletion page](/account-deletion)" in Ending your account; "[support page](/support)" in Governing law and contact.

### 5.4 Tear-off strip

- After the last section: a row of 5px round dots, then a 72px strip on `--pg-paper-2` at small: left "Terms of use · Version … · Effective …"; right the "Print or save as PDF" text button (`window.print()`, client island) and the three related links. The scalloped bottom edge follows.
- **Phone:** version line, print button (44px), then the links in a column.

### 5.5 Footer

The shared `PublicFooter`; "Terms of use" carries `aria-current="page"` and the 3px underline.

### 5.6 Print

Same print rules as the Privacy notice (`legal-privacy.md` §5.6), restated:
- hide the skip link, header, contents, cookie stub, footer, print button, scallops, perforations and motion;
- `@page { size: A4; margin: 18mm 16mm 20mm; }`, white page, black text;
- Hanken Grotesk 10.5pt body, h1 20pt, h2 12.5pt weight 500, small 8.5pt;
- the head prints once with the page address ("acadegrade.vercel.app/terms" from `resolveSiteUrl()`); the strip's version line closes the document; browser page numbers stay on;
- external links print their address; `h2 { break-after: avoid; } li { break-inside: avoid; } p { orphans: 3; widows: 3; }`.
- Today's terms print on about 3 A4 pages.

## 6. Imagery for this page

- **None in the content area;** only the footer stamp (UNN gate). The tasteskill floor of four pictures is waived for legal pages and recorded as a defended exception in the inspector report.
- **Drawn in code:** scallops, perforation, the AcadeGrade mark.

## 7. Motion on this page

- **Entrances only; body text never moves.**
- **Load:** the sheet is laid down (rise 24px with opacity, 640ms); the 11 contents items enter 30ms apart (opacity, 8px rise).
- **Scroll:** each h2 rises 16px with opacity at 15% visibility; paragraphs and lists never animate. Sections reached by a deep link (`/terms#coins`) render already settled.
- **Contents:** the active bar crossfades between rows in 160ms.
- **Count:** about 24 moving elements, above the inspector's minimum of 8. Reduced motion and data saver: no travel.

## 8. Components

- **Shared component:** `components/public/LegalDocument/` (server), replacing `components/marketing/LegalPage.tsx` with the same props (`title, summary, version, effectiveDate, sections, draft?, changeNote?, readingMinutes?`). Defined in `legal-privacy.md` §8.
- **Client islands:** `LegalContentsSpy` (active row) and `PrintButton`.
- **Kept exactly:** `getPublishedLegal()` and its fallback order; `lib/legal/builtin.ts`; `lib/legal/markup.ts`; `lib/legal/versions.ts`; `lib/legal/draft.ts`; `lib/legal/http.ts`; the admin Legal editor (`/admin/legal`) and the publish route with `revalidatePath`; `LegalContact` (moved to `components/public/`, gains `className`); the page's `revalidate = 300` and `Promise.all([getContactEmail(), getPublishedLegal('terms')])`.
- **Small shared changes** (made once, for both legal pages): `renderLegalSections` gains `{ linkClassName, externalLinksInNewTab }` (public: same tab; admin preview: new tab, so a click never loses an unsaved draft) and adds table `data-label`s; `readVersionDocument` also returns `changeNote`; reading time from the word count.
- **Page file:** `app/(public)/terms/page.tsx` changes its import from `LegalPage` to `LegalDocument` and passes `changeNote` and `readingMinutes`; nothing else.

## 9. SEO

- **Title:** "Terms of use" (renders as "Terms of use | AcadeGrade"). Unchanged.
- **Description:** "The rules for using AcadeGrade: who can use it, the under-18 rule, unofficial records, AI output, coins, acceptable use, deletion, changes and governing law." (157 characters; today's is 165, over the 160 limit in `04` §6)
- **Canonical:** `/terms`.
- **Open Graph:** the sheet's head on the ground, with the stripe.
- **JSON-LD:** `WebPage` (`name`, `dateModified` = effective date, `inLanguage: "en-NG"`, `publisher` = the home `Organization` @id).
- **Headings:** one h1, one h2 per section.
- **Indexing:** indexed and in the sitemap (unchanged).

## 10. Accessibility

- **Landmarks:** header, `<main id="content">` with the `<article>` and the contents `<nav>`, footer; skip link first.
- **Headings:** h1 then h2s in document order.
- **Contents:** `aria-current="location"`; the phone `<details>` announces its section count.
- **Emphasis:** `<strong>` is kept in the markup for meaning (screen readers can announce it), even though its weight difference is small (500 against 400).
- **Measure and zoom:** 68ch, body 17–19px, leading 1.55; 200% zoom reflows to one column without horizontal scroll.
- **Contrast:** ink on paper 16.6:1; soft ink on paper 8.3:1.
- **Print button:** a real `<button>`, "Print or save as PDF".

## 11. Carried over, replaced and removed

| Today | In the redesign |
|---|---|
| `getPublishedLegal('terms')` with Firestore versions and built-in fallback | Kept exactly |
| Markup parsing and rendering, `{{contact:Terms of use question}}` | Kept; renderer options added |
| `revalidate = 300`; `revalidatePath('/terms')` on publish | Kept |
| `LegalPage` header with Bricolage h1 and pill "Version · Effective" | Document head on the paper sheet, Hanken h1, plain meta line |
| "On this page" sticky list | "Contents" `<ol>` with active row; phone `<details>` |
| External links in a new tab | Same tab on public pages; new tab only in the admin preview |
| No print styles | Print and save-as-PDF styles and button |
| Description of 165 characters | 157 characters |
| "Terms of Service" (admin `LegalVersions.tsx` line 18), "Terms of Use" (`lib/user/requirements.ts` lines 118–119 and 195; Android `register.tsx` 279 and 600, `TermsGate.tsx` 55, `LegalLinks.tsx` 16, 26, 40) | "Terms of use" everywhere |
| Tests in `legal-pages.test.tsx` (version text node, no draft banner, "not issued, verified or endorsed by any university", "Coins are not money and have no cash value", governing law) | Kept passing; new tests for the active contents, no `target="_blank"` on public pages, and the naming grep |

## 12. Acceptance checklist

- [ ] The published version renders with its own title, summary, version and effective date; with Firestore unreachable the built-in text renders with status 200.
- [ ] A publish in `/admin/legal` shows on `/terms` at once; the change note shows under the meta line; signed-in students are then asked to agree (unchanged behaviour).
- [ ] Version and date are plain text; the terms' own sentence "These terms have a version number (shown at the top)" stays true.
- [ ] The contents follow the reader on desktop; the phone `<details>` works without JavaScript; deep links such as `/terms#coins` land below the header, settled.
- [ ] "Privacy notice", "account deletion page" and "support page" links inside the text resolve; no public link opens a new tab.
- [ ] Print preview fits about 3 A4 pages with the head, the version line and external addresses.
- [ ] No "Terms of Service" or "Terms of Use" string remains in web or Android screens (grep test).
- [ ] `inspect.mjs`: 0 FAIL at 1440/768/390, light and dark; image-floor WARN defended; Lighthouse mobile ≥ 90 ×4.

## 13. Open items for the owner

Content points in the published text (need a new version from `/admin/legal` and the same edit in `lib/legal/builtin.ts`):

1. **AcadeMind naming:** "AI features and their output" lists Written Analysis, AI forecast labels, What-if notes and result scanning, but never says "AcadeMind", the name students see. Suggested: "AI features (shown in AcadeGrade as AcadeMind) …". If "Build with AcadeMind" (the rule-based timetable builder) is open to under-18 students, add that it is not an AI feature, so the age rule in "Agreement and eligibility" does not appear to forbid it.
2. **Section order** (optional): "Unofficial records" is the rule most readers outside AcadeGrade need (sponsors, employers). Consider moving it to second place, after "Agreement and eligibility"; the contents list will follow the text.
3. **Earlier versions** (optional, later): versions are stored in `legal_documents/terms/versions`; a public archive is possible but not planned for this phase.
