# Page plan · Degree class checker (`/tools/degree-class-checker`)

This page inherits `01`–`04` and follows the exemplar `pages/home.md`; anything not stated here follows those files. It is an **Operate** page: one field, one answer. The tool is a small result slip: the visitor types a CGPA on it and the class prints in the slip's foot bar beside the arc meter, with the working shown on a receipt beside it.

Code today: `app/(public)/tools/degree-class-checker/page.tsx` (wraps `ToolPage` and `DegreeClassCalculator`), `calculators.tsx`, `fields.tsx` (`NumberField`, `ResultBox`), `tool-math.ts` (`checkDegreeClass`, `parseNumber`), `tools-config.ts` (title, description, keywords, three FAQs, `faqJsonLd`). Engine: `resolveDegreeClass`, `roundCgpa`, `formatCgpa`, `DEGREE_CLASS_BANDS` in `lib/cgpa/academicRules.ts`.

## 1. Purpose

- **Mode:** Operate.
- **Visitor:** a student who searched "what CGPA is a First Class in Nigeria", "is 4.45 a first class", "2:1 CGPA range" or "degree class calculator", or who followed the calculator's Next questions link with their CGPA already filled in. Usually on a phone, often right after results.
- **First question:** "Which class is my CGPA, and how far am I from the next one?" Answered on the first screen as soon as a number is typed.
- **One action:** typing the CGPA (the answer appears live; there is no submit button). The page's only primary button is in the close: **Start your free record**.
- **Secondary (text links):** "Try 4.43" (fills an example), "What do I need to get there?" (Required GPA, prefilled), the other tools, All free tools.

## 2. The argument

| # | Claim | Proof on the page | Section |
|---|---|---|---|
| 1 | Type your CGPA and see your class at once | The slip: one field, the class in the foot bar, the dot on the arc | The checker (§5.1) |
| 2 | The answer is explained, including the rounding at the edge | The receipt beside the slip: what you typed, how it is shown, which band it falls in | The checker (§5.1) |
| 3 | These are the class lines Nigerian universities use | The five thresholds set as a ledger, with the rounding rule | Where each class begins (§5.2) |
| 4 | The searches people make are answered plainly | Six answers, open on the page | Degree class questions (§5.3) |
| 5 | The next question is one tap away | The other tools, the calculator and the hub | More free tools (§5.4) |
| 6 | Keeping a record is free | One sentence, one action | Close (§5.5) |

## 3. First screen

### Desktop (1440×900)

- **Header:** the shared `PublicHeader`; **Free tools** carries `aria-current="page"`.
- **Columns 1–7: the checker slip** (`Slip` variant `result`, editable, `data-ui`, about 790px wide), 24px below the header:
  1. Stripe band, 56px.
  2. Header, centred: the mark (24px); the **h1** "Degree class checker" at `--pg-head` (64px, one line); the meta line at small, "Free tools · Nigerian university 5-point scale, with PI" ("Free tools" is a text link to `/tools`; the scale line is read from `lib/public/scales.ts`); the sentence at body, 48ch: "Type your CGPA to see which class it falls in on the 5-point scale used by Nigerian universities, and how far the next class is."
  3. Body, left-aligned on the 40px inner padding: the `Field` "Your CGPA" (label above at small weight 500; field 280px × 52px; `inputmode="decimal"`; the typed figure at body in tabular figures), the hint below it "Two decimals, from 0.00 to 5.00", and to the field's right on its baseline the text button "Try 4.43".
  4. Perforation.
  5. **Foot bar** (ink, paper text, 168px, `role="status"`): the rounded CGPA on gold at `--pg-head` with the label "CGPA" above it at small; the class at lead ("Second Class Upper"); the gap line at small ("0.07 to First Class, which starts at 4.50"); the `ArcMeter` at the right, 200px, dot at the rounded CGPA, ticks 1.50 / 2.40 / 3.50 / 4.50 with class names at small.
  6. On paper under the foot bar, small, centred: "A personal estimate, not an official result. Nothing you type is saved."
