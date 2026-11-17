# Page plan · Weighted average score (`/tools/weighted-average`)

This page inherits `01`–`04` and follows the exemplar `pages/home.md`; anything not stated here follows those files. It is an **Operate** page. The tool is a result slip with up to 20 course rows (score out of 100 and units); the average prints in the slip's foot bar, with the GPA and PI the same scores give beside a small arc meter, and the sum worked out on a receipt.

**Naming rule for this page:** the figure is always "weighted average score" and always "out of 100". It is never called a percentage, a percentage grade, official, or any named credential evaluation, and no "%" sign appears next to it.

Code today: `app/(public)/tools/weighted-average/page.tsx` (wraps `ToolPage` and `WeightedAverageCalculator`), `calculators.tsx` (`MAX_ROWS = 20`, three empty rows to start), `fields.tsx`, `tool-math.ts` (`weightedAverageFromRows`, `parseNumber`, `ScoreRow`), `tools-config.ts` (title "Weighted average score calculator", three FAQs). Engine: `weightedAverageScore`, `computeCourseMetrics`, `computeSemesterGPA`, `formatCgpa` in `lib/cgpa/academicRules.ts`.

## 1. Purpose

- **Mode:** Operate.
- **Visitor:** a student filling in a scholarship, postgraduate or job form that asks for an "average score", or one who wants a finer picture than letter grades. They searched "weighted average score calculator", "how to calculate average score with units", "credit weighted average", or came from the calculator's Next questions with their scores filled in.
- **First question:** "What is my average score out of 100, weighted by units, and how does it relate to my GPA?" Answered on the first screen as soon as one row is complete.
- **One action:** filling the rows (live; no submit). The page's only primary button is in the close: **Start your free record**.
- **Secondary (text links):** "Try an example", Add a course, "See these in the CGPA calculator", the other tools, All free tools.

## 2. The argument

| # | Claim | Proof on the page | Section |
|---|---|---|---|
| 1 | Type your scores and units and get your weighted average at once | The slip with up to 20 rows; the average in the foot bar | The score slip (§5.1) |
| 2 | Every row is counted in the open | The receipt: score × units per course, the totals, the division | The score slip (§5.1) |
| 3 | It is a different number from GPA and PI, and here is how | A comparison set as text, with the same five courses in all three | Average, GPA and PI (§5.2) |
| 4 | The questions people ask are answered | Six answers, open on the page | Average score questions (§5.3) |
| 5 | The next question is one tap away | The other tools, the calculator and the hub | More free tools (§5.4) |
| 6 | A record keeps your scores every semester | One sentence, one action | Close (§5.5) |

## 3. First screen

### Desktop (1440×900)

