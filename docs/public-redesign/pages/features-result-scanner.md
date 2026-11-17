# Page plan · Result scanner (`/features/result-scanner`)

Inherits `01`–`04` and follows the template of `pages/home.md`. Anything not stated here follows those files. The slip on this page is the home page's example semester, now shown with its CA and exam scores, so every figure matches the home and features pages.

## 1. Purpose

- **Mode:** Persuade.
- **Visitor:** a student holding a printed result slip or looking at a portal results page, usually on results day, on a phone. Two worries: "Will it read my slip correctly?" and "What happens to a photo with my name on it?"
- **First question:** "Does this turn my slip into my results?" Answer within five seconds with the proof itself: the slip on one side, the rows it becomes on the other.
- **One action:** **Create your free record** (`/register`). Signed in, it reads **Open your results** (`/results`, where every semester has **Scan or upload** and **Paste text**).
- **Secondary (text links):** "Next feature: AcadeMind", the features hub, the privacy notice's scanning section.
- **Must say plainly:** paste-from-portal works for everyone; you check every row before saving; scanning is for students 18 and over who allow AI processing; free daily limits; the file is not kept.

## 2. The argument (each section exists because of one claim)

| # | Claim | Proof on the page | Section |
|---|---|---|---|
| 1 | A photo of your slip becomes rows you can edit | The slip beside the rows it becomes, row for row across one seam | Hero (before and after) |
| 2 | It is four plain moves and you decide | Four lines, each a whole step | First, photograph your slip |
| 3 | Your check matters, and it is easy | A live plate: one misread unit, fixed by you, and the GPA corrects itself | Every row, checked by you |
| 4 | There is a way in for everyone | Scan, paste and type compared in words, with limits and age | Three ways in |
| 5 | Your slip is not kept | An itemised receipt of what is sent, removed, saved and kept | What happens to your slip |
| 6 | Starting takes a minute | One plain sentence and one button | Close |

## 3. First screen

### Desktop (1440×900)

- **Composition** (blueprint `showcase-two-objects-two-fields`, adjusted for a first screen): two panels, each 50vw wide and the height of the viewport minus the header (828px), meeting on a clean vertical seam with no gap.
- **Left panel, `--pg-ground-2`: before.**
  - Top-left, 40px in: the trail "Features / Result scanner" at `--pg-small` ("Features" links to `/features`).
  - **h1** at `--pg-display` capped to 80px for the half-width panel, two lines: "Snap the slip. / Check the rows."
  - **Sentence** at `--pg-lead`, 36ch, 24px below (copy in §4).
  - **Primary button** 32px below: **Create your free record**; beside it on the same line a text link "See all features" (`/features`).
  - **The slip** (drawn in code, §5.1) rises from the panel's bottom edge, 520px wide, scaled so the panel's bottom edge crops its signature line: the visitor sees the header, the identity lines and the five course rows.
- **Right panel, `--pg-ink`: after.**
  - Top-left, 40px in, at `--pg-small` in paper colour: "What AcadeGrade gives back: five rows for you to check. Change any value before you save."
  - **The rows** (`UiFrame`, §5.1) sit lower in the panel so that **each extracted row lies on the same horizontal line as its row on the slip**: the eye reads straight across the seam from "CSC 301 … 76 A" to the editable "CSC 301" row.
  - Under the rows, inside the fragment, the semester foot: "13 units · GPA 4.15 · PI 3.30" and the fragment's own **Save semester** button (inert).
  - Caption under the fragment at `--pg-small`: "Course rows after a scan, on the website".

### Phone (390×844)

- **Left panel first, `--pg-ground-2`, at least 100svh:** trail, h1 at 40px on two lines, sentence at 20px, full-width button. All on the first screen with the cookie stub open. The slip follows at full width minus 16px, its top showing at the bottom of the first screen.
- **Right panel second, `--pg-ink`:** the caption line, then the five rows as stacked cards inside the fragment (code and title on one line, then units, CA, exam, total, grade), then the foot. Row alignment across the seam is a desktop effect only.

### Why this works

- **The proof is the picture:** today's page claims "slip to editable record" but never shows it. Here the claim and the proof are the same thing, side by side.
- **Specific:** a Nigerian slip with CA out of 30 and exam out of 70, with real course codes, beside the real course table.

