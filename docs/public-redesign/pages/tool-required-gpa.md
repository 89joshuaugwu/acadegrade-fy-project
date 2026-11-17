# Page plan · Required GPA (`/tools/required-gpa`)

This page inherits `01`–`04` and follows the exemplar `pages/home.md`; anything not stated here follows those files. It is an **Operate** page. The tool is a small result slip the visitor fills in (CGPA so far, units done, units left, target), and the average they need prints in the slip's foot bar beside the arc meter, with the sum worked out on a receipt beside it.

Code today: `app/(public)/tools/required-gpa/page.tsx` (wraps `ToolPage` and `RequiredGpaCalculator`), `calculators.tsx`, `fields.tsx`, `tool-math.ts` (`requiredGpa`, `parseNumber`), `tools-config.ts` (title "Required GPA calculator", heading "What GPA do I need?", three FAQs). Engine: `requiredAverageForTarget`, `maxReachableCgpa`, `roundCgpa`, `resolveDegreeClass` in `lib/cgpa/academicRules.ts`.

## 1. Purpose

- **Mode:** Operate.
- **Visitor:** a student planning the next semesters, after results or before course registration. They searched "what GPA do I need to get first class", "how to move from 2:2 to 2:1", "required GPA calculator", or came from the calculator or the degree class checker with their CGPA already filled in.
- **First question:** "What average do I need from here to reach my target, and can I still reach it?" Answered on the first screen as soon as the four lines are filled.
- **One action:** filling the slip (the answer is live; no submit button). The page's only primary button is in the close: **Start your free record**.
- **Secondary (text links):** "Try an example", the target class keys, the other tools, All free tools.

## 2. The argument

| # | Claim | Proof on the page | Section |
|---|---|---|---|
| 1 | Four numbers give you the average you need | The slip: fill four lines, the answer prints in the foot bar | The planner (§5.1) |
| 2 | You can see exactly how it is worked out | The receipt: target points, points so far, points still needed, divided by units left | The planner (§5.1) |
| 3 | The rule is simple enough to do by hand | The rule told in four stepped lines with the same example | How the sum works (§5.2) |
| 4 | The common planning questions are answered | Six answers beside a library photograph | Planning questions (§5.3) |
| 5 | The next question is one tap away | The other tools, the calculator and the hub | More free tools (§5.4) |
| 6 | A record does this every semester for you | One sentence, one action | Close (§5.5) |

## 3. First screen

### Desktop (1440×900)

- **Header:** the shared `PublicHeader`; **Free tools** carries `aria-current="page"`.
- **Columns 1–7: the planner slip** (`Slip` variant `result`, editable, `data-ui`, about 790px), 24px below the header:
  1. Stripe band, 56px.
  2. Header, centred: the mark; the **h1** "What GPA do I need?" at `--pg-head` (64px, one line); the meta line at small, "Free tools · Nigerian university 5-point scale, with PI" ("Free tools" links to `/tools`; the scale line from `lib/public/scales.ts`); the sentence at body, 50ch: "Enter your CGPA so far, the units behind it and the units you have left, then choose a target. You'll see the average you need from here."
  3. Body, a two-by-two grid of `Field`s (each 52px, label above at small weight 500, hint below): "Current CGPA" (hint "0.00 to 5.00") · "Units completed" (hint "All the units behind that CGPA") · "Units remaining" (hint "Units you still expect to take") · and the target line spanning both columns:
     - the label "Target", then five **class keys** in one row (a radiogroup of filled square keys, 56px tall, the chosen one ink-filled): "First Class 4.50" · "2:1 3.50" · "2:2 2.40" · "Third 1.50" · "Pass 1.00" (the short name at body, the figure at small beneath);
     - beside the keys, the `Field` "Target CGPA" (140px). Choosing a key fills it; typing a value equal to a threshold selects that key; any other value leaves no key selected.
  4. Under the grid, the text button "Try an example".
  5. Perforation.
  6. **Foot bar** (ink, paper text, 176px, `role="status"`): the average needed on gold at `--pg-head` with the label "Average you need" above it at small; beside it at lead "over your remaining 60 units"; at small "to finish on 3.50, Second Class Upper"; a second small line "Highest you can still reach: 4.03"; the `ArcMeter` at the right, 200px, dot at the needed average.
  7. On paper under the foot bar, small, centred: "A personal estimate, not an official result. Nothing you type is saved."