- **Columns 9–12: the working** (`Slip` variant `receipt`, 420px, paper, zigzag bottom, `data-ui`), top-aligned with the slip's header block: an h2 at lead, "How your class is read", then rows at body with dot leaders:
  - You typed ········ 4.426
  - Shown as (two decimals, half up) ········ 4.43
  - First Class ········ 4.50 to 5.00
  - Second Class Upper ········ 3.50 to 4.49 ← this row inverted (ink bar, paper text, 44px)
  - Second Class Lower ········ 2.40 to 3.49
  - Third Class ········ 1.50 to 2.39
  - Pass ········ 1.00 to 1.49
  - Below a Pass ········ under 1.00
  - Closing line at small: "Next class up: First Class at 4.50, 0.07 higher."
  - Under the receipt, on the ground, the text link "What do I need to get there?" → `/tools/required-gpa?current=4.43` (it opens Required GPA with the CGPA filled in and First Class chosen as the target).
- **At 1440×900** everything above is on the first screen (header 72 + 24 + slip about 640px).

### Phone (390×844)

- The slip runs full width inside the 16px margins: 40px stripe; mark; h1 at 40px on two lines ("Degree class / checker"); meta line; sentence; the field at full inner width; the hint; "Try 4.43" on its own line (44px target); perforation; the foot bar with the gold figure and the class on row 1, the gap line on row 2 and the arc meter full width (220px, abbreviations Pass, 3rd, 2:2, 2:1, 1st) on row 3.
- **First screen at 390×844 with the cookie stub open:** h1, sentence, the field and the top of the foot bar. The phone's decimal keypad opens on focus and the foot bar sits directly under the field, so the answer is visible above the keypad (the field is scrolled to 96px from the top on focus).
- The receipt follows the slip at full width with its zigzag edge, then the Required GPA link.

### Why this works

- **Fast:** one field, a live answer, no button. The class is the largest word on the screen once a number is typed.
- **Specific:** it explains the rounding at the edge (4.495 versus 4.494), which is exactly what students argue about, and it uses the Nigerian 5-point class lines, not a generic converter.

## 4. Copy deck (final wording; sentence case; two-line rule checked)

- **Title tag:** "Degree class checker" (template adds "| AcadeGrade").
- **h1:** "Degree class checker" (20 characters).
- **Meta line:** "Free tools · Nigerian university 5-point scale, with PI".
- **Sentence:** "Type your CGPA to see which class it falls in on the 5-point scale used by Nigerian universities, and how far the next class is." (128 characters)
- **Field:** label "Your CGPA" (kept; tests use it); hint "Two decimals, from 0.00 to 5.00"; example button "Try 4.43".
- **Foot bar:** label "CGPA"; class names "First Class", "Second Class Upper", "Second Class Lower", "Third Class", "Pass", "Below a Pass"; gap line "0.07 to First Class, which starts at 4.50"; at the top: "The top class on this scale."; empty: "Your class appears here".
- **Under the foot bar:** "A personal estimate, not an official result. Nothing you type is saved."
- **Receipt:** h2 "How your class is read"; rows as §3; closing line "Next class up: First Class at 4.50, 0.07 higher."; link "What do I need to get there?".
- **Errors:** "Enter a CGPA from 0.00 to 5.00."; with a likely slip of the decimal point: "Enter a CGPA from 0.00 to 5.00. Did you mean 4.43?" ("4.43" is a text button that fills it).
- **Section headings (h2):** "Where each class / begins" (24); "Degree class questions" (22); "More free tools, / same scale" (27).
- **Close:** "Keep every semester in one record and your class updates itself." (11 words) Button **Start your free record**; signed in "Your record is waiting." with **Open dashboard**; text link "All free tools".

## 5. Sections

### 5.1 The checker (the tool; app-screen craft inside the dealt hero "Striped card beside the room", adjusted)