## 4. Copy deck (final wording; sentence case; two-line rule checked)

- **Trail:** "Features / Result scanner".
- **h1:** "Snap the slip. Check the rows." (30 characters; lines of 14 and 15)
- **Sentence:** "AcadeGrade reads the courses, units and scores from a photo, image or PDF of your result slip. You check every row, and nothing is saved until you do." (150 characters)
- **Button:** "Create your free record"; signed in "Open your results".
- **Section headings (h2):**
  1. "First, photograph your slip." (the first of the four step lines is the section heading)
  2. "Every row, checked by you"
  3. "Three ways in"
  4. "What happens to your slip"
  5. Close (no visible heading; an `h2` "Start scanning" is visually hidden so every section has a heading)
- **Close sentence:** "Results out? Scan your slip and have your GPA in a minute."
- **Feature foot:** "Next feature: AcadeMind" · "Other features: Timetable, Transcripts, Free tools, Android app".

## 5. Sections

### 5.1 Hero: before and after

**The slip (drawn in code, paper, `Slip` with a plain header band, no stripe: a university's slip, not AcadeGrade's).** Set the way Nigerian departmental slips are set:

- **Header, centred:** "Statement of semester result" at `--pg-lead`; "Faculty of Physical Sciences · Department of Computer Science" at `--pg-small`.
- **Identity lines, left, `--pg-small`:** "Name: Chidera Okeke" · "Reg. no.: CSC/2023/0147" · "Level: 300 · Session: 2025/2026 · First Semester". (The identity lines are on purpose: §5.5 explains that they travel with a photo.)
- **Table** (a real `<table>`, caption "Example result slip"; 1px row lines allowed inside it):

| S/N | Code | Course title | Units | CA (30) | Exam (70) | Total | Grade |
|---|---|---|---|---|---|---|---|
| 1 | CSC 301 | Data Structures | 3 | 24 | 52 | 76 | A |
| 2 | CSC 303 | Operating Systems | 3 | 21 | 44 | 65 | B |
| 3 | MTH 301 | Numerical Analysis | 3 | 18 | 38 | 56 | C |
| 4 | CSC 305 | Computer Networks | 2 | 25 | 47 | 72 | A |
| 5 | GST 311 | Entrepreneurship | 2 | 20 | 41 | 61 | B |

- **Foot line:** "TNU 13 · TCP 54 · GPA 4.15 · CGPA 4.43", then a signature line "Exams officer" in ink (no stamp; examiner red is reserved for F grades).
- **Checks:** every CA ≤ 30 and exam ≤ 70; 24 + 52 = 76, 21 + 44 = 65, 18 + 38 = 56, 25 + 47 = 72, 20 + 41 = 61; grades by the bands (76 A, 65 B, 56 C, 72 A, 61 B); TCP = 15 + 12 + 9 + 10 + 8 = 54; GPA = 54 ÷ 13 = 4.15; CGPA = 385 ÷ 87 = 4.43 (same record as home).

**The rows (`UiFrame` with `data-ui`, built from the real course table used on `/results/[semesterId]`):**

