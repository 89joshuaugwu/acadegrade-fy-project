# Page plan · Carry-over impact (`/tools/carry-over-impact`)

This page inherits `01`–`04` and follows the exemplar `pages/home.md`; anything not stated here follows those files. It is an **Operate** page. The tool is a small result slip: the visitor enters their CGPA, units and the failed course, picks the retake grade on the grade keys, and **two** answers print in the slip's foot bar, one for each rule schools use, each with its own small arc meter. The page says plainly that schools differ and never pretends to know which rule a visitor's school uses.

Code today: `app/(public)/tools/carry-over-impact/page.tsx` (wraps `ToolPage` and `CarryOverCalculator`), `calculators.tsx`, `fields.tsx`, `tool-math.ts` (`carryOverImpact`, `parseNumber`), `tools-config.ts` (title "Carry-over impact calculator", heading "Carry-over impact on your CGPA", three FAQs). Engine: `GRADE_POINTS`, `roundCgpa`, `resolveDegreeClass`, `isCarryOver` in `lib/cgpa/academicRules.ts`.

## 1. Purpose

- **Mode:** Operate.
- **Visitor:** a student with an F on their result, usually anxious, often on a phone. They searched "carry over CGPA", "how does a carry over affect my CGPA", "does resit replace F", or came from the calculator's carry-over note with their numbers filled in.
- **First question:** "What will retaking this course do to my CGPA?" Answered on the first screen, for both rules, as soon as three numbers are in.
- **One action:** filling the slip (live; no submit button). The page's only primary button is in the close: **Start your free record**.
- **Secondary (text links):** "Try an example", the other tools, All free tools.
- **Tone:** calm and practical. A carry-over is common and fixable; the page shows the way back up, without alarm words and without red except on the F itself.

## 2. The argument

| # | Claim | Proof on the page | Section |
|---|---|---|---|
| 1 | See your CGPA after the retake, whichever rule your school uses | The slip: three lines and a grade key, two answers in the foot bar | The retake slip (§5.1) |
| 2 | Each answer is worked out in the open | The receipt: both sums side by side | The retake slip (§5.1) |
| 3 | The two rules really give different answers, and here is why | The two results set large, with the sum under each and every retake grade tabled | Two rules, two answers (§5.2) |
| 4 | The worries students have are answered | Six answers, open on the page | Carry-over questions (§5.3) |
| 5 | The next question is one tap away | The other tools, the calculator and the hub | More free tools (§5.4) |
| 6 | A record flags carry-overs and clears them when you pass | One sentence, one action | Close (§5.5) |

## 3. First screen

### Desktop (1440×900)