- **Header:** the shared `PublicHeader`; **Free tools** carries `aria-current="page"`.
- **Columns 1–7: the score slip** (`Slip` variant `result`, editable, `data-ui`, about 790px), 24px below the header:
  1. Stripe band, 56px.
  2. Header, centred: the mark; the **h1** "Weighted average score" at `--pg-head` (64px, one line); the meta line at small, "Free tools · Nigerian university 5-point scale, with PI" ("Free tools" links to `/tools`; the scale line from `lib/public/scales.ts`); the sentence at body, 50ch: "Enter each course's score out of 100 and its units to get your average score, weighted by units. Up to 20 courses."
  3. **Column header row** (small, soft ink, `aria-hidden`; each control has its own label): Course code (optional) · Score, out of 100 · Units, with Score and Units right-aligned over their fields.
  4. **Rows** (three to start, 64px pitch, 1px `--pg-paper-2` rule between rows): course code `Field` (optional, 176px, `maxLength` 24, uppercased on blur, placeholder "e.g. CSC 301") · score `Field` (120px, `inputmode="decimal"`) · units `Field` (96px, `inputmode="decimal"`, decimals allowed as today) · the row's product at small in soft ink, right-aligned ("228" for 76 × 3; "—" until both are valid) · **Remove** text button (disabled, still legible, on the only remaining row).
  5. **Add a course**: a full-width row button on `--pg-paper-2`, 52px, "Add a course". At 20 rows it is disabled and reads "20 courses is the most this tool takes".
  6. The text button "Try an example".
  7. **Notes line** (small, only when needed): left-out rows, brought-over rows (see states).
  8. Perforation.
  9. **Foot bar** (ink, paper text, 176px, `role="status"`):
     - Left, on gold (ink text): the label "Weighted average score" at small, the figure at `--pg-head` to one decimal ("65.9"), and "out of 100" at lead beside it.
     - Middle at small: "Across 13 units from 5 courses."
     - Right: "The same scores give" at small, then "GPA 4.15 · PI 3.30" at lead, then at small "on the Nigerian university 5-point scale" (the scale line from `scales.ts`), with a compact `ArcMeter` (96px, no tick labels) whose dot is at the GPA, labelled "GPA from these scores".
  10. On paper under the foot bar, small, centred: "A personal estimate, not an official result. Nothing you type is saved." and, when every counted row has whole units from 1 to 6, the text link "See these in the CGPA calculator" (`/calculator?m=score&c=…`, the calculator's own URL format, so the courses open there as score rows).
- **Columns 9–12: the working** (`Slip` variant `receipt`, 420px, zigzag bottom, `data-ui`), top-aligned with the slip's header block: h2 at lead "How it's worked out", rows at body with dot leaders (example values):
  - CSC 301 · 76 × 3 ········ 228
  - CSC 303 · 65 × 3 ········ 195
  - MTH 301 · 56 × 3 ········ 168
  - CSC 305 · 72 × 2 ········ 144
  - GST 311 · 61 × 2 ········ 122
  - Units ········ 13
  - Scores × units ········ 857
  - Inverted final row: "857 ÷ 13 = 65.9"
  - Closing line at small: "PI is this average ÷ 20: 3.30."
  - Blank codes print as "Course 3". After 8 rows the rest fold into one row, "and 7 more courses", whose value is the sum of their score × units, so the totals still add up; a "Show all" text button opens them.
- **At 1440×900** the h1, sentence, header row, the three rows, Add, the foot bar and the receipt are on the first screen (header 72 + 24 + slip about 780px). With more rows, the foot bar is `position: sticky; bottom: 0` inside the slip so the average stays in view.

### Phone (390×844)

- The slip full width inside 16px margins: 40px stripe; mark; h1 at 40px on two lines ("Weighted / average score"); meta line; sentence; rows recomposed into two lines each (line 1: the code field full width; line 2: score and units side by side, 150px each, with Remove at the right as a 44px text button; the product moves to the receipt only); Add; "Try an example"; perforation; the foot bar (gold figure with "out of 100" on row 1, "Across 13 units from 5 courses" on row 2, the GPA/PI line with the compact meter on row 3).
- **First screen at 390×844 with the cookie stub open:** h1, sentence and the first row. While the foot bar is off-screen and at least one row counts, a 56px ink results strip is fixed to the bottom of the viewport (above the cookie stub while it is open): "Average 65.9 out of 100" at body, `aria-hidden`; it hides when the foot bar is in view.
- The receipt follows the slip at full width.

### Why this works

- **Fast:** rows like a result slip, the answer at the foot, no button.
- **Specific and honest:** it shows the GPA and PI from the same scores next to the average, so the student sees the three numbers are different things, and it never dresses the average up as an official figure.

## 4. Copy deck (final wording; sentence case; two-line rule checked)

- **Title tag:** "Weighted average score calculator" (template adds "| AcadeGrade").
- **h1:** "Weighted average score" (22 characters).
- **Meta line:** "Free tools · Nigerian university 5-point scale, with PI".
- **Sentence:** see §3 (115 characters).
- **Column headers:** "Course code (optional)", "Score, out of 100", "Units".
- **Accessible names:** "Course code, course 1"; "Score for course 1, out of 100" (or "for CSC 301"); "Units for course 1"; "Remove course 1".
- **Add:** "Add a course"; at the limit "20 courses is the most this tool takes".
- **Example button:** "Try an example" (fills the five example rows).
- **Foot bar:** "Weighted average score"; "out of 100"; "Across 13 units from 5 courses." (singular: "Across 3 units from 1 course."); "The same scores give"; "GPA 4.15 · PI 3.30"; "on the Nigerian university 5-point scale"; empty: "Enter a score and units to see your average."
- **Notes:** "1 row is left out: use a score from 0 to 100 and units above 0." / "2 rows are left out: …"; brought over: "These scores came from the CGPA calculator."; "Only the first 20 courses were brought over."; "Letter grades have no single score, so they weren't brought over."
- **Under the foot bar:** "A personal estimate, not an official result. Nothing you type is saved."; link "See these in the CGPA calculator"; when units are not whole 1–6: "To open these in the CGPA calculator, use whole units from 1 to 6."
- **Receipt:** h2 "How it's worked out"; closing line "PI is this average ÷ 20: 3.30."
- **Section headings (h2):** "Average, GPA / and PI" (20); "Average score questions" (23); "More free tools, / same scale" (27).
- **Close:** "Keep your scores in one record, every semester, with GPA and PI beside them." (14 words) Button **Start your free record**; signed in "Your record is waiting." with **Open dashboard**; text link "All free tools".

## 5. Sections

### 5.1 The score slip (the tool; app-screen craft inside the dealt hero "Striped card beside the room", adjusted)

- **Blueprint and adjustment:** the printed card is the working slip (columns 1–7); the photograph of the room is replaced by the receipt of the sum (columns 9–12). Kept: stripe band, centred printed header, one ink on paper. Inside: label above field (column headers on desktop, labels per field for assistive tech), numbers right-aligned in tabular figures, a missing value as a grey dash, colour only on data.
- **Behaviour kept from today:**
  - Up to **20 rows** (`MAX_ROWS`); starts with **three empty rows**; at least one row always stays (its Remove is disabled).
  - `weightedAverageFromRows(rows)`: a row counts as *filled* when its score or units has text; a filled row is *used* when its score parses to 0–100 and its units to more than 0 (decimals allowed); used rows go to `weightedAverageScore` as `{ totalScore, units }`; `skippedRows` = filled − used. Empty rows are ignored silently.
  - The average shows to one decimal; the units total is shown.
- **Changed and added, with reasons:**
  - **No "%" and no "percentage":** today's result reads "65.9%" and "This is a percentage, not a CGPA". New: "65.9 out of 100", and the difference from CGPA is shown, not asserted (§5.2).
  - **The same scores' GPA and PI** in the foot bar: each used row goes through `computeCourseMetrics` with the calculator's own split (`caScore = min(30, score × 0.3)`, `examScore = max(0, score × 0.7)`), then `computeSemesterGPA`, so the figures match the CGPA calculator exactly. PI always equals the average ÷ 20 over the same rows (the engine's own note on `weightedAverageScore`).
  - **Optional course code** per row: it makes the receipt and the left-out note readable ("CSC 305 is left out…") and lets "See these in the CGPA calculator" carry the codes.
  - **Left-out message fixed:** today it says "units of 1 or more" while the maths accepts any units above 0; it now says "units above 0".
  - **Errors on blur per field** (score: "Enter a score from 0 to 100."; units: "Enter units above 0."), with the row marked; the notes line still counts left-out rows.
  - **Comma as decimal point** ("69,5" reads as 69.5).
  - **Prefill:** `?c=<base64 JSON>` in the calculator's score format (`[{c, u, s}]`), read once, validated (score 0–100, units above 0), cut to the first 20 rows, then removed with `router.replace`. Rows in letter-grade format (`g` without `s`) are not brought over, and the note says why.
  - **Calculator link:** offered only when every used row has whole units from 1 to 6 (the calculator's range); it writes the calculator's URL with the codec in `lib/public/calculator-url.ts`.
- **Scale from data:** the score range (0 to 100), the scale line, the GPA/PI computation's bands and the meter's range come from `DEFAULT_SCALE` in `lib/public/scales.ts` (shape in `calculator.md` §8) and the engine. With one live scale there is no switcher, and no other scale is mentioned.
- **Sample data and pinned results** (each a unit test):

| Rows (score / units) | Weighted average | Units | GPA from the same scores | PI | Notes |
|---|---|---|---|---|---|
| 76/3, 65/3, 56/3, 72/2, 61/2 | (228 + 195 + 168 + 144 + 122) ÷ 13 = 857 ÷ 13 = 65.92 → **65.9** | 13 | grades A B C A B: 54 ÷ 13 = 4.1538 → **4.15** | 42.85 ÷ 13 = 3.2962 → **3.30** (= 65.92 ÷ 20) | The page's example; the same courses as the calculator's example |
| 80/3, 60/1, 120/2, empty | (240 + 60) ÷ 4 = **75.0** | 4 | (15 + 4) ÷ 4 = 4.75 | 3.75 | "1 row is left out…"; existing test |
| 76/3, 65/3, 56/3, 72/2, 61/2, 120/2, 58/0 | 65.9 | 13 | 4.15 | 3.30 | "2 rows are left out…" |
| 70/1.5, 50/1.5 | (105 + 75) ÷ 3 = **60.0** | 3 | (7.5 + 4.5) ÷ 3 = 4.00 | 3.00 | Calculator link hidden (units not whole) |
| 58/3 | 58.0 | 3 | 3.00 (C) | 2.90 | Single course |
| 69,5/2 | 69.5 | 2 | 4.00 (B) | 3.48 | Comma read as decimal point; 69.5 is a B (lower-bound bands) |
| score "76", units empty | none | none | none | none | "1 row is left out…" |

  (69.5 ÷ 100 × 5 = 3.475 → `roundCgpa` → 3.48.)

- **States (final wording):**
  - **Empty** (first load, or every row cleared): three empty rows; the foot bar prints "—" in soft ink in the gold block's place and "Enter a score and units to see your average."; the GPA/PI line shows "—"; the meter has no dot; the receipt shows its row names with "—".
  - **Valid:** as §3.
  - **Some rows left out:** the average uses the counted rows; the notes line counts the rest; each left-out row's invalid field carries its error after blur.
  - **Every filled row invalid:** the empty foot bar plus the left-out note.
  - **20 rows:** Add disabled with its reason.
  - **Brought over from the calculator:** the note "These scores came from the CGPA calculator."; with more than 20: "Only the first 20 courses were brought over."; letter-grade link: "Letter grades have no single score, so they weren't brought over." and the default three empty rows.
  - **No JavaScript:** a server-rendered slip with the example rows printed (fields disabled) and the line "Turn on JavaScript to enter your own scores."; the receipt and §5.2 show the example in full.
  - **Signed in:** only the close changes.
- **Analytics:** `tool_used` `{ tool: 'weighted-average' }` once per page view on the first valid result, after analytics consent.

### 5.2 Average, GPA and PI (blueprint `features-comparison-set-as-text`)

- **Why this blueprint:** the page must explain how this number differs from GPA and PI. A comparison table written in words, with the same five courses in every column, does that exactly; and it differs from the slip and receipt above.
- **Ground:** `--pg-ground`, full bleed.
- **Heading:** the h2 "Average, GPA / and PI" at `--pg-head`, hanging top-left above column 1, 48px beneath.
- **The table** (a CSS grid with table roles: `role="table"`, rows `role="row"`, cells `role="cell"`, column and row headers `role="columnheader"` / `role="rowheader"`): row names in columns 1–5 at lead, weight 500; then three equal answer columns at body: **Weighted average score**, **GPA**, **PI**. Column names in the top row at body weight 500. Rows 64–72px tall, alternating `--pg-ground` and `--pg-ground-2`, touching. The **Weighted average score** column is one filled `--pg-ink` block running the full height behind its cells and rising 24px above the first row, with paper text (the column that matters on this page). No lines, no tick marks; every cell answers in words.

| | Weighted average score | GPA | PI |
|---|---|---|---|
| What it answers | How high are my scores, out of 100? | Which grade bands did I reach? | How strong are my scores, on the 5-point scale? |
| What it uses | Your scores out of 100 | Each grade's point: A = 5 down to F = 0 | Each score ÷ 100 × 5 |
| Weighted by units | Yes | Yes | Yes |
| Range | 0 to 100 | 0.00 to 5.00 | 0.00 to 5.00 |
| A 69 and a 60 count as | 69 and 60 | 4 and 4, both a B | 3.45 and 3.00 |
| Decides your degree class | No | Yes, as your CGPA | No |
| These five courses | 65.9 | 4.15 | 3.30 |
| Where you meet it | Forms that ask for an average score | Your result, your class, most forms | Some schools' results, beside GPA |

- **Under the table**, at body, 40ch, in column 1: "PI is always the weighted average score ÷ 20, because both use the scores themselves. GPA can differ from both, because a 69 and a 60 earn the same B." The figures in the "These five courses" row are the example's, pinned in a test; all scale words (bands, points, ranges) come from `scales.ts`.
- **Phone:** the table turns on its side: one block per row name (8 blocks), the name at lead weight 500, then three lines at body, each "Weighted average score: …", "GPA: …", "PI: …"; the weighted-average line of each block sits on a full-width ink bar with paper text; blocks alternate the two ground tones.

### 5.3 Average score questions (blueprint `faq-open-two-column-reading`)

- **Why this blueprint:** six plain answers visible together, as reading text; a different shape from the comparison table above and the pushed-right table below.
- **Ground:** `--pg-ground-2`.
- **Layout:** the h2 "Average score questions" at `--pg-head` in columns 1–3, top-aligned. Columns 5–12: six paragraphs in two text columns (`columns: 2; column-gap: 56px`, about 36ch) at body, leading 1.55; the question as a run-in in weight 500; 20px between paragraphs; `break-inside: avoid`. Nothing collapses.
- **Questions and answers** (the FAQPage JSON-LD, word for word):
  1. **How do I calculate my weighted average score?** Multiply each course's score by its units, add the results and divide by your total units. Scores of 76, 65 and 56 in 3-unit courses and 72 and 61 in 2-unit courses give 857 ÷ 13 = 65.9.
  2. **Is my weighted average score the same as my CGPA?** No. Your CGPA averages grade points on the 5-point scale, so a 69 and a 60 both count as a B (4 points). The weighted average keeps the scores themselves, so it shows the difference between them.
  3. **How is it different from PI?** PI turns each score into points on the 5-point scale (score ÷ 100 × 5) and averages them by units, so PI is your weighted average score divided by 20: 65.9 ÷ 20 = 3.30.
  4. **When would I need a weighted average score?** Some scholarship, postgraduate and job forms ask for an average score instead of a CGPA. Give the figure the form asks for, and attach your university's transcript wherever the form asks for proof.
  5. **Which rows are left out?** Rows with a score outside 0 to 100, or units of 0 or less, are left out, and the tool tells you how many. Empty rows are ignored. Nothing you type is saved.
  6. **Can I use letter grades instead of scores?** No. A letter covers a range (a B is anything from 60 to 69), so it has no single score. For letter grades, use the CGPA calculator.
- **Phone:** one column at body, 16px margins; the heading leads at 32px; 18px between paragraphs.

### 5.4 More free tools, same scale (blueprint `list-statement-table-pushed-right`)

- **Why this blueprint:** five links in a short table pushed right, with one photograph so the screen is full; a different shape from the reading columns above.
- **Ground:** `--pg-ground`.
- **Layout:** the h2 across the full width on two lines at `--pg-head`, first line indented 3vw: "More free tools, / same scale". 96px below, the table in columns 8–12, with the word "Tools" at small in column 7. Rows at body, 26px apart: kind (soft) · tool name (text link) at 30% · arrow (two 2px strokes):
  - Semester · CGPA calculator → `/calculator`
  - Class · Degree class checker → `/tools/degree-class-checker`
  - Target · Required GPA → `/tools/required-gpa`
  - Retake · Carry-over impact → `/tools/carry-over-impact`
  - (44px gap) All · All free tools → `/tools`
- **Columns 1–4:** a 4:5 photograph 22vw wide, bottom-aligned with the last row: the lecture hall at the Federal University of Technology, Minna (§6), caption at small.
- **Phone:** heading at 32px without the indent; rows full width, kind above name, arrow on the right; "Tools" dropped; the photograph follows at 60% width on the right margin.

### 5.5 Close (blueprint `cta-plain-sentence-one-action`)

- **Layout:** on `--pg-ground-2`; 30svh above, 20svh below before the footer. On the left margin, the sentence at lead, 34ch: "Keep your scores in one record, every semester, with GPA and PI beside them." 24px below, the `sm` primary **Start your free record** (`/register`) and on its baseline "All free tools". Signed in: "Your record is waiting." with **Open dashboard**.
- **Phone:** sentence at 20px, button at natural width (44px), 20svh above, 14svh below.
- **The page's single rest screen.**

### 5.6 Footer

The shared `PublicFooter`; the imprint credits this page's photograph.

## 6. Imagery

| Slot | Picture | Source and licence | Treatment |
|---|---|---|---|
| The tool | The score slip (`data-ui`) | AcadeGrade's own interface | Paper on the ground |
| The working | The receipt (`data-ui`, 420 × about 520px) | AcadeGrade's own interface | Paper, zigzag bottom |
| §5.4 | FUT Minna lecture hall (listed in `01` §6; also the home showcase) | Wikimedia Commons, by Baleegraphy, CC BY-SA 4.0, credit required | Greyscale and indigo, 4:5 crop (a different crop from the home page's full bleed), AVIF under 100 KB, lazy |
| Footer stamp | UNN gate | as `home.md` | 3:4, 88px |

- **Picture count:** two interface fragments plus two photographs: four (inspector floor met).
- **Credit line:** "FUT Minna Lecture Hall by Baleegraphy (CC BY-SA 4.0, via Wikimedia Commons; tinted)."

## 7. Motion

- **Signature (short version):** the slip rises 24px with opacity and its stripe fills step by step (5 × 60ms), once per session.
- **Live:** the average tweens over 320ms (one decimal, tabular, so the width holds); GPA and PI tween with it; the compact meter's dot travels in 320ms; a new row rises 16px with opacity in 160ms and focus moves to its code field; a removed row fades in 160ms, then leaves; the receipt's values update without motion.
- **Entrances:** the receipt enters 70ms after the slip; §5.2's table rows enter 40ms apart and the ink column rises with the first row; §5.3 paragraphs by column; §5.4 rows 40ms apart and the photograph drifts (scale 1.00 → 1.04 over the section's scroll).
- **Count:** at least 16 moving elements over load and one scroll. Reduced motion and data saver: no travel, no drift; values swap at once.

## 8. Components

- **Used:** `PublicHeader`, `Slip` (`result` editable, `receipt`), `Stripe`, `ArcMeter` (compact), `Field`, `Button`, `TextLink`, `Figure`, `Credit`, `SectionHeading`, `Reveal`, `CookieStub`, `PublicFooter`.
- **Shared tool frame:** `ToolPage.tsx`, rebuilt as in `tool-degree-class-checker.md` §8.
- **Client island:** `WeightedAverageCalculator` (rows, foot bar, receipt, phone strip) in `calculators.tsx`. §5.2 is a server component with the example's figures (it does not follow the visitor's rows, so the comparison stays a fixed reference).
- **Data:**
  - `tools-config.ts` (extended): copy, six FAQs, `question`, `group`, `example` (the five rows), prefill keys, `toolJsonLd(slug)`.
  - `tool-math.ts`: `weightedAverageFromRows` keeps its maths, filled/used/skipped rule and return shape; adds `gpaAndPiFromRows(rows)` (the calculator's split, then `computeSemesterGPA`), the comma rule in `parseNumber`, and `calculatorLinkFromRows(rows)` (null unless every used row has whole units 1–6).
  - `lib/public/calculator-url.ts` (shared with the calculator): the encoder for the link and the decoder for `?c=`.
  - `lib/public/scales.ts`: the score range, scale line, bands.
- **Retired:** `ResultBox`, `NumberField` (Geist Mono removed), the outlined "Add a course" button style.

## 9. SEO

- **Title:** "Weighted average score calculator" → "Weighted average score calculator | AcadeGrade".
- **Description:** "Work out your weighted average score from course scores and units, and see how it compares with your GPA and PI. Up to 20 courses. Free, nothing saved." (151 characters)
- **Keywords:** weighted average score calculator, credit weighted average, average score by units, how to calculate weighted average score Nigeria.
- **Canonical:** `/tools/weighted-average` (absolute; no parameters).
- **Open Graph:** the score slip showing "65.9 out of 100" with the stripe.
- **JSON-LD:**
  - `WebApplication`: name "Weighted average score calculator", url, `applicationCategory: "EducationalApplication"`, `operatingSystem: "Web"`, `isAccessibleForFree: true`, `offers: { price: 0, priceCurrency: "NGN" }`, `inLanguage: "en-NG"`, `publisher` → the site `Organization`.
  - `FAQPage`: exactly the six questions and answers in §5.3.
  - `BreadcrumbList`: Home › Free tools › Weighted average score calculator.
- **Content SEO:** §5.2 explains the rule and how it differs from GPA and PI with one shared example; the FAQ answers the how-to and "is it my CGPA" searches.

## 10. Accessibility

- **One h1** (the slip title); h2 for the receipt, each section and the close.
- **Rows:** each row is a `<fieldset>` with a visually hidden `<legend>` ("Course 1" or "CSC 301"); the desktop column header row is `aria-hidden`; every field has its own accessible name (§4); hints and errors by `aria-describedby`.
- **Focus:** after Add, to the new row's code field; after Remove, to the next row's code field or Add; "Try an example" keeps focus on itself and announces "Example filled in" politely.
- **Live region:** the foot bar, polite, debounced 500ms: "Weighted average score 65.9 out of 100, across 13 units. The same scores give a GPA of 4.15 and a PI of 3.30." The phone strip and the receipt are not live.
- **Compact meter:** `role="img"`, "GPA from these scores 4.15 of 5.00".
- **§5.2 table:** table roles as described; on phones each block is a heading (h3, the row name) plus a `<dl>`.
- **Targets and text:** every field 52px tall; Remove and Add at least 44px; nothing under 14px.
- **Photograph:** alt "The lecture hall at the Federal University of Technology, Minna".

## 11. Carried over, replaced and removed

| Today | In the redesign |
|---|---|
| Thin shell, no mobile menu | The shared public shell; **Free tools** marked current |
| h1 "Weighted average score" | Kept, in the slip header |
| Description "…This is a percentage, not a CGPA." | New sentence and description; no "percentage" anywhere |
| Rows of `NumberField` "Score n (0 to 100)" and "Units n" in Geist Mono with a grey "Remove" | Slip rows: optional code, score, units, product, "Remove" (Hanken tabular) |
| Outlined "Add a course" button, max 20 | Full-width row button, max 20 (kept) |
| Three empty rows to start; last row can't be removed | Kept |
| Red alert "n rows are left out: use a score from 0 to 100 and units of 1 or more." | Notes line "…units above 0." (now matches the maths) plus field errors on blur |
| `ResultBox` "Weighted average score: 65.9%" / "Across 13 units. This is a percentage, not a CGPA." | Foot bar "65.9 out of 100", units and courses, GPA and PI from the same scores, compact meter; the receipt |
| Three FAQs | Six FAQs as reading text; the "percentage" answer rewritten |
| "More free tools" list, outlined "Track your results for free" | §5.4 table with the hub; the close's one primary |
| FAQPage JSON-LD only | `WebApplication` + `FAQPage` + `BreadcrumbList` |
| No link to or from the calculator | Prefill from the calculator's Next questions; "See these in the CGPA calculator" |

**Tests to update:** `tests/unit/tool-pages.test.tsx` keeps the existing maths test (80/3, 60/1, 120/2, empty → 75, 4 units, 1 skipped); update any label queries to the new accessible names; add every row of §5.1's table, the 20-row limit, the prefill read-and-strip, `gpaAndPiFromRows`, `calculatorLinkFromRows`, and a check that the rendered page contains no "%" next to the average and no "percentage".

## 12. Acceptance checklist

- [ ] The example shows 65.9 out of 100 across 13 units, GPA 4.15 and PI 3.30; the receipt sums to 857 ÷ 13.
- [ ] Every row of §5.1's table passes; PI equals the average ÷ 20 in every case.
- [ ] The words "percentage", "official" (except in "not an official result") and any credential-evaluation name never describe the average; no "%" appears beside it.
- [ ] 20 rows maximum; the last row cannot be removed; errors per field on blur; commas work.
- [ ] Calculator prefill brings scores over (and refuses letter grades with the note); "See these in the CGPA calculator" opens the same courses there, and is hidden for non-whole units.
- [ ] `inspect.mjs` 0 FAIL at 1440/768/390, light and dark (pictures: 2 `data-ui` + 2 photographs; one rest screen); `lint.mjs` and `impeccable detect` clean.
- [ ] Lighthouse mobile ≥ 90 ×4; JSON-LD validates; the FAQ matches the page word for word.
- [ ] No mono, no eyebrow, no icon tiles, no pills, no numbering, no gradients, no shadows at rest.

## 13. Open items for the owner

1. **FAQ 4** ("Some scholarship, postgraduate and job forms ask for an average score…") states why students need this number. Confirm it matches what your students are asked for, or tell us the forms they mention most.
2. **Units:** today (and in this plan) units may be decimals, such as 1.5. Keep that, or require whole units as the calculator does?