- **Columns 9–12: the working** (`Slip` variant `receipt`, 420px, zigzag bottom, `data-ui`), top-aligned with the slip's header block: h2 at lead "How it's worked out", then rows at body with dot leaders (example values):
  - Target ········ 3.50
  - All units, 90 + 60 ········ 150
  - Points the target needs, 3.50 × 150 ········ 525.00
  - Points so far, 3.38 × 90 ········ 304.20
  - Points still needed ········ 220.80
  - Inverted final row (ink bar, paper text): "220.80 ÷ 60 units = 3.68"
  - Closing line at small: "With an A in every remaining course: (304.20 + 5 × 60) ÷ 150 = 4.03."
- **At 1440×900** everything above is on the first screen (header 72 + 24 + slip about 760px).

### Phone (390×844)

- The slip runs full width inside the 16px margins: 40px stripe; mark; h1 at 40px on two lines ("What GPA / do I need?"); meta line; sentence; then the fields stacked in reading order (Current CGPA, Units completed, Units remaining), then "Target" with the five keys in one row (59px each with 6px gaps, short name over figure), then "Target CGPA" full width; "Try an example"; perforation; the foot bar (gold figure and "over your remaining 60 units" on row 1, the two small lines on row 2, the arc meter full width on row 3).
- **First screen at 390×844 with the cookie stub open:** h1, sentence and the first two fields. Each field scrolls to 96px from the top on focus so its hint stays visible above the keypad. While the foot bar is off-screen and all four lines are valid, a 56px ink results strip is fixed to the bottom of the viewport (above the cookie stub while it is open): "You need 3.68" at lead, `aria-hidden` (the foot bar is the live region); it hides when the foot bar is in view.
- The receipt follows the slip at full width.

### Why this works

- **Fast:** the four lines are the whole task; the answer and the highest reachable CGPA appear together, so the visitor learns both "how hard" and "is it possible" at once.
- **Specific:** the targets are the Nigerian class lines as keys, so most visitors never type a target.

## 4. Copy deck (final wording; sentence case; two-line rule checked)

- **Title tag:** "Required GPA calculator" (template adds "| AcadeGrade").
- **h1:** "What GPA do I need?" (19 characters; kept from today).
- **Meta line:** "Free tools · Nigerian university 5-point scale, with PI".
- **Sentence:** see §3 (137 characters).
- **Fields (labels kept; tests use them):** "Current CGPA", "Units completed", "Units remaining", "Target CGPA"; group label "Target"; keys "First Class 4.50", "2:1 3.50", "2:2 2.40", "Third 1.50", "Pass 1.00" (accessible names "First Class, 4.50" and so on).
- **Hints:** "0.00 to 5.00"; "All the units behind that CGPA"; "Units you still expect to take".
- **Example button:** "Try an example" (fills 3.38, 90, 60, 3.50).
- **Foot bar:** label "Average you need"; "over your remaining 60 units"; "to finish on 3.50, Second Class Upper"; "Highest you can still reach: 4.03"; empty: "Fill in all four lines to see the average you need."
- **Other outcomes:** see §5.1 states (final wording there).
- **Under the foot bar:** "A personal estimate, not an official result. Nothing you type is saved."
- **Receipt:** h2 "How it's worked out"; rows as §3.
- **Section headings (h2):** "How the sum works" (17; visually hidden, because the first stepped line is the visible heading); "Planning questions" (18); "More free tools, / same scale" (27).
- **Close:** "Set your target once and your record works it out every semester." (12 words) Button **Start your free record**; signed in "Your record is waiting." with **Open dashboard**; text link "All free tools".