- **Header:** the shared `PublicHeader`; **Free tools** carries `aria-current="page"`.
- **Columns 1–7: the retake slip** (`Slip` variant `result`, editable, `data-ui`, about 790px), 24px below the header:
  1. Stripe band, 56px.
  2. Header, centred: the mark; the **h1** "Carry-over impact" at `--pg-head` (one line at 64px; today's longer heading "Carry-over impact on your CGPA" would take three lines on a phone, which the two-line rule forbids, so "on your CGPA" moves into the title tag and the sentence); the meta line at small, "Free tools · Nigerian university 5-point scale, with PI" ("Free tools" links to `/tools`; the scale line from `lib/public/scales.ts`); the sentence at body, 50ch: "See what retaking a failed course could do to your CGPA. Schools count a retake in one of two ways, so you get both answers."
  3. Body: three `Field`s in one row on desktop (each 52px, label above, hint below): "Current CGPA" (hint "As your result shows it, with the F"), "Units completed (including the failed course)" (hint "Every unit behind that CGPA"), "Units of the failed course" (hint "For example 3"). Below them, the label "Grade you expect on the retake" and the six `GradeKeys` A–F (44px each, the chosen key ink-filled; default C, as today). Then the text button "Try an example".
  4. Perforation.
  5. **Foot bar** (ink, paper text, 184px, `role="status"`), three cells:
     - **Now** (left): label "Now" at small; the current CGPA at lead; its class at small ("Second Class Lower").
     - **Outcome 1:** a paper block (ink text) with the label "If the retake is added as extra units" at small; the figure at `--pg-head` ("3.10"); the change at lead ("+0.10"); the class at small; a compact `ArcMeter` (96px, no tick labels) with its dot at 3.10.
     - **Outcome 2:** the same block: "If the retake replaces the F"; "3.25"; "+0.25"; class; compact arc meter at 3.25.
     - Neither outcome is on gold: the page does not favour a rule it cannot know. Gold appears only as each meter's dot.
  6. On paper under the foot bar, small, centred: "Schools differ. Your handbook or exams officer can tell you which rule yours uses. A personal estimate, not an official result; nothing you type is saved."
- **Columns 9–12: the working** (`Slip` variant `receipt`, 420px, zigzag bottom, `data-ui`), top-aligned with the slip's header block: h2 at lead "How both are worked out", then two groups at body with dot leaders (example values):
  - **Added as extra units**
    - Points now, 3.00 × 60 ········ 180.00
    - Retake, A (5) × 3 units ········ 15.00
    - Units, 60 + 3 ········ 63
    - Inverted row: "195.00 ÷ 63 = 3.10"
  - **Replaces the F**
    - Points now ········ 180.00
    - The F's 0 points become ········ 15.00
    - Units stay ········ 60
    - Inverted row: "195.00 ÷ 60 = 3.25"
- **At 1440×900** everything above is on the first screen (header 72 + 24 + slip about 770px).

### Phone (390×844)

- The slip full width inside 16px margins: 40px stripe; mark; h1 at 40px on two lines ("Carry-over / impact"); meta line; sentence; the three fields stacked; the grade keys (48px each, full inner width); "Try an example"; perforation; the foot bar stacks: Now on one line ("Now 3.00 · Second Class Lower"), then each outcome block full width with its compact meter at the right.
- **First screen at 390×844 with the cookie stub open:** h1, sentence and the first field. A 56px ink results strip is fixed to the bottom of the viewport while the foot bar is off-screen and the inputs are valid: "Extra units 3.10 · Replaces 3.25" at body, `aria-hidden`; it hides when the foot bar is in view.
- The receipt follows the slip at full width, the two groups stacked.

### Why this works

- **Fast:** three numbers and one tap; both answers appear at once.
- **Specific and honest:** it names the real difference between schools instead of picking one rule, and shows each sum so a student can take it to their exams officer.

## 4. Copy deck (final wording; sentence case; two-line rule checked)

- **Title tag:** "Carry-over impact calculator" (template adds "| AcadeGrade").
- **h1:** "Carry-over impact" (17 characters; one line on desktop, two on a phone).
- **Meta line:** "Free tools · Nigerian university 5-point scale, with PI".
- **Sentence:** see §3 (127 characters).
- **Fields (labels kept; tests use them):** "Current CGPA", "Units completed (including the failed course)", "Units of the failed course", "Grade you expect on the retake"; hints as §3.
- **Example button:** "Try an example" (fills 3.00, 60, 3 and selects A).
- **Foot bar:** "Now"; "If the retake is added as extra units"; "If the retake replaces the F"; changes "+0.10", "−0.14" (a true minus sign), "no change" (soft ink, for 0.00); class change line "Moves you up to Second Class Upper" / "Moves you down to Third Class"; empty: "Fill in the three lines to see both answers."
- **Under the foot bar:** "Schools differ. Your handbook or exams officer can tell you which rule yours uses. A personal estimate, not an official result; nothing you type is saved."
- **Receipt:** h2 "How both are worked out"; group names "Added as extra units", "Replaces the F".
- **Section headings (h2):** "Two rules, two answers" (22); "Carry-over questions" (20); "More free tools, / same scale" (27).
- **Close:** "Your record flags every carry-over and clears it when you pass." (11 words) Button **Start your free record**; signed in "Your record is waiting." with **Open dashboard**; text link "All free tools".

## 5. Sections

### 5.1 The retake slip (the tool; app-screen craft inside the dealt hero "Striped card beside the room", adjusted)

- **Blueprint and adjustment:** the printed card is the working slip (columns 1–7); the photograph of the room is replaced by the receipt of both sums (columns 9–12). Kept: stripe band, centred printed header, one ink on paper. Inside: labels above fields, tabular figures right-aligned, the sign in the text, red only on the F key when it is chosen.
- **Behaviour kept from today:**
  - `carryOverImpact({ currentCgpa, completedUnits, failedUnits, retakeGrade })`: points = CGPA × completed units; retake points = `GRADE_POINTS[grade]` × failed units; **added as extra units** = (points + retake points) ÷ (completed + failed); **replaces the F** = (points + retake points) ÷ completed. Both rounded with `roundCgpa`. (Replacing works this way because the F already sits inside the completed units with 0 points; the retake gives those same units its points.)
  - Null (no result) when any line is empty or non-numeric, the CGPA is outside 0–5, completed units are 0 or below, failed units are 0 or below, or failed units exceed completed units.
  - Default retake grade C. The change shown against the rounded "before" value, to two decimals.
- **Added, with reasons:**
  - **An impossible CGPA is caught.** With an F of f units inside c completed units, the CGPA cannot be above 5 × (c − f) ÷ c. Today 5.00 with a 3-unit F gives nonsense. New: if `roundCgpa(current) > roundCgpa(5 × (c − f) ÷ c)`, the result is withheld and the message reads "With a 3-unit F inside 60 units, your CGPA can't be above 4.75. Check the numbers." (Comparing rounded values lets a true 4.8276 typed as 4.83 through.)
  - **Grade keys** replace the native `<select>` (same values A–F).
  - **Class change line** under an outcome when its class differs from now's (via `resolveDegreeClass`).
  - **Per-field errors on blur** replace the single combined alert.
  - **Comma as decimal point.**
  - **Prefill:** `?current=4.32&done=87&failed=3&grade=C` (any subset), read once, validated, then removed with `router.replace`. The calculator's carry-over note links here this way.
- **Scale from data:** the grade keys, their points, the CGPA limits, class names and the meters' range are read from `DEFAULT_SCALE` in `lib/public/scales.ts` (shape in `calculator.md` §8); the maths is the engine's. With one live scale there is no switcher and no other scale is mentioned.
- **Sample data and pinned results** (each a unit test against `tool-math.ts`):

| Current | Done | Failed | Retake | Added as extra units | Replaces the F | Notes |
|---|---|---|---|---|---|---|
| 3.00 | 60 | 3 | A | (180 + 15) ÷ 63 = 3.0952 → **3.10** (+0.10) | 195 ÷ 60 = **3.25** (+0.25) | The page's example; existing test |
| 3.00 | 60 | 3 | B | 192 ÷ 63 = 3.05 (+0.05) | 192 ÷ 60 = 3.20 (+0.20) | |
| 3.00 | 60 | 3 | C | 189 ÷ 63 = 3.00 (no change) | 189 ÷ 60 = 3.15 (+0.15) | Default key |
| 3.00 | 60 | 3 | D | 186 ÷ 63 = 2.9524 → 2.95 (−0.05) | 186 ÷ 60 = 3.10 (+0.10) | FAQ 4 |
| 3.00 | 60 | 3 | E | 183 ÷ 63 = 2.9048 → 2.90 (−0.10) | 183 ÷ 60 = 3.05 (+0.05) | |
| 3.00 | 60 | 3 | F | 180 ÷ 63 = 2.8571 → 2.86 (−0.14) | 180 ÷ 60 = 3.00 (no change) | |
| 3.45 | 60 | 3 | A | 222 ÷ 63 = 3.5238 → 3.52, "Moves you up to Second Class Upper" | 222 ÷ 60 = 3.70, same line | Class change |
| 4.32 | 87 | 3 | C | (375.84 + 9) ÷ 90 = 4.276 → 4.28 (−0.04) | 384.84 ÷ 87 = 4.4234 → 4.42 (+0.10) | From the calculator's example (MTH 301 failed) |
| 5.00 | 60 | 3 | A | withheld: "…can't be above 4.75…" | withheld | Impossible CGPA |
| 3.00 | 2 | 3 | A | none | none | Failed above completed; existing test |

- **States (final wording):**
  - **Empty / partly filled:** the foot bar shows "Now —" and both outcome blocks with "—" in soft ink and no meter dots; the line "Fill in the three lines to see both answers."; the receipt shows its row names with "—".
  - **Valid:** as §3.
  - **Both rules give the same figure** (possible after rounding): both blocks show it; nothing special is said.
  - **Retake F:** outcome 1 "2.86 (−0.14)", outcome 2 "3.00, no change"; the F key is filled in `--pg-mark`.
  - **Invalid (on blur, per field; bottom border `--pg-mark` 2px):** Current CGPA "Enter a CGPA from 0.00 to 5.00."; Units completed "Enter more than 0 units."; Units of the failed course "Enter the failed course's units, 1 or more."; failed above completed "The failed course's units can't be more than your units completed."; the impossible-CGPA message above. The foot bar returns to its empty state.
  - **No JavaScript:** a server-rendered slip with fields disabled and "Turn on JavaScript to use the tool."; §5.2 shows the example's results for every retake grade, so the question is still answered.
  - **Signed in:** only the close changes.
- **Analytics:** `tool_used` `{ tool: 'carry-over-impact' }` once per page view on the first valid result, after analytics consent.

### 5.2 Two rules, two answers (blueprint `showcase-two-giant-words-compared`, adjusted)

- **Why this blueprint:** the page's whole point is a comparison of two figures. This composition is exactly two specimens side by side with a caption each, and it differs from the slip and receipt above.
- **Adjusted:** the blueprint sets the specimens at 180–520px and crops them at 60% of their height. Here they are set at `--pg-display` (96px, the largest of the five steps) and **not cropped**, because these are figures a student must read exactly.
- **Ground:** `--pg-ground-2`, full bleed.
- **Top row:** the h2 "Two rules, two answers" at `--pg-head` at the left margin; in columns 7–12 a paragraph at body (47 words):
  > Schools differ. Some keep the failed attempt on your record and add the retake as new units, so the F keeps weighing on your CGPA. Others replace the F with the retake grade. Your handbook or exams officer can tell you which rule yours uses.
- **Then 12vh of space, then two specimens**, one starting on column 1 and one on column 7, each with:
  - a caption at body above it: "Retake added as extra units" / "Retake replaces the F";
  - the figure at `--pg-display`, leading 0.8, tabular: **3.10** / **3.25** (the visitor's live results; the example when the slip is empty);
  - under it at body, the sum: "(180 + 15) ÷ 63 = 3.10" / "(180 + 15) ÷ 60 = 3.25";
  - and one sentence at body in `--pg-on-ground-soft`: "The F's 3 units stay in your total with 0 points, and the retake adds 3 more." / "The F's 3 units now carry the retake's 15 points; your total units stay at 60."
  - Both specimens share one ink; the difference is in the values.
- **Then, 64px below, "What each retake grade does"** (a real `<table>` with `<caption>` "For a CGPA of 3.00 over 60 units with a 3-unit F", live with the visitor's numbers), across columns 1–12 at body, tabular, right-aligned figures, 1px row rules, no header band:

| Retake grade | Added as extra units | Replaces the F |
|---|---|---|
| A (5) | 3.10 | 3.25 |
| B (4) | 3.05 | 3.20 |
| C (3) | 3.00 | 3.15 |
| D (2) | 2.95 | 3.10 |
| E (1) | 2.90 | 3.05 |
| F (0) | 2.86 | 3.00 |

  The visitor's chosen grade's row is marked by a 12px gold square in its first cell (with visually hidden "Your choice").
- **Phone:** heading, then the paragraph, at full width; the two specimens stack, each in its own block at `--pg-display` (40px at this width) with its caption, sum and sentence; the second block takes the inverse colours (ink field, paper text), as the blueprint asks; the table follows at full width (three columns fit at 358px at body).

### 5.3 Carry-over questions (blueprint `faq-open-two-column-reading`)

- **Why this blueprint:** six plain answers visible at once, set as reading text; it differs from the specimens above and the table below.
- **Ground:** `--pg-ground`.
- **Layout:** the h2 "Carry-over questions" at `--pg-head` in columns 1–3, top-aligned. Columns 5–12: six paragraphs in two text columns (`columns: 2; column-gap: 56px`, about 36ch) at body, leading 1.55; each opens with its question as a run-in in weight 500; 20px between paragraphs; `break-inside: avoid`. Nothing collapses.
- **Questions and answers** (the FAQPage JSON-LD, word for word):
  1. **How does a carry-over affect my CGPA?** A failed course (F) adds its units to your total with 0 points, so it pulls your CGPA down until you pass it. For example, 57 units averaging 3.16 plus a 3-unit F comes to about 180 points over 60 units: a CGPA of 3.00.
  2. **Does a retake replace my F?** It depends on your school. Some replace the failed attempt with the retake grade; others keep the F and add the retake as new units. This tool shows both, so check your handbook for the rule that applies to you.
  3. **Should I count the failed course in units completed?** Yes. Enter your units completed including the failed course, and your current CGPA as your result shows it. The F is already inside that CGPA with 0 points.
  4. **Can a retake lower my CGPA?** Only when the retake is added as extra units and its grade is below your current CGPA. With a CGPA of 3.00 over 60 units, a D (2 points) on a 3-unit retake gives 2.95. When the retake replaces the F, it can never lower your CGPA.
  5. **What is the difference between a carry-over and a spill-over?** A carry-over is a course you failed and must take again. A spill-over is a student who stays beyond the normal length of the programme, often to clear carry-overs.
  6. **Is this result official?** No. It is a personal estimate from the numbers you type, and nothing is saved. Your university's result is the official one.
- **Phone:** one column at body, 16px margins; the heading leads at 32px; 18px between paragraphs.

### 5.4 More free tools, same scale (blueprint `list-statement-table-pushed-right`)

- **Why this blueprint:** five links in a short table pushed right, with one photograph to fill the screen; a different shape from the reading columns above.
- **Ground:** `--pg-ground-2`.
- **Layout:** the h2 across the full width on two lines at `--pg-head`, the first line indented 3vw: "More free tools, / same scale". 96px below, the table in columns 8–12, with the word "Tools" at small in column 7. Rows at body, 26px apart: kind (soft) · tool name (text link) at 30% · arrow (two 2px strokes):
  - Semester · CGPA calculator → `/calculator`
  - Class · Degree class checker → `/tools/degree-class-checker`
  - Target · Required GPA → `/tools/required-gpa`
  - Average · Weighted average score → `/tools/weighted-average`
  - (44px gap) All · All free tools → `/tools`
- **Columns 1–4:** a 4:5 photograph 22vw wide, bottom-aligned with the last row: a lecture hall at Ibrahim Badamasi Babangida University, Lapai (§6), caption at small.
- **Phone:** heading at 32px without the indent; rows full width, kind above name, arrow on the right; "Tools" dropped; the photograph follows at 60% width on the right margin.

### 5.5 Close (blueprint `cta-plain-sentence-one-action`)

- **Layout:** on `--pg-ground`; 30svh above, 20svh below before the footer. On the left margin, the sentence at lead, 34ch: "Your record flags every carry-over and clears it when you pass." 24px below, the `sm` primary **Start your free record** (`/register`) and on its baseline "All free tools". Signed in: "Your record is waiting." with **Open dashboard**.
- **Phone:** sentence at 20px, button at natural width (44px), 20svh above, 14svh below.
- **The page's single rest screen.** (The sentence is true: `outstandingCarryOvers` in the engine clears an F once a later semester passes the same course code.)

### 5.6 Footer

The shared `PublicFooter`; the imprint credits this page's photograph.

## 6. Imagery

| Slot | Picture | Source and licence | Treatment |
|---|---|---|---|
| The tool | The retake slip (`data-ui`) | AcadeGrade's own interface | Paper on the ground |
| The working | The receipt (`data-ui`, 420 × about 480px) | AcadeGrade's own interface | Paper, zigzag bottom |
| §5.4 | IBBU Lapai lecture hall (listed in `01` §6) | Wikimedia Commons; check the licence on download (CC0, BY or BY-SA only) | Greyscale and indigo, 4:5 crop, AVIF under 100 KB, lazy |
| Footer stamp | UNN gate | as `home.md` | 3:4, 88px |

- **Picture count:** two interface fragments plus two photographs: four (inspector floor met).
- **If the IBBU picture's licence does not allow use,** take "Learning at FUTO" (CC BY-SA 4.0) or another Nigerian lecture hall from `assets.mjs "lecture hall Nigeria"`.
- **Credit line:** "Lecture hall, IBBU Lapai, by … (licence as downloaded, via Wikimedia Commons; tinted)."

## 7. Motion

- **Signature (short version):** the slip rises 24px with opacity and its stripe fills step by step (5 × 60ms), once per session.
- **Live:** both outcome figures tween over 320ms together; each compact meter's dot travels in 320ms; the change values crossfade in 160ms; the chosen grade key fills in 160ms and scales to 0.97 on press; the receipt's values update without motion.
- **Entrances:** the receipt enters 70ms after the slip; in §5.2 the two specimens rise one after the other (120ms apart) and the table's rows enter 40ms apart; §5.3 paragraphs by column; §5.4 rows 40ms apart and the photograph drifts (scale 1.00 → 1.04 over the section's scroll).
- **Count:** at least 16 moving elements over load and one scroll. Reduced motion and data saver: no travel, no drift; values swap at once.

## 8. Components

- **Used:** `PublicHeader`, `Slip` (`result` editable, `receipt`), `Stripe`, `ArcMeter` (regular and compact 96px without tick labels), `Field`, `GradeKeys`, `Button`, `TextLink`, `Figure`, `Credit`, `SectionHeading`, `Reveal`, `CookieStub`, `PublicFooter`.
- **Shared tool frame:** `ToolPage.tsx`, rebuilt as in `tool-degree-class-checker.md` §8.
- **Client island:** `CarryOverCalculator` (fields, keys, foot bar, receipt, the live §5.2 specimens and table, the phone strip) in `calculators.tsx`, one store. Everything else is a server component; without JavaScript, §5.2 renders the example.
- **Data:**
  - `tools-config.ts` (extended): copy, six FAQs, `question`, `group`, `example` (3.00, 60, 3, A), prefill keys, `toolJsonLd(slug)`.
  - `tool-math.ts`: `carryOverImpact` keeps its maths and null rule, gains the impossible-CGPA check; a new `carryOverTable(input)` returns both outcomes for every grade (feeds §5.2).
  - `lib/public/scales.ts`: grade points, limits, class names.
- **Retired:** the native `<select>` and `selectClass`, `ResultBox`, `NumberField` (Geist Mono removed).

## 9. SEO

- **Title:** "Carry-over impact calculator" → "Carry-over impact calculator | AcadeGrade".
- **Description:** "See how retaking a failed course changes your CGPA under the two common rules: the retake added as extra units, or the retake replacing the F. Free." (148 characters)
- **Keywords:** carry over CGPA, how does a carry over affect CGPA, resit course CGPA effect, failed course CGPA calculator, does retake replace F.
- **Canonical:** `/tools/carry-over-impact` (absolute; no parameters).
- **Open Graph:** the retake slip showing 3.10 and 3.25 with the stripe.
- **JSON-LD:**
  - `WebApplication`: name "Carry-over impact calculator", url, `applicationCategory: "EducationalApplication"`, `operatingSystem: "Web"`, `isAccessibleForFree: true`, `offers: { price: 0, priceCurrency: "NGN" }`, `inLanguage: "en-NG"`, `publisher` → the site `Organization`.
  - `FAQPage`: exactly the six questions and answers in §5.3.
  - `BreadcrumbList`: Home › Free tools › Carry-over impact calculator.
- **Content SEO:** §5.2 explains both rules with their sums and a full table for every retake grade.

## 10. Accessibility

- **One h1** (the slip title); h2 for the receipt, each section and the close.
- **Fields:** native inputs with visible labels; hints and errors by `aria-describedby`; `inputmode="decimal"` for the CGPA, `numeric` for units.
- **Grade keys:** `role="radiogroup"` labelled "Grade you expect on the retake"; each key's name includes its points ("C, 3 points"); arrow keys move.
- **Live region:** the foot bar, polite, debounced 500ms: "Now 3.00. If the retake is added as extra units: 3.10, up 0.10. If it replaces the F: 3.25, up 0.25." The minus sign is read as "down".
- **Compact meters:** `role="img"`, e.g. "3.10 of 5.00, Second Class Lower".
- **§5.2 table:** `<caption>`, `<th scope="col">` and `<th scope="row">`; numbers right-aligned.
- **Colour:** red only on the F key and its error text, always with words; the gold squares carry hidden text.
- **Photograph:** alt "A lecture hall at Ibrahim Badamasi Babangida University, Lapai".

## 11. Carried over, replaced and removed

| Today | In the redesign |
|---|---|
| Thin shell, no mobile menu | The shared public shell; **Free tools** marked current |
| h1 "Carry-over impact on your CGPA" | "Carry-over impact" in the slip header (two lines at most on a phone); "CGPA" stays in the title tag, sentence and description |
| Description as intro | New sentence; description rewritten |
| Three `NumberField`s in Geist Mono (placeholders 3.10 / 60 / 3) | Three `Field`s with the same labels, no placeholder figures, "Try an example" |
| Native `<select>` "A (5 points)…F (0 points)", default C | `GradeKeys` A–F, default C |
| Combined red alert | Per-field messages on blur, plus the impossible-CGPA check |
| `ResultBox`: "Now: 3.00 / If your school adds the retake as extra units: 3.10 (+0.10) / If the retake replaces the failed attempt: 3.25 (+0.25)" | Foot bar with Now and two equal outcome blocks, compact meters, class-change lines; the receipt with both sums |
| Three FAQs | Six FAQs as reading text, the first three rewritten |
| Generic note "quick estimate for planning…" | The plain "Schools differ…" line under the foot bar (keeps "not an official result") |
| "More free tools" list, outlined "Track your results for free" | §5.4 table with the hub; the close's one primary |
| FAQPage JSON-LD only | `WebApplication` + `FAQPage` + `BreadcrumbList` |

**Tests to update:** `tests/unit/tool-pages.test.tsx` keeps the existing maths test (3.00, 60, 3, A → 3.10 / 3.25; failed above completed → null); add every row of §5.1's table, the impossible-CGPA case, `carryOverTable`, grade-key keyboard use, and the prefill read-and-strip.

## 12. Acceptance checklist

- [ ] The example (3.00, 60, 3, A) shows 3.10 (+0.10) and 3.25 (+0.25); the receipt's two sums read 195.00 ÷ 63 and 195.00 ÷ 60.
- [ ] Every row of §5.1's table passes, including F (2.86 / 3.00, no change), the class-change case (3.52 / 3.70, up to Second Class Upper) and the impossible 5.00.
- [ ] The page never says which rule the visitor's school uses; both answers have equal weight (no gold on either).
- [ ] The calculator's carry-over link fills 4.32, 87, 3 and shows 4.28 and 4.42.
- [ ] Errors per field on blur; commas work; grade keys work by keyboard.
- [ ] `inspect.mjs` 0 FAIL at 1440/768/390, light and dark (pictures: 2 `data-ui` + 2 photographs; one rest screen); `lint.mjs` and `impeccable detect` clean. Every heading is two lines or fewer at 390px.
- [ ] Lighthouse mobile ≥ 90 ×4; JSON-LD validates; the FAQ matches the page word for word.
- [ ] No mono, no eyebrow, no icon tiles, no pills, no numbering, no gradients, no shadows at rest.

## 13. Open items for the owner

1. **The spill-over answer** (FAQ 5) uses the common meaning (a student staying beyond the normal programme length). Confirm it matches how your students use the word.
2. **The IBBU Lapai photograph:** confirm its licence on download, or choose the fallback.