- Columns: Code, Title, Units, CA, Exam, Total, Grade, as filled inputs (the product's own field look is allowed inside `data-ui`).
- Data: exactly the five rows above, as `mapExtractedCourse` returns them from `{ code, title, units, caScore, examScore, isAR: false }`.
- Foot: "13 units · GPA 4.15 · PI 3.30". PI = (76 + 65 + 56 + 72 + 61 weighted: 3.80×3 + 3.25×3 + 2.80×3 + 3.60×2 + 3.05×2) ÷ 13 = 42.85 ÷ 13 = 3.30.
- The fragment is `inert` and labelled as a figure; its button does nothing.

**Real slip image (owner option):** if the owner supplies a photograph of a real slip with consent and with the name and number covered, it may replace the drawing on the left (same position, greyscale-indigo treatment, under 160 KB). Until then the drawing is the picture; it is crisp, light and honest.

### 5.2 First, photograph your slip (how a scan goes; blueprint `how-it-works-lines-that-step-across`)

- **Ground:** `--pg-ground`.
- **Four lines at `--pg-head`,** leading 1.0, one stage per line, each starting two columns further right (columns 1, 3, 5, 7), with a sentence under each at `--pg-body` in soft ink (34ch), 56px between stages. The first line is the section's h2.
  1. **"First, photograph your slip."** · "Use your phone's camera, or choose a JPG, PNG or PDF up to 10 MB. Lay the slip flat in good light."
  2. **"Then AcadeGrade reads each course."** · "Codes, titles, units, CA and exam scores come back as rows while you wait."
  3. **"You check every row."** · "Fix anything misread, add a course it missed, remove one you don't want."
  4. **"Nothing is saved until you do."** · "Save, and your semester GPA, PI and CGPA update at once."
- **The moving picture** (`03` §3.8), columns 10–12, top-aligned with line 1 (the staircase leaves the top-right empty): the owner's 6–10 second screen recording of a scan on Android, muted, looping, 9:16, 280px wide, poster frame, `preload="none"`, playing only when visible. Caption at `--pg-small`: "Scanning a slip in the Android app". Until the recording exists, this slot holds a still `UiFrame` of the **Scan or upload** panel ("Scan with camera" / "Choose image or PDF"), captioned "The scan panel on the website".
- **Phone:** lines at 8.4vw, indent 6vw per stage; the video (or still) comes after line 4 at 60% width, centred.

### 5.3 Every row, checked by you (the one live thing; blueprint `showcase-square-plate-spare-text`)

- **Field:** `--pg-paper` full width (ink text), at least 88svh, split 50/50.
- **Left half: the plate.** A square `--pg-ground-2` plate filling the half minus 40px margins, vertically centred, holding a live, editable copy of the rows fragment (this one is not inert). It starts in the **"As read"** state: GST 311's units field shows **1** (a crease turned the 2 into a 1), and the field carries the product's normal edited-field look, nothing invented.
- **Right half** (flex column, space-between):
  - **Top:** a row of two text tabs at `--pg-body`: "As read" and "After your check"; the active one in full ink, the other at 60% (tabs are a `role="tablist"` that switch the plate's state).
  - **Middle:** h2 at `--pg-head` (capped 48px): "Every row, checked by you"; 48px below, the description at `--pg-body`, 34ch: "Scans are fast, not perfect. A crease, a shadow or a faint stamp can turn a 2 into a 1. Here GST 311 came through as 1 unit. Change it to 2 and watch the GPA correct itself."
  - **Bottom:** one filled ink cell, half the column wide, 72px: **Change it to 2** (applies the fix in the plate); beside it a text link "Show it as read" (resets). (Deviation: the blueprint's second filled cell becomes a text link, because `02` §4.4 allows one filled action.)
- **Figures** (computed live with `lib/cgpa/academicRules.ts`; pinned by a unit test):
  - As read (GST 311 = 1 unit): points 15 + 12 + 9 + 10 + 4 = 50 over 12 units → **GPA 4.17**; PI = (11.40 + 9.75 + 8.40 + 7.20 + 3.05) ÷ 12 = 39.80 ÷ 12 → **PI 3.32**.
  - After the check (2 units): **GPA 4.15**, **PI 3.30**.
- **Behaviour:** typing in the plate's fields recomputes on input (no error shouting); the foot figures tween over 320ms; a polite live region reads "GPA 4.15 over 13 units". The plate never saves anything and sends nothing anywhere.
- **No-JavaScript fallback:** the plate renders in the "After your check" state with a line under it: "As read, GST 311 showed 1 unit and a GPA of 4.17."
- **Phone:** the plate first at full width (16px margins), then the tabs at 17px, the h2 at 28px, the description, then the **Change it to 2** cell full width (60px) and the reset link under it.

### 5.4 Three ways in (blueprint `features-comparison-set-as-text`)

- **Ground:** `--pg-ground`.
- **h2** at `--pg-head` (capped 48px), top-left above column 1: "Three ways in"; under it one sentence at `--pg-lead`, 48px above the table: "Scanning is quickest. Pasting works for everyone, and nothing leaves your phone until you save."
- **Table** (CSS grid with a real `<table>` underneath for screen readers): row names in columns 1–5 at `--pg-lead` weight 500; three answer columns of equal width at `--pg-body`; rows 64–72px tall, every other row on `--pg-ground-2`; no lines, no ticks. The **Scan a slip** column is one filled ink block running the full height, rising 24px above the first row, its text in paper.

| Row | Scan a slip | Paste from your portal | Type it in |
|---|---|---|---|
| What you need | A photo, image or PDF of your slip | The results text from your school portal | Your slip in front of you |
| Who can use it | Students 18 and over who allow AI processing | Everyone, including under-18s | Everyone |
| Free each day | {ocr} scans in any 24 hours, at most 5 in 15 minutes | No limit | No limit |
| More when you need it | On Android, extra scans with coins from short ads | Not needed | Not needed |
| What leaves your phone | The image or PDF, to be read | Nothing until you save | Nothing until you save |
| Where | Website and Android app | Website and Android app | Website and Android app |
| Before saving | You check every row | You check every row | You check as you type |
| Best for | A printed slip or a screenshot | A results page you can copy | One course, or a quick fix |

- **Live values** (server read of `config/usage` through `readUsagePolicy`, revalidated every 5 minutes):
  - `{ocr}` is `dailyLimits.ocr` (default 20). The "5 in 15 minutes" is the fixed burst window in `USAGE_FEATURES.ocr`.
  - The **More when you need it** row renders only when `coins.enabled` and `coins.features.ocr.enabled` are true; otherwise the row is left out (never shown as "not available").
  - If the limit is 0 (scanning paused by the admin), the cell reads "Not available right now"; if the read fails, it reads "Free scans every day" with no number.
- **Under the table,** two things side by side:
  - Columns 1–6, at `--pg-body`: "**Under 18?** Scanning stays off for your account, but pasting and typing work exactly the same, and so does everything you save."
  - Columns 7–12: a small `UiFrame` of the **Paste text** tab with this text pasted and its result line, captioned "Pasting from a portal on the website":

```
Course Code   Course Title   Units   Score   Grade
CSC 301   Data Structures   3   76   A
CSC 303   Operating Systems   3   65   B
MTH 301   Numerical Analysis   3   56   C
CSC 305   Computer Networks   2   72   A
GST 311   Entrepreneurship   2   61   B
```

    Result line: "5 courses found", then the button "Add 5 courses for review". (Checked with `parsePortalText`: the header line is skipped, five rows parse, nothing is left unread. Pin it in a test.) The student app's paste box sets this text in Geist Mono; on the public page the fragment overrides that to Hanken Grotesk with tabular figures (the columns still line up), because the inspector fails monospace outside code.
- **Phone:** the table turns on its side, one block per way in (Scan first, on the ink fill): the way's name at 20px weight 500, then eight short lines "What you need: …" at 16px; blocks alternate the two ground tones. The under-18 line and the paste fragment follow.

### 5.5 What happens to your slip (blueprint `pricing-itemised-receipt`)

- **Ground:** `--pg-ground-2`.
- **Left, columns 1–6,** starting 96px from the top:
  - h2 at `--pg-head`: "What happens to your slip".
  - Paragraph at `--pg-body`, 18px blueprint size mapped to body: "Scanning is optional and stays off until you allow AI processing. When you scan, the picture is sent to an AI provider named in our privacy notice, read, and returned as rows. AcadeGrade does not keep the file; only the rows you confirm are saved."
  - Text link (in place of the blueprint's button, which would be a second filled action on a screen that does not need one): "Read the scanning section of the privacy notice" → `/privacy#ai-and-scanning`.
- **Right, columns 8–11: the receipt.** A paper slip 380px wide, its top edge running off the top of the section, its bottom a zigzag; 28px padding. Name centred at `--pg-lead`: "Your scan". Rows at `--pg-body` with tabular figures and dot leaders, 14px apart:

| Item | Value |
|---|---|
| Sent to be read | The image or PDF |
| Your name and reg. no. on the slip | Go with the picture |
| From a PDF with real text | Name, reg. no. and email lines removed first |
| Read by | An AI provider in our privacy notice |
| Provider request logs | Up to 55 days, for abuse checks |
| Training on your slip | We ask providers not to |
| Saved to your record | Only the rows you confirm |
| Your consent | Off until you allow it |

  Then a 4px ink bar, then the total at `--pg-head` (capped 44px), right-aligned: "Files kept after the scan · 0".
- **Every line is true to the code and the privacy notice:** the whole image or scanned PDF is sent (`/api/results/extract`, `inlineData`); text PDFs go through `redactIdentityLines` first; the route persists nothing ("nothing is persisted here"); provider logs and the training request are as stated in `lib/legal/builtin.ts` §AI processing; consent is the "AI processing" choice in Settings → Privacy & AI choices.
- **Phone:** heading, paragraph and link first; the receipt at 86% width, centred, keeping its zigzag; the total at 36px (head step's phone size).

### 5.6 Close (blueprint `cta-plain-sentence-one-action`)

- **Feature foot first** (`FeatureFoot`, shared by the three feature pages), on the ground, 64px above the close: "Next feature: AcadeMind" (`/features/ai-insights`) at `--pg-lead` as a text link, then at `--pg-small` "Other features: Timetable · Transcripts · Free tools · Android app" (`/features/timetable`, `/features#transcript`, `/tools`, `/app`).
- **The close:** at least 30svh of empty ground, then one sentence at `--pg-lead` in full ink, 34ch, on the page's text edge: "Results out? Scan your slip and have your GPA in a minute." 24px below, the small primary button (44px, `size="sm"`): **Create your free record** (signed in: **Open your results**); beside it on the same baseline the text link "Try the calculator first". At least 20svh before the footer.
- **Phone:** sentence at 18px with 20px margins; the button at natural width, 44px; 20svh above, 14svh below.

### 5.7 Footer

The shared `PublicFooter`.

## 6. Imagery for this page

| Slot | Picture | Source and licence | Treatment |
|---|---|---|---|
| Hero, left | The example result slip, drawn in code | AcadeGrade (stationery) | Paper on `--pg-ground-2`; optional real slip photo later (owner, consented, identity covered) |
| Hero, right | The course rows after a scan | AcadeGrade's own course table with the example data | `UiFrame`, inert, captioned |
| Steps | Owner's screen recording of scanning on Android (6–10 s, no personal data) | Owner | Muted loop, poster, `preload="none"`, under 1.2 MB; still `UiFrame` until it exists |
| Live check | Editable rows | AcadeGrade's own component | Live, not inert |
| Ways in | Paste panel with the sample text | AcadeGrade's own component | `UiFrame`, inert |

No photographs of people or stock scenes. The page's pictures are the product and the slip; the campus photographs belong to the home and features pages.

## 7. Motion on this page

- **Signature: the scan.** Once per visit, as the hero settles, a 3px `--pg-violet` bar (a flat filled bar, not a glow) travels down the slip from the header to the last row in 900ms (transform only). As it passes each slip row, the matching row on the ink panel rises 12px into place (40ms apart). Under reduced motion or data saver, both panels are simply present.
- **Step lines:** each line enters 70ms after the one above, rising 24px; the video plays only when visible.
- **Live plate:** figure tweens (320ms); the tab switch crossfades the changed field (160ms).
- **Ways in:** the ink column block rises 24px as the table enters; rows fade in 30ms apart.
- **Receipt:** prints row by row (40ms apart); the 0 lands last.
- **Count:** at least 9 moving elements over load and scroll.

## 8. Components

- **Used:** `PublicHeader`, `Slip` (plain header band; `receipt`), `UiFrame`, `Button`, `TextLink`, `SectionHeading`, `CookieStub`, `PublicFooter`.
- **New:**
  - `Trail` (feature page breadcrumb, shared).
  - `SlipDrawing` (a university-style slip from data: header, identity lines, table, foot).
  - `ScanSeam` (two panels with row alignment across the seam; desktop only).
  - `StepLines` (staircase statements).
  - `CheckPlate` (client island: the editable rows, the two states, the live region; uses `computeSemesterGPA`).
  - `ComparisonTable` (grid on top of a real table; turns on its side on phones).
  - `Receipt` (shared with `/features` and `/features/timetable`).
  - `FeatureFoot` (next feature and other features; shared by the three feature pages).
  - `QuietClose` (plain sentence plus small button).
- **Data:**
  - `lib/public/example-student.ts` (shared five courses with CA and exam scores).
  - `lib/public/scanner.ts` (copy, comparison rows, receipt rows, paste sample).
  - `lib/public/usage-public.ts`: a server read of `config/usage` via `readUsagePolicy`, returning only what public pages need (`dailyLimits`, `coins.enabled`, per-feature coin prices and caps), cached with `revalidate: 300`, and returning `null` on failure so pages fall back to numberless wording.

## 9. SEO

- **Title:** "Result scanner | AcadeGrade".
- **Description:** "Photograph your Nigerian university result slip or paste your portal results. AcadeGrade turns them into course rows you check before anything is saved." (155 characters)
- **Canonical:** `/features/result-scanner`.
- **Open Graph:** the slip beside its rows, with "Snap the slip. Check the rows."
- **JSON-LD:** `BreadcrumbList` (Home › Features › Result scanner).
- **Keywords:** "result slip scanner", "scan university result", "paste portal results", "GPA from result slip".
- **Headings:** one h1; h2 per section; the step lines' first line is the h2 and the other three are h3.

## 10. Accessibility

- **Slip and rows:** both are real tables with captions ("Example result slip", "Course rows after a scan"). The seam alignment is visual only; reading order is slip, then rows.
- **Scan bar:** decorative, `aria-hidden`.
- **Live plate:** fields are labelled by course ("Units for GST 311 Entrepreneurship"); the tabs are a proper tablist; results are announced politely, debounced 500ms; the **Change it to 2** button moves focus to the GST 311 units field after applying, so keyboard users see what changed.
- **Comparison:** a real `<table>` with `<th scope="col">` and `<th scope="row">`; the filled column is not the only signal (its header cell says "Scan a slip").
- **Video:** muted, no essential information, a pause button that is keyboard reachable; captions are not needed (no speech); poster alt "Scanning a slip in the Android app".
- **Receipt:** a `<table>` with caption "What happens to your scan".

## 11. Carried over, replaced and removed

| Today | In the redesign |
|---|---|
| Title "Move from result slip to editable record." | h1 "Snap the slip. Check the rows." with the before-and-after as proof |
| "optical character recognition" wording | Plain words: "AcadeGrade reads the courses" |
| `heroimage3.png` (1.9 MB composite of a student holding a phone) | The slip drawing and the real rows fragment; the composite is retired |
| Four icon steps (Choose your source, Let the scanner structure it, Review every row, Save when it is right) | The four step lines, same content, no icons, no numbering |
| "Faster entry without blind trust." + checklist | The live plate (§5.3) shows why the check matters; the checklist's points live in the step lines and the comparison |
| "Works with supported image and PDF result slips." | "JPG, PNG or PDF up to 10 MB" (the real limit from the route) |
| No mention of paste-from-portal, limits, age or data handling | Three ways in (§5.4) and What happens to your slip (§5.5) |
| `ProductCta` "Spend less time retyping results." | The quiet close, plus the feature foot |
| Metadata "Result Scanner — OCR course extraction" | "Result scanner \| AcadeGrade" |
| "Illustrative scene" caption | Removed; every picture is the product with named example data |

## 12. Acceptance checklist

- [ ] Five-second test: a stranger says "you photograph your result slip and it becomes rows you check".
- [ ] Desktop: each slip row lines up with its extracted row across the seam at 1440 and 1280 widths.
- [ ] The live plate computes exactly 4.17 / 3.32 (as read) and 4.15 / 3.30 (after the check); keyboard-only works; the no-JS fallback renders.
- [ ] The paste sample parses to five rows with nothing unread (unit test on `parsePortalText`).
- [ ] The daily-limit cell shows `config/usage` values; the coins row is absent when coins are off; a failed read shows numberless wording.
- [ ] Phone: h1, sentence and button on the first screen at 390×844 with the cookie stub open.
- [ ] `inspect.mjs`: 0 FAIL at 1440/768/390, light and dark; Lighthouse mobile ≥ 90 ×4; the video never autoplays under data saver.
- [ ] Every receipt line matches `lib/legal/builtin.ts` and the extract route (reviewed when either changes).

## 13. Open items for the owner

1. Record the 6–10 second screen video of a scan on Android (example data, no personal details). Until then the still panel is used.
2. Optionally supply a photograph of a real result slip, with consent and with the name and number covered, to replace the drawing.
3. Confirm the example name and number on the drawn slip ("Chidera Okeke", "CSC/2023/0147"), or choose others.
4. Confirm the wording "an AI provider named in our privacy notice" (it stays true if the provider list changes).