- **Blueprint and adjustment:** the dealt hero sets a printed card beside a photograph of the room. Here the card is the working slip (columns 1–7) and the room is replaced by the receipt of the working (columns 9–12): on an Operate page the explanation of the number earns the place a photograph would take. Kept: the stripe band, the centred printed header, one ink on paper. Inside the slip, app-screen rules: label above field, tabular figures, a missing value as a grey dash, colour only on data (gold on the CGPA, examiner red only for an error).
- **Behaviour kept from today:**
  - Parses with `parseNumber` (empty or non-numeric text is null, never zero).
  - `checkDegreeClass(value)` returns null outside 0–5; otherwise the band of the rounded CGPA (`roundCgpa`, half up, float-safe), the next band up and the gap (`roundCgpa(next.minCGPA − rounded)`).
  - The answer updates as the visitor types; the result region is a polite live region.
  - "This is the highest class on this scale" at First Class (reworded "The top class on this scale.").
- **Added, with reasons:**
  - **Comma as decimal point:** "4,43" is read as 4.43 (some Android keyboards offer only a comma). `parseNumber` gains a `,` → `.` step before `Number()`.
  - **"Did you mean":** a whole number from 100 to 500 with no decimal point (a missed point: "443") shows the suggestion of that number ÷ 100. Nothing is filled until the visitor taps it.
  - **"Below a Pass"** replaces the engine's band label "Fail" in the display (from `scales.ts`); the band and maths are unchanged.
  - **Prefill:** `?cgpa=4.42` (used by the calculator's Next questions) fills the field once on load if it parses to 0–5, then the parameter is removed with `router.replace` so the address bar never disagrees with the field. Invalid values are ignored silently.
  - **Errors only on blur:** while typing "5." or "4.4" nothing shouts; an out-of-range value shows its message on blur, and the foot bar shows its empty state until the value is valid.
- **Scale from data:** the field's limits (0.00 to maxPoint), the receipt's rows, class names and the arc's ticks are read from `DEFAULT_SCALE` in `lib/public/scales.ts` (shape in `calculator.md` §8); the class is computed by the engine. With one live scale there is no switcher, and no other scale is mentioned.
- **Sample data and pinned results** (each line a unit test against `tool-math.ts`):

| Typed | Shown as | Class | Next class and gap |
|---|---|---|---|
| 4.43 | 4.43 | Second Class Upper | First Class at 4.50, 0.07 |
| 4.426 | 4.43 | Second Class Upper | First Class at 4.50, 0.07 |
| 4.495 | 4.50 | First Class | top class |
| 4.494 | 4.49 | Second Class Upper | First Class at 4.50, 0.01 |
| 4.496 | 4.50 | First Class | top class (existing test) |
| 5.00 | 5.00 | First Class | top class |
| 3.50 | 3.50 | Second Class Upper | First Class at 4.50, 1.00 |
| 3.49 | 3.49 | Second Class Lower | Second Class Upper at 3.50, 0.01 |
| 2.40 | 2.40 | Second Class Lower | Second Class Upper at 3.50, 1.10 |
| 2.39 | 2.39 | Third Class | Second Class Lower at 2.40, 0.01 |
| 1.50 | 1.50 | Third Class | Second Class Lower at 2.40, 0.90 |
| 1.00 | 1.00 | Pass | Third Class at 1.50, 0.50 |
| 0.85 | 0.85 | Below a Pass | Pass at 1.00, 0.15 |
| 0 | 0.00 | Below a Pass | Pass at 1.00, 1.00 |
| 4,43 | 4.43 | Second Class Upper | as 4.43 |
| 5.01, −1, "abc" | none | error on blur | none |
| 443 | none | error with "Did you mean 4.43?" | none |

- **States:**
  - **Empty** (first load): the field shows no value (no placeholder figure that could be mistaken for a result); the foot bar prints "—" on the gold block's place (soft ink, no gold) and "Your class appears here"; the arc meter shows no dot; the receipt shows "You typed ········ —" and the bands with no row inverted.
  - **Valid:** as §3.
  - **Top class:** gap line "The top class on this scale."; the receipt's closing line "You are in the top class."
  - **Below a Pass:** class "Below a Pass"; gap line "0.15 to a Pass, which starts at 1.00"; the gold block becomes a paper block (gold is kept for success, `01` §4).
  - **Invalid:** on blur the field's bottom border turns `--pg-mark` 2px, the message shows under the hint (linked by `aria-describedby`), and the foot bar returns to its empty state. Focus stays in the field.
  - **No JavaScript:** a server-rendered slip with the field disabled and the line "Turn on JavaScript to use the checker."; the receipt lists every band, and §5.2 and §5.3 answer the question in full without it.
  - **Signed in:** the close changes as §4. Nothing else differs (the tool saves nothing).
- **Analytics:** `tool_used` `{ tool: 'degree-class-checker' }` once per page view on the first valid result, after analytics consent only.

### 5.2 Where each class begins (blueprint `stats-column-aligned-on-the-decimal`)

- **Why this blueprint:** the content is five threshold figures. A ledger aligned on the decimal point makes them the subject, and it is a different shape from the slip and receipt above.
- **Ground:** `--pg-ground-2`, full bleed.
- **Left, columns 1–5:** the h2 on two lines at `--pg-head`, the first line in `--pg-on-ground-soft`, the second in full ink: "Where each class / begins", at mid-height. Under it, 32px, the rule in full at body (the "real explanation" this page carries):
  > Most Nigerian universities classify degrees on a 5-point CGPA. Your class is read from your CGPA rounded to two decimals, half up, the same way your result shows it. So 4.495 shows as 4.50 and is First Class, while 4.494 shows as 4.49 and is Second Class Upper, 0.01 short.
  >
  > Some universities add conditions, such as no outstanding carry-overs for a First. Your handbook is the final word.
- **Right, columns 7–12:** five figures at `--pg-display`, leading 1.0, tabular, aligned on the decimal point (three tracks: the whole number right-aligned, the point and decimals left-aligned, the caption on the baseline at body):
  - **4.50** First Class · 4.50 to 5.00
  - **3.50** Second Class Upper · 3.50 to 4.49
  - **2.40** Second Class Lower · 2.40 to 3.49
  - **1.50** Third Class · 1.50 to 2.39
  - **1.00** Pass · 1.00 to 1.49
  - At small under the column: "Below 1.00 there is no class on this scale."
- **Live link:** the row of the visitor's class carries a 12px gold square before the figure (a fill, never gold text) with the visually hidden text "Your CGPA is in this class".
- **All figures and names from `scales.ts`.**
- **Phone:** the heading first at 32px; the two paragraphs; then the figures at `--pg-display` (40px at this width), keeping the decimal alignment with the split at 52% of the width; each caption under its figure at small; 28px between rows.

### 5.3 Degree class questions (blueprint `faq-open-two-column-reading`)

- **Why this blueprint:** six short answers shown at once suit search visitors who want one line, and it differs from the ledger above.
- **Ground:** `--pg-ground`.
- **Layout:** the h2 "Degree class questions" at `--pg-head` in columns 1–3, top-aligned. Columns 5–12 hold six paragraphs in two text columns (`columns: 2; column-gap: 56px`, about 36ch each) at body, leading 1.55; each opens with its question as a run-in in weight 500 and continues with the answer in weight 400; 20px between paragraphs; `break-inside: avoid`. Nothing collapses.
- **Questions and answers** (the FAQPage JSON-LD, word for word; figures templated from `scales.ts`):
  1. **What CGPA is a First Class in Nigeria?** On the 5-point scale most Nigerian universities use, First Class is a CGPA of 4.50 to 5.00. Second Class Upper is 3.50 to 4.49, Second Class Lower 2.40 to 3.49, Third Class 1.50 to 2.39 and Pass 1.00 to 1.49. Your handbook is the final word.
  2. **Is a CGPA of 4.49 a First Class?** No. 4.49 is Second Class Upper, 0.01 short of First Class at 4.50. Classes are read from the CGPA rounded to two decimals, so a CGPA of 4.495 or more shows as 4.50 and counts as First Class here. Ask your department how your school rounds.
  3. **What CGPA is a 2:1?** A Second Class Upper (2:1) is a CGPA of 3.50 to 4.49. A Second Class Lower (2:2) is 2.40 to 3.49.
  4. **Can I still make First Class from where I am?** It depends on how many units you have left. Put your CGPA, units done and units left into the Required GPA tool to see the average you would need, or the highest CGPA you can still reach.
  5. **What happens below a CGPA of 1.00?** On this scale there is no class below 1.00, where a Pass begins. Your school's regulations say what happens next, so speak to your level adviser.
  6. **Is this my official degree class?** No. It is a personal estimate from the CGPA you type. Your university awards your class, and nothing you type here is saved.
- **Phone:** one column at body with 16px margins; the heading leads at 32px; 18px between paragraphs; nothing collapses.

### 5.4 More free tools, same scale (blueprint `list-statement-table-pushed-right`)

- **Why this blueprint:** five links are a short table with a kind, a name and an arrow; pushing it right leaves room for one photograph, so the screen is full without a card grid. It differs from the reading columns above.
- **Ground:** `--pg-ground-2`.
- **Layout:** the h2 spans the full width on two lines at `--pg-head`, its first line indented 3vw: "More free tools, / same scale". 96px below, the table in columns 8–12; the word "Tools" at small hangs in column 7, top-aligned with the first row. Rows at body, 26px apart, three parts: the kind in soft ink at the left, the tool name (a text link) at 30%, and a drawn arrow (two 2px strokes) at the right:
  - Semester · CGPA calculator → `/calculator`
  - Target · Required GPA → `/tools/required-gpa`
  - Retake · Carry-over impact → `/tools/carry-over-impact`
  - Average · Weighted average score → `/tools/weighted-average`
  - (44px gap) All · All free tools → `/tools`
- **Columns 1–4:** a 4:5 photograph 22vw wide, bottom-aligned with the last row: the Faculty of Arts building, University of Nigeria, Nsukka (§6), caption at small.
- **Phone:** the heading at 9.5vw (mapped to `--pg-head`, 32px) without the indent; the table full width, each row stacking the kind above the name, arrow on the first line's right; the word "Tools" is dropped; the photograph follows at 60% width on the right margin.

### 5.5 Close (blueprint `cta-plain-sentence-one-action`)

- **Layout:** on `--pg-ground`; 30svh above, 20svh below before the footer. On the page's left margin, the sentence at lead, 34ch: "Keep every semester in one record and your class updates itself." 24px below, the `sm` primary button **Start your free record** (`/register`) and on its baseline the text link "All free tools". Signed in: "Your record is waiting." with **Open dashboard**.
- **Phone:** the sentence at 20px; the button at natural width, 44px; 20svh above, 14svh below.
- **The page's single rest screen.**

### 5.6 Footer

The shared `PublicFooter`, whose Free tools group links all five tools; the imprint credits this page's photograph.

## 6. Imagery

| Slot | Picture | Source and licence | Treatment |
|---|---|---|---|
| The tool | The checker slip (`data-ui`) | AcadeGrade's own interface | Paper on the ground |
| The working | The receipt slip (`data-ui`, 420 × about 460px) | AcadeGrade's own interface | Paper, zigzag bottom |
| §5.4 | Faculty of Arts building, University of Nigeria, Nsukka (`openverse:b3c160f7-73d6-4186-a774-fb1bfcf78e23`) | Wikimedia Commons, by Udeagbala, CC BY-SA 4.0, credit required | Greyscale and indigo, 4:5 crop, AVIF under 100 KB, lazy |
| Footer stamp | UNN gate | as `home.md` | 3:4, 88px |

- **Picture count:** two interface fragments of at least 300×200 plus two photographs: four (inspector floor met, two real).
- **Credit line:** "Faculty of Arts Building, University of Nigeria, Nsukka, by Udeagbala (CC BY-SA 4.0, via Wikimedia Commons; tinted)."

## 7. Motion

- **Signature (short version):** the slip rises 24px with opacity and its stripe fills step by step (5 × 60ms), once per session.
- **Live:** the CGPA figure tweens over 320ms; the dot travels along the arc in 320ms; the class name crossfades in 160ms; the receipt's inverted row moves to the new band with a 160ms crossfade (the bar does not slide, so nothing moves under the reader's eye); "You typed" and "Shown as" update without motion.
- **Entrances:** the receipt rises with the standard entrance 70ms after the slip; §5.2 figures enter 50ms apart; §5.3 paragraphs by column; §5.4 rows 40ms apart; the §5.4 photograph drifts (scale 1.00 → 1.04 over the section's scroll).
- **Controls:** text-link underline 2px → 3px; button stripe on hover; gold focus outline at once.
- **Count:** at least 16 moving elements over load and one scroll. Reduced motion and data saver: no travel, no drift; values swap at once.

## 8. Components

- **Used:** `PublicHeader`, `Slip` (`result` editable, `receipt`), `Stripe`, `ArcMeter`, `Field`, `Button`, `TextLink`, `Figure`, `Credit`, `SectionHeading`, `Reveal`, `CookieStub`, `PublicFooter`.
- **Shared tool frame:** `app/(public)/tools/ToolPage.tsx` is rebuilt as the frame all four tools share: the slip shell (stripe, centred header with the h1, meta line and sentence), a slot for the tool body and foot bar, a slot for the working receipt, a slot for the rule section (§5.2), then the FAQ, More free tools, the close and the JSON-LD. Each tool passes its own body, working and rule section.
- **Client island:** `DegreeClassCalculator` (field, foot bar, receipt, the gold square in §5.2) in `calculators.tsx`, sharing one small store. Everything else is a server component.
- **Data:**
  - `tools-config.ts` (extended): title, h1, sentence, description, keywords, the six FAQs, `question`, `group`, `example` (4.43), prefill keys, and a `toolJsonLd(slug)` builder beside `faqJsonLd`.
  - `tool-math.ts`: `checkDegreeClass` unchanged; `parseNumber` gains the comma rule; a new `suggestDecimal(text)` for "Did you mean".
  - `lib/public/scales.ts` (shape in `calculator.md` §8): limits, class names, thresholds.
- **Retired:** `ResultBox` (replaced by the foot bar), `NumberField` and `selectClass` in `fields.tsx` (replaced by the public `Field`; Geist Mono removed).

## 9. SEO

- **Title:** "Degree class checker" → "Degree class checker | AcadeGrade".
- **Description:** "Type your CGPA and see your degree class on the Nigerian 5-point scale: First Class from 4.50, 2:1 from 3.50, 2:2 from 2.40. Free, and nothing is saved." (152 characters)
- **Keywords:** degree class calculator, CGPA to degree class Nigeria, first class CGPA 5.0 scale, 2:1 CGPA range, what CGPA is first class.
- **Canonical:** `/tools/degree-class-checker` (absolute; no parameters).
- **Open Graph:** the checker slip showing 4.43 · Second Class Upper with the stripe (`next/og`, 1200×630).
- **JSON-LD:**
  - `WebApplication`: name "Degree class checker", url, `applicationCategory: "EducationalApplication"`, `operatingSystem: "Web"`, `isAccessibleForFree: true`, `offers: { price: 0, priceCurrency: "NGN" }`, `inLanguage: "en-NG"`, `publisher` → the site `Organization`.
  - `FAQPage`: exactly the six questions and answers in §5.3.
  - `BreadcrumbList`: Home › Free tools (`/tools`) › Degree class checker.
- **Content SEO:** §5.2 carries the full rule (thresholds, rounding, handbook); §5.3 answers the common searches. The page links to the hub, the calculator and the three other tools.

## 10. Accessibility

- **One h1** (the slip title); h2 for the working, each section and the close (visually hidden "Start your record").
- **The field:** a native `<input>` with a visible `<label>` "Your CGPA", the hint and any error linked by `aria-describedby`; `inputmode="decimal"`, `autocomplete="off"`, `enterkeyhint="done"`.
- **Live region:** the foot bar is `role="status"`, polite, debounced 500ms: "CGPA 4.43. Second Class Upper. 0.07 to First Class." The receipt is not a live region (it would repeat).
- **Arc meter:** `role="img"`, label "CGPA 4.43 of 5.00, Second Class Upper".
- **Receipt:** a `<dl>` of term and value pairs; the matched class row also carries visually hidden text "Your class".
- **Errors:** words plus the text icon, never colour alone; the "Did you mean 4.43?" button is a real `<button>`.
- **Targets and text:** "Try 4.43" and every link at least 44px tall; nothing under 14px; the gold figure is ink on gold (about 9:1).

## 11. Carried over, replaced and removed

| Today | In the redesign |
|---|---|
| Thin shell (`PublicHeader` + `PublicFooter` from `PublicShell`), no mobile menu | The shared public shell; **Free tools** marked current |
| h1 "Degree class checker" (Bricolage) | Same words, in the slip header (Hanken Grotesk) |
| Description used as the intro sentence | A new sentence (§4); the description stays for metadata (rewritten, §9) |
| Calculator in a rounded `ring-1` box | The checker slip |
| `NumberField` "Your CGPA" in Geist Mono, placeholder "3.85" | Public `Field` "Your CGPA" in Hanken tabular figures; no placeholder figure; "Try 4.43" instead |
| Red `role="alert"` "Enter a CGPA between 0 and 5.00." while typing | "Enter a CGPA from 0.00 to 5.00." on blur, plus "Did you mean" |
| `ResultBox` "A CGPA of 4.43 falls in Second Class Upper (2:1). First Class starts at 4.50, which is 0.07 higher." | Foot bar (gold figure, class, gap line, arc meter) and the receipt |
| "This is the highest class on this scale." | "The top class on this scale." |
| Note "This is a quick estimate for planning, not an official result… Nothing you type here is saved or sent anywhere." | "A personal estimate, not an official result. Nothing you type is saved." (keeps the phrase the current test looks for) |
| Three FAQs in a `<dl>` | Six FAQs as reading text (§5.3), the first three rewritten for search |
| "More free tools" link list + "Full CGPA calculator" + outlined "Track your results for free" | §5.4 table (with the hub) and the close's one primary |
| FAQPage JSON-LD only | `WebApplication` + `FAQPage` + `BreadcrumbList` |
| Class label "Fail" (engine) under 1.00 | Shown as "Below a Pass" |

**Tests to update:** `tests/unit/tool-pages.test.tsx` keeps working with the label "Your CGPA", `role="status"` and the "not an official result" phrase; extend it with every row of §5.1's table, the comma and "Did you mean" cases, the prefill read-and-strip, and `WebApplication` in the JSON-LD.

## 12. Acceptance checklist

- [ ] Typing 4.43 shows Second Class Upper with "0.07 to First Class" and the dot between the 3.50 and 4.50 ticks; every row of §5.1's table passes.
- [ ] 4.495 → First Class; 4.494 → Second Class Upper, 0.01; the receipt shows the rounding step.
- [ ] Errors appear on blur, never while typing; "443" offers 4.43; "4,43" works.
- [ ] `?cgpa=4.42` fills the field and leaves a clean address bar; a bad value is ignored.
- [ ] Phone 390×844: the answer is visible above the decimal keypad while typing.
- [ ] Links: hub (meta line and §5.4), calculator, the three other tools and the prefilled Required GPA link all resolve.
- [ ] `inspect.mjs` 0 FAIL at 1440/768/390, light and dark (pictures: 2 `data-ui` + 2 photographs; one rest screen); `lint.mjs` and `impeccable detect` clean.
- [ ] Lighthouse mobile ≥ 90 ×4; the JSON-LD validates and the FAQ matches the page word for word.
- [ ] No mono, no eyebrow, no icon tiles, no pills, no shadows at rest, no gradients, no "coming soon" or other scales mentioned.

## 13. Open items for the owner

1. **The First Class condition line** in §5.2 ("Some universities add conditions, such as no outstanding carry-overs for a First") is a general statement; confirm it is true for the schools you know, or drop the example and keep "Your handbook is the final word."
2. **"Below a Pass"** as the display name for the engine's "Fail" band (under 1.00): confirm the wording.