## 5. Sections

### 5.1 The planner (the tool; app-screen craft inside the dealt hero "Striped card beside the room", adjusted)

- **Blueprint and adjustment:** the printed card is the working slip (columns 1–7); the photograph of the room is replaced by the receipt of the sum (columns 9–12), because the visitor's next doubt is "is that right?", which the receipt answers. Kept: stripe band, centred printed header, one ink on paper. Inside: label above field, tabular figures right-aligned, missing values as a grey dash, colour only on data.
- **Behaviour kept from today:**
  - All four lines parsed with `parseNumber`; the result shows only when all four are filled (`touched`).
  - `requiredGpa()` statuses: `invalid` (any null; CGPA or target outside 0–5; units completed below 0; units remaining 0 or below), `unreachable` (needed above 5.00), `secured` (needed 0 or below), `needed`; `maxReachable` from `maxReachableCgpa`, rounded with `roundCgpa`.
  - Units completed may be 0 (a new student): the needed average is then the target itself.
- **Changed and added, with reasons:**
  - **Rounding of the needed average: up, not half up** (needs the owner's yes; §13). Today `required` is rounded half up, so 4.65225 shows as 4.65, an average that would leave the student just short. A needed average should never understate the work, and `home.md` already rounds its own required figure up. New: `ceilTo2(clean(required))`, removing float noise first with the same `toPrecision(12)` step the engine uses (so 3.3800000000000003 stays 3.38). Every example on this page gives the same answer either way except the one marked in the table below.
  - **Class keys** for the target (they fill "Target CGPA"; the field and its label stay).
  - **Per-field errors on blur** replace today's single combined message, so the visitor knows which line is wrong.
  - **Secured shows the lowest finish:** new helper `lowestFinish = current × done ÷ (done + left)`, rounded with `roundCgpa`, so "already secured" comes with a number.
  - **Comma as decimal point** in every field.
  - **Prefill:** `?current=4.43&done=87&left=40&target=4.50` (any subset), read once on load, validated, then removed with `router.replace`. With `current` but no `target`, the target key defaults to the next class above the current CGPA (4.43 → First Class 4.50). Used by the calculator's Next questions and the degree class checker.
- **Scale from data:** limits (0.00 to maxPoint), the class keys and their thresholds, the class names and the arc's ticks are read from `DEFAULT_SCALE` in `lib/public/scales.ts` (shape in `calculator.md` §8); the maths is the engine's. With one live scale there is no switcher and no mention of any other scale.
- **Sample data and pinned results** (each a unit test against `tool-math.ts`):

| Current | Done | Left | Target | Exact need | Shows | Highest reachable | Notes |
|---|---|---|---|---|---|---|---|
| 3.38 | 90 | 60 | 3.50 | (525 − 304.20) ÷ 60 = 3.68 | **needed 3.68** | (304.20 + 300) ÷ 150 = 4.028 → 4.03 | The page's example |
| 3.40 | 90 | 60 | 3.50 | (525 − 306) ÷ 60 = 3.65 | needed 3.65 | 4.04 | Existing test |
| 3.38 | 90 | 60 | 4.50 | (675 − 304.20) ÷ 60 = 6.18 | **out of reach** | 4.03, Second Class Upper | |
| 3.38 | 90 | 60 | 2.40 | (360 − 304.20) ÷ 60 = 0.93 | needed 0.93 | 4.03 | |
| 3.38 | 90 | 60 | 1.50 | (225 − 304.20) ÷ 60 = −1.32 | **already secured**, lowest finish 304.20 ÷ 150 = 2.03 | 4.03 | |
| 4.00 | 60 | 60 | 4.50 | (540 − 240) ÷ 60 = 5.00 | **needed 5.00** (straight As) | 4.50 | |
| 4.20 | 90 | 60 | 4.50 | (675 − 378) ÷ 60 = 4.95 | needed 4.95 | 4.52 | FAQ 1 |
| 3.30 | 120 | 40 | 3.50 | (560 − 396) ÷ 40 = 4.10 | needed 4.10 | 3.725 → 3.73 | FAQ 5 |
| 4.43 | 87 | 40 | 4.50 | (571.50 − 385.41) ÷ 40 = 4.65225 | needed **4.66** (today 4.65) | 4.61 | The rounding case |
| 3.38 | 0 | 60 | 3.50 | 3.50 | needed 3.50 | 5.00 | New student |
| 4.80 | 90 | 10 | 3.00 | −13.20 | already secured, lowest finish 4.32 | 4.82 | Existing test |
| 2.00 | 100 | 10 | 4.50 | 29.50 | out of reach | 250 ÷ 110 = 2.27, Third Class | Existing test |
| 2.00 | 100 | 0 | 3.00 | none | invalid | none | Existing test |

- **States (final wording):**
  - **Empty / partly filled:** the foot bar prints "—" in soft ink where the gold figure goes, with "Fill in all four lines to see the average you need."; no dot on the arc; the receipt shows its row names with "—" values.
  - **Needed:** as §3. Gold figure, "over your remaining 60 units", "to finish on 3.50, Second Class Upper", "Highest you can still reach: 4.03". Arc dot at 3.68; label "Average needed 3.68 of 5.00".
  - **Needed 5.00 exactly:** gold figure 5.00; line "an A in every remaining course"; second line "There is no room for a B. Highest you can still reach: 4.50."
  - **Out of reach:** the figure block turns paper (no gold) and reads "Out of reach"; line at lead "With 60 units left, the highest CGPA you can reach is 4.03, Second Class Upper."; a text button "Aim for 3.50 instead" sets the target key to the highest class at or below the reachable CGPA (here 2:1, 3.50). Arc dot at 4.03 (the highest reachable); label "Highest reachable CGPA 4.03 of 5.00". The receipt's inverted row reads "370.80 needed ÷ 60 units = 6.18 (above 5.00)" (4.50 × 150 = 675.00; 675.00 − 304.20 = 370.80).
  - **Already secured:** gold figure "Secured"; line "Even with an F in every remaining unit you would finish on 2.03, above your target of 1.50." Arc dot at 2.03; label "Lowest possible finish 2.03 of 5.00". Receipt inverted row "−79.20 needed: nothing more to earn".
  - **Invalid (on blur, per field; the bottom border turns `--pg-mark` 2px):** Current CGPA "Enter a CGPA from 0.00 to 5.00."; Units completed "Enter 0 or more units."; Units remaining "Enter more than 0 units."; Target CGPA "Enter a target from 0.00 to 5.00." The foot bar returns to its empty state while any line is invalid.
  - **Target equal to current CGPA:** needed equals the current CGPA ("keep averaging 3.38"); this is the `needed` state with no special copy.
  - **No JavaScript:** a server-rendered slip with fields disabled and "Turn on JavaScript to use the planner."; §5.2 teaches the sum by hand with the same example, so the page still answers the question.
  - **Signed in:** only the close changes.
- **Analytics:** `tool_used` `{ tool: 'required-gpa' }` once per page view on the first valid result, after analytics consent.

### 5.2 How the sum works (blueprint `how-it-works-lines-that-step-across`)

- **Why this blueprint:** the rule is a sequence of four steps, and it should read as a sentence you could do on paper, not as numbered cards. It differs from the slip and receipt above.
- **Ground:** `--pg-ground-2`, full bleed. A visually hidden h2 "How the sum works" opens the section; the first line serves as the visible heading.
- **Four lines at `--pg-head`** (64px at 1440; the blueprint's display size is mapped onto the head step), leading 1.0, one line each on desktop, each starting **one column** further right (columns 1, 2, 3, 4; the blueprint's two-column step is halved so the longest line fits at the head step). Under each line, on its own left edge and 12px below, a sentence at body in `--pg-on-ground-soft`, 34ch. 56px between stages.
  1. **"First, the points you need."** — "Multiply your target by all your units, done and left: 3.50 × 150 = 525."
  2. **"Then, the points you have."** — "Your CGPA times the units behind it: 3.38 × 90 = 304.20. That leaves 220.80 to earn."
  3. **"Share the rest by units."** — "220.80 ÷ 60 = 3.68. That is the average you need, every semester from here."
  4. **"Above 5.00 is out of reach."** — "Then aim for what you can reach: with straight As, (304.20 + 5 × 60) ÷ 150 = 4.03."
- **Under the staircase, in columns 7–12** (the columns left of stage 4 stay empty as the blueprint asks; this block sits to its right and below), the formula once at lead: "Needed average = (target × all units − CGPA × units done) ÷ units left", and at small: "Carry-over courses you will retake count in your units left if your school counts them again. The answer is rounded up, so you never aim too low." (The last sentence only if §13.1 is accepted.)
- **Phone:** lines at `--pg-head` (32px at this width), each may wrap to two lines; the staircase becomes an indent of 6vw per stage (the fourth starts 18vw in); sentences at body on the same indent; 40px between stages; the formula block follows at full width.

### 5.3 Planning questions (blueprint `faq-accordion-beside-tall-photo`, the dealt FAQ)

- **Why this blueprint:** six questions with longer, worked answers suit an accordion, and the tall photograph gives the page its real pictures. It differs from the staircase above and the table below.
- **Ground:** one field in `--pg-ground`, split 5 to 7.
- **Left, columns 1–5:** the h2 "Planning questions" at `--pg-head`; under it three facts as plain lines at body: "Works with any target from 0.00 to 5.00" · "Uses only the four numbers you type" · "Saves nothing". Then six questions as `Accordion` (native `<details>`, summary at lead with the two-stroke chevron, answers at body in full ink, 28px between rows, no lines). The column ends with the text link "More answers on Support" (`/support`). The blueprint's filled button is left out on purpose: the page's one primary is in the close (§5.5).
- **Right, columns 7–12:** a tall 3:4 photograph bleeding off the section's top edge and stopping 80px short of its bottom: the library of Mountain Top University (§6). A square photograph, a third of its width, overlaps its lower-left corner by 40px: the Kenneth Dike Library, University of Ibadan (§6). Captions at small.
- **Questions and answers** (the FAQPage JSON-LD, word for word):
  1. **What GPA do I need to get a First Class?** Work out the points a 4.50 needs over all your units, take away the points you have, and divide by the units you have left. With a CGPA of 4.20 after 90 units and 60 units left, you need (4.50 × 150 − 4.20 × 90) ÷ 60 = 4.95.
  2. **How is the required GPA worked out?** It is the average over your remaining units that brings your overall CGPA to the target: (target × all units − current CGPA × units done) ÷ units left.
  3. **What if the answer is above 5.00?** Then the target cannot be reached with the units you have left, even with an A in every course. The tool shows the highest CGPA you can still reach, so you can aim for that.
  4. **Which units count as remaining?** The units you still expect to take, including any carry-over courses you will retake if your school counts them again. Your course adviser can confirm your remaining load.
  5. **Can I move from a 2:2 to a 2:1 in my final year?** Often, if enough units are left. From a CGPA of 3.30 after 120 units, with 40 units left, reaching 3.50 needs (3.50 × 160 − 3.30 × 120) ÷ 40 = 4.10 on average.
  6. **Does AcadeGrade keep the numbers I type here?** No. This tool saves nothing; close the page and it is gone. In a free AcadeGrade record your target stays set and the needed average updates after each semester.
- **Phone:** the tall photograph leads at full width, 4:5, with the square overlapping its bottom-right corner at 38% width; then the heading at 32px, the facts at body, the accordion full width with 24px between questions and 44px summaries, then the Support link.

### 5.4 More free tools, same scale (blueprint `list-statement-table-pushed-right`)

- **Why this blueprint:** five links as a short table pushed right; here it sits on an ink field so the screen reads as one filled band after the photographs above. It differs from the split FAQ above.
- **Field:** `--pg-ink`, full bleed, as the home page's ink sheet: text in `--pg-paper`, the soft kind column in the night-desk soft value (`--pg-on-ground-soft` from the dark set, #A9A6C4, about 7.4:1 on ink), links underlined in paper. In dark mode the field stays ink, one step lighter than the night ground.
- **Layout:** the h2 across the full width on two lines at `--pg-head`, first line indented 3vw: "More free tools, / same scale". 96px below, the table in columns 8–12; the word "Tools" at small in column 7, top-aligned with the first row. Rows at body, 26px apart: kind (soft) · tool name (text link) at 30% · arrow (two 2px strokes) at the right:
  - Semester · CGPA calculator → `/calculator`
  - Class · Degree class checker → `/tools/degree-class-checker`
  - Retake · Carry-over impact → `/tools/carry-over-impact`
  - Average · Weighted average score → `/tools/weighted-average`
  - (44px gap) All · All free tools → `/tools`
- **No photograph here** (the blueprint's photograph is optional; this page's pictures are in §5.3). The ink field fills the screen for the inspector's empty-screen check.
- **Phone:** heading at 32px without the indent; rows full width, the kind above the name, the arrow on the first line's right; "Tools" dropped.

### 5.5 Close (blueprint `cta-plain-sentence-one-action`)

- **Layout:** on `--pg-ground`; 30svh above, 20svh below before the footer. On the left margin, the sentence at lead, 34ch: "Set your target once and your record works it out every semester." 24px below, the `sm` primary **Start your free record** (`/register`) and on its baseline the text link "All free tools". Signed in: "Your record is waiting." with **Open dashboard**.
- **Phone:** sentence at 20px, button at natural width (44px), 20svh above, 14svh below.
- **The page's single rest screen.**

### 5.6 Footer

The shared `PublicFooter`; the imprint credits this page's two photographs.

## 6. Imagery

| Slot | Picture | Source and licence | Treatment |
|---|---|---|---|
| The tool | The planner slip (`data-ui`) | AcadeGrade's own interface | Paper on the ground |
| The working | The receipt (`data-ui`, 420 × about 420px) | AcadeGrade's own interface | Paper, zigzag bottom |
| §5.3 tall | Library, Mountain Top University, Nigeria (Commons id `168667271`, 3968 × 2976 original) | Wikimedia Commons, by Haykinz001, CC BY-SA 4.0, credit required | Greyscale and indigo, 3:4 crop, AVIF under 140 KB, lazy |
| §5.3 square | Kenneth Dike Library, University of Ibadan (Commons id `26531350`, 1024 × 575) | Wikimedia Commons, by Michael Sean Gallagher, CC BY-SA 2.0, credit required | Greyscale and indigo, 1:1 crop from the 575px height (enough for a 200px square at 2x), AVIF under 40 KB, lazy |
| Footer stamp | UNN gate | as `home.md` | 3:4, 88px |

- **Picture count:** two interface fragments plus three photographs: five (inspector floor met).
- **Credit line:** "Library, Mountain Top University, by Haykinz001 (CC BY-SA 4.0); Kenneth Dike Library, University of Ibadan, by Michael Sean Gallagher (CC BY-SA 2.0); via Wikimedia Commons; tinted."

## 7. Motion

- **Signature (short version):** the slip rises 24px with opacity and its stripe fills step by step (5 × 60ms), once per session.
- **Live:** the needed figure tweens over 320ms; the dot travels in 320ms; outcome changes (needed → out of reach) swap the figure block with a 160ms crossfade; the chosen class key fills with ink in 160ms and scales to 0.97 on press; the receipt's values update without motion.
- **Entrances:** the receipt enters 70ms after the slip; the four stepped lines enter one after another (120ms apart, each rising 24px with its sentence); FAQ facts and summaries by 50ms; the tall photograph drifts (scale 1.00 → 1.04 over the section's scroll) and the square photograph rises 16px as it enters; §5.4 rows 40ms apart.
- **Accordion:** the chevron rotates 180° in 160ms; the answer fades in.
- **Count:** at least 16 moving elements over load and one scroll. Reduced motion and data saver: no travel, no drift; values swap at once.

## 8. Components

- **Used:** `PublicHeader`, `Slip` (`result` editable, `receipt`), `Stripe`, `ArcMeter`, `Field`, `GradeKeys` pattern for the class keys (a `ClassKeys` variant: five keys, two-line labels), `Accordion`, `Button`, `TextLink`, `Figure`, `Credit`, `SectionHeading`, `Reveal`, `CookieStub`, `PublicFooter`.
- **Shared tool frame:** `ToolPage.tsx`, rebuilt as described in `tool-degree-class-checker.md` §8 (slip shell, tool body and foot bar, working receipt, rule section slot, FAQ, More free tools, close, JSON-LD).
- **Client island:** `RequiredGpaCalculator` (fields, keys, foot bar, receipt, phone strip) in `calculators.tsx`. Everything else is a server component.
- **Data:**
  - `tools-config.ts` (extended): copy, six FAQs, `question`, `group`, `example` (3.38, 90, 60, 3.50), prefill keys, `toolJsonLd(slug)`.
  - `tool-math.ts`: `requiredGpa` keeps its statuses; adds `lowestFinish`, the round-up step for `required` (pending §13.1), and the comma rule in `parseNumber`.
  - `lib/public/scales.ts`: limits, class keys, class names.
- **Retired:** `ResultBox`, `NumberField`, `selectClass` (Geist Mono removed).

## 9. SEO

- **Title:** "Required GPA calculator" → "Required GPA calculator | AcadeGrade".
- **Description:** "Find the average GPA you need over your remaining units to reach First Class, a 2:1 or any target CGPA on the Nigerian 5-point scale. Free, nothing saved." (154 characters)
- **Keywords:** required GPA calculator, what GPA do I need, target CGPA calculator, GPA needed for first class Nigeria, 2:2 to 2:1.
- **Canonical:** `/tools/required-gpa` (absolute; no parameters).
- **Open Graph:** the planner slip showing "You need 3.68" with the stripe.
- **JSON-LD:**
  - `WebApplication`: name "Required GPA calculator", url, `applicationCategory: "EducationalApplication"`, `operatingSystem: "Web"`, `isAccessibleForFree: true`, `offers: { price: 0, priceCurrency: "NGN" }`, `inLanguage: "en-NG"`, `publisher` → the site `Organization`.
  - `FAQPage`: exactly the six questions and answers in §5.3.
  - `BreadcrumbList`: Home › Free tools › Required GPA calculator.
- **Content SEO:** §5.2 explains the rule step by step with a worked example; the FAQ answers "First Class" and "2:2 to 2:1" searches with real arithmetic.

## 10. Accessibility

- **One h1** (the slip title); h2 for the receipt, each section (the §5.2 h2 visually hidden), and the close.
- **Fields:** native inputs with visible labels; hints and errors linked by `aria-describedby`; `inputmode="decimal"` for CGPAs and `inputmode="numeric"` for units; `enterkeyhint="next"` moving through the four lines, `done` on the last.
- **Class keys:** `role="radiogroup"` labelled "Target"; arrow keys move; each key's name includes its figure; selecting a key updates "Target CGPA" and the field announces nothing extra (the foot bar does).
- **Live region:** the foot bar, polite, debounced 500ms: "You need an average of 3.68 over 60 units. Highest you can still reach: 4.03." / "Out of reach. Highest you can still reach: 4.03." / "Already secured. Lowest possible finish: 2.03."
- **Arc meter:** `role="img"` with the state's label (§5.1).
- **Accordion:** native `<details>`; summaries are 44px+ targets; open state is native.
- **Photographs:** alt "The library building of Mountain Top University, Nigeria"; "The Kenneth Dike Library at the University of Ibadan".
- **Ink field (§5.4):** paper on ink about 16:1; focus outline gold.

## 11. Carried over, replaced and removed

| Today | In the redesign |
|---|---|
| Thin shell, no mobile menu | The shared public shell; **Free tools** marked current |
| h1 "What GPA do I need?" | Kept, in the slip header |
| Description as the intro sentence | New sentence; description rewritten for metadata |
| Four `NumberField`s in Geist Mono with placeholders 3.40 / 3.50 / 90 / 60 | Four `Field`s (labels kept) in Hanken tabular figures, no placeholder figures, "Try an example", class keys for the target |
| Combined red alert "Check the numbers: CGPA values run from 0 to 5.00 and remaining units must be above zero." | Per-field messages on blur |
| `ResultBox` "You need an average GPA of 3.65 over your remaining units. The highest CGPA you can still reach is 4.04." | Foot bar (gold figure, units, target class, highest reachable, arc meter) and the receipt |
| "Your target is already secured. Even a GPA of 0.00…" | "Secured" with the lowest possible finish |
| "This target is out of reach with the units you have left." | "Out of reach" with the highest reachable CGPA and its class, plus "Aim for 3.50 instead" |
| Required rounded half up | Rounded up (pending §13.1) |
| Three FAQs | Six FAQs in an accordion beside photographs; the first three rewritten with worked examples |
| "More free tools" list, outlined "Track your results for free" | §5.4 table with the hub; the close's one primary |
| FAQPage JSON-LD only | `WebApplication` + `FAQPage` + `BreadcrumbList` |

**Tests to update:** `tests/unit/tool-pages.test.tsx` keeps working with the four labels and `role="status"` (the 3.65 and out-of-reach checks stay valid); add every row of §5.1's table, the class keys, per-field errors, the prefill read-and-strip, and (if §13.1 is accepted) the 4.66 rounding case.

## 12. Acceptance checklist

- [ ] The example (3.38, 90, 60, 3.50) shows 3.68 with "Highest you can still reach: 4.03", and the receipt's rows add up (525.00 − 304.20 = 220.80; 220.80 ÷ 60 = 3.68).
- [ ] Every row of §5.1's table passes, including out of reach (4.03, Second Class Upper), secured (lowest 2.03), straight As (5.00) and the new-student case.
- [ ] Choosing "First Class 4.50" fills "Target CGPA" with 4.50; typing 3.50 selects the 2:1 key.
- [ ] Errors appear per field on blur, never while typing; commas work.
- [ ] Prefill from the calculator and the degree class checker fills the fields and leaves a clean address bar.
- [ ] Phone 390×844: the results strip shows the answer while the visitor is still on the fields, and hides when the foot bar is in view.
- [ ] `inspect.mjs` 0 FAIL at 1440/768/390, light and dark (pictures: 2 `data-ui` + 3 photographs; one rest screen; the ink field is not an empty screen); `scenes.mjs` not needed (no pinned scenes); `lint.mjs` and `impeccable detect` clean.
- [ ] Lighthouse mobile ≥ 90 ×4; JSON-LD validates; the FAQ matches the page word for word.
- [ ] No mono, no eyebrow, no icon tiles, no pills, no numbering, no gradients, no shadows at rest.

## 13. Open items for the owner

1. **Round the needed average up** (4.65225 → 4.66) instead of half up (→ 4.65, today's behaviour)? Recommended, and it matches `home.md`'s target slip. It is a one-line change in `tool-math.ts` plus a test, and the FAQ line "The answer is rounded up, so you never aim too low" depends on it.
2. **Photographs:** confirm the Mountain Top University library and the Kenneth Dike Library after seeing them, or pick other Nigerian libraries from the same search.
