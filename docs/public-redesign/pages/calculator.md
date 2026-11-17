# Page plan · CGPA calculator (`/calculator`)

This page inherits `01`–`04` and follows the exemplar `pages/home.md`; anything not stated here follows those files. It is an **Operate** page: the visitor came to do a sum, so the calculator is the first and largest thing on the page, built as stationery. **The calculator is a result slip the visitor fills in, and the result prints in the slip's foot bar beside the arc meter.** Precision and restraint over spectacle.

Code today: `app/(public)/calculator/page.tsx` (client page, 515 lines) and `layout.tsx` (metadata only). Engine: `lib/cgpa/academicRules.ts`. Handoff: `lib/handoff/calculator.ts`.

## 1. Purpose

- **Mode:** Operate.
- **Visitor:** a Nigerian university student with a result slip, a portal page or a WhatsApp photo of the notice board in hand, usually on a mid-range Android phone on mobile data. They arrive from a search ("CGPA calculator Nigeria", "how to calculate GPA 5 point scale"), from the home page's "Try the full calculator", from a tool page, or from a classmate's shared link.
- **First question:** "What is my GPA for this semester, and what does it do to my CGPA?" It is answered on the first screen, with no account and no button press: the default slip already shows a worked GPA, and every change recomputes it at once.
- **One action:** **Save to your record**. It keeps the courses on this device for 24 hours (the existing handoff) and carries them into sign-up, or straight to Results for a signed-in student.
- **Secondary (text links only):** Share this calculation (no account needed), the four tools, Clear all courses.

## 2. The argument

| # | Claim | Proof on the page | Section |
|---|---|---|---|
| 1 | You get your GPA, PI and CGPA in the time it takes to copy your slip | The slip itself: type, and the foot bar prints the answer | The calculator slip (§5.1) |
| 2 | The number is right, and you can see why | Your own courses added up line by line, with the division shown | How your GPA is worked out (§5.2) |
| 3 | It uses your university's grading language | The 5-point bands, the five class thresholds and PI, from the one live scale | Points, bands and classes (§5.3) |
| 4 | Your doubts are answered | Six answers written for Nigerian students, open on the page | Calculator questions (§5.4) |
| 5 | Keeping it is one step and free | A single sentence and the same save action | Keep it (§5.5) |

## 3. First screen

### Desktop (1440×900)

- **Header:** the shared `PublicHeader` (72px). "Free tools" carries `aria-current="page"`, because the calculator belongs to the free tools.
- **Grid:** 12 columns on `--pg-margin` (32px at this width), gutter 24px. 24px below the header the page begins; there is no heading on the ground above the slip.
- **Columns 1–8: the calculator slip** (`Slip` variant `result`, editable; about 905px wide), on the ground, square corners. In order, top to bottom:
  1. **Stripe band**, five flat steps `--pg-step-1…5`, 56px.
  2. **Header block**, centred like a printed slip, 28px padding top: the AcadeGrade mark (24px); the **h1** "CGPA calculator" at `--pg-head` (64px here, one line); the meta line at small, "Nigerian university 5-point scale, with PI" (read from `lib/public/scales.ts`); then the supporting sentence at body, centred, 52ch: "Enter the courses on your result slip to see your GPA, PI and CGPA. Free, no account needed, and nothing you type is saved."
  3. **Mode row**, left-aligned on the slip's 40px inner padding: the label "What does your slip show?" at small weight 500 above a two-part segmented control, **Letter grades** | **Scores out of 100** (square, 44px, the chosen part ink-filled with paper text).
  4. **Column header row** (small, soft ink, sentence case, `aria-hidden`; each control carries its own label): Course code · Units · Grade · Point, with Point right-aligned over its figures.
  5. **Course rows** (three by default, 64px pitch, 1px `--pg-paper-2` rule between rows, which a form may carry): course code field (176px), units stepper (132px), the six `GradeKeys` A–F (6 × 44px with 4px gaps), the point right-aligned in tabular figures (56px), and a **Remove** text button (44px tall) at the row's end.
  6. **Add a course**: a full-width row button on `--pg-paper-2`, 52px, text "Add a course" at body weight 500 with a 2px drawn plus. Not a primary button.
  7. **Your CGPA so far** (optional): a native `<details>` line at body, "Add your CGPA so far", closed by default (open when the URL carries a prior record).
  8. **Notes line** (only when needed, small): carry-over, duplicate code, left-out rows, shared-link notes (see §5.1 states).
  9. **Perforation** (`--pg-perf` round dots).
  10. **Foot bar** (ink, paper text, about 176px): the result. See §5.1 for its content.
  11. **Stub row** under the foot bar on paper, small text links: "Load an example slip" · "Clear all courses".
- **Columns 9–12: the aside**, `position: sticky; top: 96px`, on the ground:
  1. **The save stub** (`Slip` variant `stub`, notched left edge, paper): the primary button **Save to your record** at full stub width (52px); under it at small: "Keeps these courses on this device for 24 hours while you sign up, then adds them to your record."; then the text link **Share this calculation** with its line at small: "Anyone with the link can see these courses and grades. Nothing is stored on our side."
  2. **Next questions** (an h2 at lead), 32px below the stub: four two-ended rows, each a link, tool name at body on the left and a live hint at small on the right (see §5.1), then the text link "All free tools".
  3. **The honest note** at small in `--pg-on-ground-soft`: "Your own estimate, worked out on this device. Your university's result is the official one."
- **What is on the first screen at 1440×900:** the h1, sentence, mode control, all three default rows, Add a course, the CGPA-so-far line, and the foot bar with the result and the arc meter; on the right the primary action, share and the four tool links. Vertical budget: 72 header + 24 + 56 stripe + 158 header block + 90 mode row + 36 column headers + 192 rows + 52 add + 44 details + 5 + 176 foot = 905px, so the foot bar's last 5px sit at the fold; the stub links fall just below it, which is acceptable because they are secondary.
- **Long slips:** when the slip is taller than the viewport, the foot bar is `position: sticky; bottom: 0` inside the slip, so the result is always in view while editing row 12.
- **Cookie stub:** bottom-right, 360px; it can overlap the lower aside (the tool links) but never the primary action, which sits at the aside's top.

### Phone (390×844)

- **Header** 60px. 16px below it the slip runs full width inside the 16px margins (358px), 20px inner padding.
- **Slip head:** 40px stripe; mark; h1 "CGPA calculator" at 40px (one line at 358px; it may wrap to two, never three); the meta line; the sentence at body (three lines).
- **Mode control:** full width, two equal parts, 44px.
- **Rows** recompose into three lines each (156px with a 16px gap): line 1, the course code field (flexible) and the units stepper (132px); line 2, the six grade keys, 48px each with 6px gaps (318px, the full inner width); line 3, "Point 5" at small on the left and **Remove** at the right (44px target). The column header row is not shown on phones.
- **Results strip:** while the slip's own foot bar is off-screen, a 64px ink strip is fixed to the bottom of the viewport (above the cookie stub while that is open): "Semester GPA 4.13" at lead on the left, "PI 4.13" at small beside it, and a compact paper-on-ink button **Save** (44px; accessible name "Save to your record") at the right. It hides when the slip's foot bar scrolls into view (IntersectionObserver), so there is never more than one primary action on screen. The strip is `aria-hidden`; the foot bar is the live region.
- **First screen at 390×844 with the cookie stub open:** header, stripe, h1, meta line, sentence, mode control, the whole first row and the top of the second, and the results strip above the cookie stub (844 − 132 − 64 = 648px of slip visible). The visitor sees their GPA before touching anything.
- **After the slip:** the save stub (full width, button full width), then Next questions, then the honest note.

### Why this works

- **Fast:** no intro block, no hero. The h1 is the slip's title, so the first thing on the page is the tool, already showing a computed answer.
- **Specific:** it is a Nigerian result slip with grade keys and a 5-point arc, not a generic form. The result prints where a real slip prints it: at the foot.

## 4. Copy deck (final wording; sentence case; headlines checked against the two-line rule)

- **Title tag:** "CGPA calculator for Nigerian universities" (the template adds "| AcadeGrade").
- **h1:** "CGPA calculator" (15 characters, one line).
- **Meta line:** "Nigerian university 5-point scale, with PI" (from `scales.ts`). When the example is loaded it becomes "Example · 300L Computer Science · 2025/2026 First Semester".
- **Sentence:** "Enter the courses on your result slip to see your GPA, PI and CGPA. Free, no account needed, and nothing you type is saved." (123 characters)
- **Mode:** label "What does your slip show?"; options "Letter grades", "Scores out of 100".
- **Column headers:** "Course code", "Units", "Grade" (grade mode) or "Score" then "Grade" (score mode), "Point".
- **Code placeholder:** "e.g. CSC 201" (soft ink; never a label).
- **Score field:** hint (score mode, under the column header on desktop, under the first score field on phones): "CA plus exam, out of 100".
- **Default-rows hint** (small, above the first row, shown only while the three default rows are untouched): "Three courses to start with. Change them to match your slip."
- **Add:** "Add a course". At 40 rows the button is disabled and reads "This slip holds up to 40 courses".
- **Remove:** "Remove" (accessible name "Remove CSC 301", or "Remove course 3" when the code is blank).
- **CGPA so far:** summary "Add your CGPA so far"; fields "CGPA before this semester" (hint "From your last result, 0.00 to 5.00") and "Units before this semester" (hint "All the units behind that CGPA"); a text button "Remove" to clear the pair.
- **Foot bar labels:** "Semester GPA", "CGPA", "PI", "Units", "Courses", "Class", "Class at this GPA".
- **Foot bar lines:** "0.08 to First Class" (gap line); "Add your CGPA so far to see your class." (no prior record); "With letter grades, PI equals your GPA." (grade mode).
- **Save stub:** button "Save to your record"; line "Keeps these courses on this device for 24 hours while you sign up, then adds them to your record."; signed in: "Adds these courses to Results, where you check them before saving."
- **Share:** link "Share this calculation"; done state "Link copied"; line "Anyone with the link can see these courses and grades. Nothing is stored on our side."; signed-in extra line: "For a link that expires or needs a PIN, save this semester and share your transcript."
- **Stub links:** "Load an example slip", "Clear all courses"; after clearing: "All courses cleared." with the text button "Undo" (10 seconds).
- **Honest note:** "Your own estimate, worked out on this device. Your university's result is the official one."
- **Next questions (h2):** "Next questions".
- **Section headings (h2):**
  1. "How your GPA is worked out" (26 characters)
  2. "Points, bands / and classes" (25 characters, two lines by design)
  3. "Calculator questions" (20 characters)
- **Close (no heading-size type):** "Results come every semester. Keep them in one record and your CGPA updates itself." (14 words) Button "Save to your record" (or "Start your free record" when the slip has nothing to save); text link "or see all free tools". The section has a visually hidden h2, "Keep your results".
- **Guest dialog:** see §5.1 "Save".

## 5. Sections

### 5.1 The calculator slip (the tool; app-screen craft per tasteskill `references/app-screens.md`, inside the dealt hero "Striped card beside the room", adjusted)

**Blueprint and adjustment.** The dealt hero puts a printed card beside a photograph of the room. Here the card is the working slip (columns 1–8) and the "room" is replaced by the aside (columns 9–12), because on an Operate page the next decision (save, share, next tool) is worth more than a picture. The card keeps the stripe band, the centred printed header and one ink on paper. Inside the slip, app-screen rules apply: label above field, numbers right-aligned in tabular figures, a real zero printed as 0, a missing value as a grey dash, one filled primary per screen, colour only on data (gold on the headline figure, examiner red on an F).

**Behaviour kept from today (every one):**

| Behaviour | Today | Kept as |
|---|---|---|
| Two modes | `grade` / `score` (`SegmentedControl`) | Same values; segmented control "What does your slip show?" |
| Score split | score × 0.3 → CA (max 30), score × 0.7 → exam (min 0); total = the score | Unchanged: the same `computeCourseMetrics` input; the handoff splits the same way (`handoffToCourseInputs`) |
| GPA and PI | `computeSemesterGPA(courseInputs.map(computeCourseMetrics))`, rows with no grade/score skipped | Unchanged |
| Add / remove / clear | Add uses units 3 and grade A (grade mode) or score 70 (score mode) | Add uses units 3 and grade A in grade mode; in score mode the new row's score starts **empty** (see "Changed" below) |
| Units | 1–6 | 1–6, as a stepper |
| URL state | `?m=<mode>&c=<base64 of JSON [{c,u,g,s}]>`, written with `router.replace` on every change, read once on mount | Same names and same JSON; see "URL" below |
| Share | Copies `window.location.href`, falls back to `execCommand('copy')`, toast on failure | Same URL; **no login gate**; Web Share on phones; see "Share" |
| Save to profile | `saveCalculatorHandoff({mode, courses})`; signed out → modal; signed in → `/results` (kept) or `/dashboard` (not kept) | Same calls and routes; renamed **Save to your record** |
| Guest modal | Create account / Sign in / Not now; "kept on this device for 24 hours" line when rows were kept | Native `<dialog>` with the same three choices; see "Save" |
| Default rows | three rows: units 3/3/2, grades A/B/C | Same three rows (GPA 4.13) |

**Changed, with reasons:**

- **Mode switch keeps information.** Today, letters→scores gives every row a score of 50 (a silent, invented GPA of 3.00), and scores→letters resets every row to C. New: each row keeps both values in memory; only the active one is used and written to the URL. Scores→letters sets each row's grade from its score with `gradeFromScore` (76 becomes A); letters→scores restores a score the row had before, or leaves the field empty so nothing invented is counted. Empty score rows are not counted and the notes line says so.
- **Empty means a dash, not 0.00.** With nothing counted, the foot bar prints "—" (soft, at the figure's size step but in soft ink), not "0.00", which reads as a real result.
- **Scores are validated.** Today any number is accepted, so 120 gives an A with a PI point of 6.00, and −3 gives a negative total. New: a score must be 0–100 (decimals allowed; a comma is read as a decimal point). Outside that range the row is not counted and shows an error on blur.
- **Server-rendered first paint.** Today the page returns `null` until mounted, then shows "Preparing calculator…". New: the page is a server component; the slip renders the default rows on the server and hydrates. With a `?c=` link the client replaces the default rows after reading it (the same slip shape, so no layout shift).

**Course row (grade mode):**

| Part | Control | Detail |
|---|---|---|
| Course code | `Field` text, optional, `maxLength` 24, `autocomplete="off"`, uppercased on blur | Placeholder "e.g. CSC 201". Accessible name "Course code, course 1" |
| Units | stepper: a native `input type="number"` (min 1, max 6, step 1, `inputmode="numeric"`) between two 44px buttons, − and + | The buttons are `tabindex="-1"` (pointer helpers); keyboard users use the field and its arrow keys. Accessible name "Units for CSC 301" |
| Grade | `GradeKeys` radiogroup A–F | One tab stop; arrow keys move the choice. Accessible name "Grade for CSC 301". The selected key is ink-filled; F selected is `--pg-mark` |
| Point | text, right-aligned, tabular | 5, 4, 3, 2, 1, 0. An F's 0 prints in `--pg-mark` with "carry-over" after it at small |
| Remove | text button | "Remove" |

**Course row (score mode):** Course code · Units · **Score** (`Field`, 120px, `inputmode="decimal"`, accessible name "Score for CSC 301, out of 100") · **Grade** (printed letter, derived) · **Point** (derived) · Remove. A row with an empty score prints "—" for grade and point.

**Your CGPA so far** (new, optional; this is what makes it a CGPA calculator):

- Two `Field`s side by side (stacked on phones): "CGPA before this semester" (0.00–5.00, `inputmode="decimal"`) and "Units before this semester" (a whole number of 1 or more).
- When both are valid: CGPA = (prior CGPA × prior units + this semester's points) ÷ (prior units + this semester's units), the same weighting as `computeCumulativeCGPA([{gpa: prior, creditLoaded: priorUnits}, {gpa, creditLoaded}])`, rounded with `roundCgpa` and classed with `resolveDegreeClass`.
- Written to the URL as `pc` and `pu` (see "URL"). Not part of the handoff: the account works out CGPA from real semesters, so the dialog says so.

**Foot bar** (ink, paper text; `role="status"`, `aria-live="polite"`, announcements debounced 500ms):

- **Row 1 (desktop):**
  - Left, the **headline figure on gold** (ink text on `--pg-gold`, 0 radius, 24px padding): the CGPA when a prior record is entered, otherwise the semester GPA. Label at small above it ("CGPA" or "Semester GPA"); figure at `--pg-head`.
  - Middle, the **class** at lead ("Second Class Upper"), with the gap line at small beneath ("0.08 to First Class"; at First Class: "The top class on this scale"). Without a prior record the label reads "Class at this GPA" and the second line reads "Add your CGPA so far to see your class."
  - Right, the **`ArcMeter`** (176px wide), dot at the headline figure, ticks 1.50 / 2.40 / 3.50 / 4.50 with class names at small; `aria-label` e.g. "CGPA 4.42 of 5.00, Second Class Upper".
- **Row 2 (small, paper on ink, one line):** "Semester GPA 4.15 · PI 4.15 · 13 units · 5 courses"; with a prior record it adds "· CGPA 4.42 over 87 units". In grade mode it ends "· With letter grades, PI equals your GPA."
- **Phone:** the gold figure and class share row 1; the arc meter goes full width (220px, abbreviations Pass, 3rd, 2:2, 2:1, 1st) on row 2; the small line wraps onto row 3.
- **Class label mapping** (from `scales.ts`, not hard-coded): First Class; Second Class Upper; Second Class Lower; Third Class; Pass; and the engine's "Fail" band (under 1.00) prints as "Below a Pass".

**Notes line** (on paper, above the perforation, small; at most two lines show, in this order):

1. Carry-over (in `--pg-mark`, using `isCarryOver` on each counted row): "1 carry-over on this slip: MTH 301." followed by the link "See what a retake would do" → `/tools/carry-over-impact` with prefill (current = the CGPA, or the semester GPA without a prior record; done = the matching units; failed = that course's units). Two or more: "2 carry-overs on this slip: MTH 301, CSC 305."
2. Duplicate codes (`creditLoadWarnings(rows)` with no range, so only duplicates can warn; matched with `normaliseCourseCode`): "CSC 301 is on this slip twice. Remove one if it was a mistake." Both rows still count, as the engine counts them.
3. Left-out rows (score mode): "Counted: 4 of 5 courses. Enter a score from 0 to 100 for the rest."
4. Shared link: "These courses came from a shared link. Changes you make here don't affect the person who sent it."
5. Unreadable link: "This link couldn't be read, so the calculator started fresh." Partly readable: "Some values in this link were outside the calculator's range and were reset. Check the marked rows."

**Next questions** (aside; live hints computed from the slip; each row is a link; the hint is soft ink at small):

| Tool | Hint (example values from §5.1 sample data) | Link with prefill |
|---|---|---|
| Degree class checker | "4.42 is Second Class Upper" | `/tools/degree-class-checker?cgpa=4.42` |
| Required GPA | "What you need for First Class" | `/tools/required-gpa?current=4.42&done=87` |
| Carry-over impact | "1 carry-over on this slip", or "If you retake a failed course" | `/tools/carry-over-impact?current=…&done=…&failed=…` |
| Weighted average score | score mode: "65.9 from these scores"; grade mode: "Needs scores out of 100" | score mode: `/tools/weighted-average?c=<the same c>` |
| All free tools | | `/tools` |

Prefill is read once by each tool and then removed from the address bar (see each tool plan). Without a computed result, the hints fall back to the plain questions: "Which class is my CGPA?", "What do I need for my target?", "What will a retake do?", "My average score out of 100".

**URL (kept, made safe):**

- Format kept exactly: `?m=grade|score&c=<base64 of JSON [{c, u, g}] or [{c, u, s}]>`. New optional `&pc=4.47&pu=74` for the prior record. Old links open unchanged.
- **Write:** after each change, with `router.replace(..., { scroll: false })`, through a small codec in `lib/public/calculator-url.ts`. It encodes UTF-8 safely (today `btoa` throws on any non-Latin-1 character, such as a curly apostrophe pasted into a code, and the link silently stops updating); for plain ASCII codes the output is byte-identical to today's. Values are set through `URLSearchParams`, so `=`, `/` and `+` are percent-encoded and survive any messenger.
- **Read:** `m` other than `grade`/`score` → grade. `c` that is not base64, not JSON or not an array → default rows and the "couldn't be read" note. Per row: code trimmed and cut to 24 characters; units outside whole 1–6 → 3 with the row marked; a grade outside A–F (grade mode) → no grade selected and the row not counted until a key is chosen; a score outside 0–100 → kept in the field with its error. More than 40 rows → the first 40, with the reset note.
- **Canonical** stays `/calculator` without parameters, so shared links are never indexed as separate pages.

**Sample links (pinned in tests):**

- Default rows: `?m=grade&c=W3siYyI6IiIsInUiOjMsImciOiJBIn0seyJjIjoiIiwidSI6MywiZyI6IkIifSx7ImMiOiIiLCJ1IjoyLCJnIjoiQyJ9XQ%3D%3D`
- Example (grade): `c` = `W3siYyI6IkNTQyAzMDEiLCJ1IjozLCJnIjoiQSJ9LHsiYyI6IkNTQyAzMDMiLCJ1IjozLCJnIjoiQiJ9LHsiYyI6Ik1USCAzMDEiLCJ1IjozLCJnIjoiQyJ9LHsiYyI6IkNTQyAzMDUiLCJ1IjoyLCJnIjoiQSJ9LHsiYyI6IkdTVCAzMTEiLCJ1IjoyLCJnIjoiQiJ9XQ==` (percent-encoded on write)
- Example (score): `c` = `W3siYyI6IkNTQyAzMDEiLCJ1IjozLCJzIjo3Nn0seyJjIjoiQ1NDIDMwMyIsInUiOjMsInMiOjY1fSx7ImMiOiJNVEggMzAxIiwidSI6MywicyI6NTZ9LHsiYyI6IkNTQyAzMDUiLCJ1IjoyLCJzIjo3Mn0seyJjIjoiR1NUIDMxMSIsInUiOjIsInMiOjYxfV0=`

**Share (decision: no login).**

- **Decision:** sharing no longer asks for an account, for signed-out and signed-in visitors alike.
- **Why:**
  - The link already *is* the calculation. Every course is encoded in the address bar, and nothing is stored on a server, so there is nothing for an account to protect.
  - The gate protected nothing anyway: anyone can copy the address bar, and today's own failure message tells them to.
  - It cost the product: a classmate-to-classmate link is the cheapest way a new student finds AcadeGrade, and the gate stopped it at the moment of intent.
  - The honest risk (the link shows grades to whoever has it) is stated beside the link instead of hidden behind sign-up.
- **How:** on phones where `navigator.share` exists, it opens the system share sheet with the title "My courses on AcadeGrade" and the URL. Elsewhere, or if the sheet is dismissed with an error, it copies with `navigator.clipboard.writeText`, then the `execCommand('copy')` fallback. Success: the link text changes to "Link copied" for 2 seconds (announced politely). If both fail, a read-only field with the link appears under the stub, joined to a **Copy** text button, with the line "Copy this link to share it." (no toast).
- **Signed-in path (kept and improved):** the same share link, plus the line "For a link that expires or needs a PIN, save this semester and share your transcript." linking to `/transcript`, where expiry (1, 7 or 30 days), summary-only and PIN already exist.
- **Analytics:** `tool_used` with `{ tool: 'calculator', action: 'share' }`, after analytics consent only.

**Save to your record (kept behaviour, new words):**

- **Signed out:** `saveCalculatorHandoff({ mode, courses })` exactly as today, then the dialog opens.
- **Dialog** (native `<dialog>`, a paper stub on a dim backdrop with no blur, focus trapped, Esc and backdrop close, focus returns to the button):
  - Title (lead): "Save these courses to your record".
  - Body (body): "Your 5 courses are kept on this device for 24 hours. Create your free record or sign in, then add them as a semester from Results." Singular: "Your course is kept…". With a prior record entered, an extra line at small: "Your CGPA so far isn't carried over. You can add past semesters when you set up your record."
  - Actions: primary **Create your free record** → `/register`; text link **Sign in** → `/login`; text button **Not now** (closes; the courses stay kept for 24 hours, as today).
  - If nothing could be kept (storage blocked, for example a private window): "This browser isn't keeping data for us, so you'll need to enter these courses again after you sign up. Share the link to yourself first to keep them." The three actions stay.
- **Nothing to save** (no counted course): the button is disabled (`aria-disabled`, still legible) and the line under it reads "Add at least one complete course to save."
- **Signed in:** the label stays "Save to your record"; the press keeps the handoff and goes to `/results` (or `/dashboard` if nothing was kept), as today, with the busy state (label kept, spinner at the right, width fixed). There the existing offer reads "Add these 5 courses as my first semester".
- **Analytics:** `save_semester_click`, after consent.

**Sample data and pinned results** (every figure computed with `academicRules.ts`; a unit test pins each line):

| State | Input | Result shown |
|---|---|---|
| Default | units 3/3/2, grades A/B/C | (15 + 12 + 6) ÷ 8 = 33 ÷ 8 = 4.125 → **GPA 4.13**, PI 4.13, 8 units, 3 courses, class at this GPA Second Class Upper |
| Example, letters | CSC 301 3 A · CSC 303 3 B · MTH 301 3 C · CSC 305 2 A · GST 311 2 B | (15 + 12 + 9 + 10 + 8) ÷ 13 = 54 ÷ 13 = 4.1538 → **GPA 4.15**, PI 4.15, 13 units, 5 courses |
| + CGPA so far | 4.47 over 74 units | (4.47 × 74 + 54) ÷ 87 = (330.78 + 54) ÷ 87 = 384.78 ÷ 87 = 4.4228 → **CGPA 4.42**, Second Class Upper, "0.08 to First Class" |
| MTH 301 C → A | | 60 ÷ 13 = 4.6154 → GPA 4.62; (330.78 + 60) ÷ 87 = 4.4917 → **CGPA 4.49**, "0.01 to First Class" |
| then CSC 303 B → A | | 63 ÷ 13 = 4.8462 → GPA 4.85; 393.78 ÷ 87 = 4.5262 → **CGPA 4.53, First Class**; the dot crosses into gold |
| MTH 301 F (from the example) | | 45 ÷ 13 = 3.4615 → GPA 3.46; 375.78 ÷ 87 = 4.3193 → CGPA 4.32; "1 carry-over on this slip: MTH 301." |
| Example, scores | 76, 65, 56, 72, 61 (same units) | grades A B C A B → **GPA 4.15**; PI = (3 × 3.80 + 3 × 3.25 + 3 × 2.80 + 2 × 3.60 + 2 × 3.05) ÷ 13 = 42.85 ÷ 13 = 3.2962 → **PI 3.30**; weighted average 857 ÷ 13 = 65.9 |
| MTH 301 scored 38 | | F → GPA 3.46; PI (42.85 − 8.40 + 5.70) ÷ 13 = 40.15 ÷ 13 = 3.0885 → PI 3.09; carry-over note |
| Band edges | 69.5 → B (4); 39.9 → F (0); 44.5 → E (1) | lower-bound bands, no gaps (`gradeFromScore`) |
| Duplicates | "CSC 301" and "csc301" | one note naming CSC 301; both rows count |

Note for alignment with `home.md`: the home slip states "Before this semester: CGPA 4.47 over 74 units" but computes from 331 points (4.473), giving 4.43. A visitor who types 4.47 and 74 here gets **4.42**, because the calculator can only use the rounded CGPA a student knows. See §13.

**States (all designed):**

- **Default** (first visit, no link): the three default rows with the default-rows hint; GPA 4.13.
- **Empty** (after removing every row or Clear all): the slip keeps its stripe, header and foot bar. The rows area holds one line at body, "No courses on this slip.", with **Add a course** and "Load an example slip" beneath. The foot bar prints "—" for the figure and the class; the arc meter shows no dot; row 2 reads "No courses counted yet". Save is disabled with its reason. After Clear all, "All courses cleared. Undo" shows for 10 seconds; Undo restores the rows and the URL.
- **Invalid input:** score 105, −3 or "7o" → on blur, the field's bottom border turns `--pg-mark` 2px and "Enter a score from 0 to 100." appears below it; the row shows "—" and is not counted; the notes line counts it. CGPA so far 5.4 → "Enter a CGPA from 0.00 to 5.00."; units 0 or 12.5 → "Enter whole units of 1 or more." The calculation never stops: valid rows keep computing.
- **Partial:** score mode with some rows empty → counted rows only, "Counted: 2 of 3 courses…".
- **Edge cases:** every row F → GPA 0.00 (a real zero, printed), "Below a Pass", three carry-overs listed; a single 1-unit course → GPA equals its point; 40 rows → Add disabled with its reason; a code longer than 24 characters → cut at 24 (as the handoff does).
- **Shared link / unreadable link / reset values:** the notes in the notes line; rows marked with the error style where a value was reset.
- **No JavaScript:** the server-rendered default slip with GPA 4.13, the grade keys as plain letters, and a line in the stub: "Turn on JavaScript to change the courses." The FAQ and rule sections are complete without it.
- **Signed in:** the header shows **Open dashboard**; the save line and the share extra line change as written.
- **Offline:** the calculator works (no network is needed after load); Save still writes the handoff; Share copies.
- **Reduced motion / data saver:** see §7.

**Phone composition** is described in §3. The aside content follows the slip in source order (save stub, Next questions, honest note), so keyboard and screen-reader order match the visual order at both widths.

### 5.2 How your GPA is worked out (blueprint `stats-total-and-its-receipt`)

- **Why this blueprint:** the page's second claim is "the number is right, and you can see why". This composition is literally a total beside the slip that adds up to it, and it uses the visitor's own courses.
- **Ground:** `--pg-ground-2` (one tone step), full bleed.
- **Left, columns 1–6:**
  - Top: the h2 "How your GPA is worked out" at `--pg-head`, then the note at body, 40ch: "Multiply each course's grade point by its units, add them up, then divide by your total units. Your CGPA does the same across every semester."
  - Bottom-left, anchored 72px above the section's lower edge: **the total**, the visitor's live semester GPA at `--pg-display` (96px; the blueprint's 160–300px is mapped onto the display step), leading 0.8; under it one caption line at body: "Semester GPA: 54 points ÷ 13 units".
  - The space between heading and total stays empty by design (the total sits low like a figure at the foot of a page).
- **Right, columns 8–11: the receipt slip** (`Slip` variant `receipt`, 420px, paper, zigzag bottom edge, `data-ui`), top-aligned with the heading. Rows at body with tabular figures, dot leaders of 4px round dots between description and value:
  - **Grade points** (group name at body weight 500)
    - CSC 301 · 3 units × A (5) ········ 15
    - CSC 303 · 3 units × B (4) ········ 12
    - MTH 301 · 3 units × C (3) ········ 9
    - CSC 305 · 2 units × A (5) ········ 10
    - GST 311 · 2 units × B (4) ········ 8
  - **Totals**
    - Units ········ 13
    - Points ········ 54
  - **Inverted final row** (ink bar, paper text, 44px): "54 ÷ 13 = GPA 4.15"
  - **Score mode adds a group, "PI from your scores"**: "CSC 301 · 76 → 3.80 × 3 ···· 11.40", "CSC 303 · 65 → 3.25 × 3 ···· 9.75", "MTH 301 · 56 → 2.80 × 3 ···· 8.40", "CSC 305 · 72 → 3.60 × 2 ···· 7.20", "GST 311 · 61 → 3.05 × 2 ···· 6.10", then a second inverted row "42.85 ÷ 13 = PI 3.30". Points to two decimals; the sums are exact.
  - **With a CGPA so far**, a last group "Your CGPA": "Before: 4.47 × 74 units ···· 330.78", "This semester ···· 54", and the inverted row "384.78 ÷ 87 = CGPA 4.42".
- **Live:** the receipt mirrors the slip (debounced 150ms). Blank codes print as "Course 3". After 8 course rows the rest fold into one row, "and 6 more courses", whose value is the sum of their points, so the totals still add up; a "Show all" text button opens them.
- **Empty slip:** the receipt shows the example student, with the line "Example · 300L Computer Science" above the first group. **No JavaScript:** the example.
- **Phone:** heading and note first; the total at `--pg-display` (40px at this width), flush left, with its caption; then the receipt at full width minus 16px margins with its zigzag edge and the inverted row.

### 5.3 Points, bands and classes (blueprint `stats-column-aligned-on-the-decimal`)

- **Why this blueprint:** the class thresholds are five figures that people search for ("what CGPA is a 2:1"). A ledger column aligned on the decimal makes them the subject, and it differs from the home page's giant-word bars.
- **Ground:** `--pg-ground`.
- **Left, columns 1–5:** the h2 on two lines at `--pg-head`, first line in `--pg-on-ground-soft`, second in full ink: "Points, bands / and classes", placed at mid-height. Under it, 32px, the grade bands as two-ended rows at body (code left, value right, tabular, 44px pitch, no rules):
  - A · 70 to 100 ········ 5 points
  - B · 60 to 69 ········ 4 points
  - C · 50 to 59 ········ 3 points
  - D · 45 to 49 ········ 2 points
  - E · 40 to 44 ········ 1 point
  - F · 0 to 39 ········ 0 points
  - Then two lines at body: "PI (Performance Index) uses your actual scores: each total ÷ 100 × 5, averaged by units. Not every school uses PI." and "Most Nigerian universities use these bands. If yours differs, your handbook is the final word."
- **Right, columns 7–12:** five figures at `--pg-display`, leading 1.0, aligned on the decimal point (three-track grid: whole number right-aligned, point and decimals left-aligned, caption on the baseline at body):
  - **4.50** First Class · 4.50 to 5.00
  - **3.50** Second Class Upper · 3.50 to 4.49
  - **2.40** Second Class Lower · 2.40 to 3.49
  - **1.50** Third Class · 1.50 to 2.39
  - **1.00** Pass · 1.00 to 1.49
  - Under the column, at small: "Your class is read from your CGPA rounded to two decimals, so 4.495 shows as 4.50."
- **Live link to the slip:** the row of the class the foot bar shows carries a 12px gold square before its figure (a fill, never gold text), with the visually hidden text "Your result is here".
- **All values come from `scales.ts`** (bands, thresholds, PI line); nothing here is typed into the page.
- **Phone:** the heading first at 32px; the bands; then the figures at `--pg-display` (40px at this width; the blueprint's 15vw is mapped onto the display step) keeping the decimal alignment, split at 52% of the width, each caption under its figure at small; 28px between rows.

### 5.4 Calculator questions (blueprint `faq-open-two-column-reading`)

- **Why this blueprint:** six answers set as reading text are all visible at once (good for search and for a student scanning for one answer), and its grid differs from the ledger above.
- **Layout:** the h2 "Calculator questions" at `--pg-head` in columns 1–3, top-aligned; under it, 32px, a 3:4 photograph in columns 1–3 (the Nnamdi Azikiwe Library, University of Nigeria, Nsukka; see §6), with its caption at small. Columns 5–12 hold the six items in two text columns (`columns: 2; column-gap: 56px`, about 36ch each) at body, leading 1.55. Each item is one paragraph: the question as a run-in in weight 500, full ink, ending with its question mark; the answer continues in weight 400. 20px between paragraphs; `break-inside: avoid`.
- **Questions and answers** (also the FAQPage JSON-LD, word for word; thresholds and bands templated from `scales.ts`):
  1. **How do I calculate my GPA on the 5-point scale?** Multiply each course's grade point by its units, add them up and divide by your total units. A = 5, B = 4, C = 3, D = 2, E = 1 and F = 0. For example, an A, a B and a C in 3-, 3- and 2-unit courses give (15 + 12 + 6) ÷ 8 = 4.13.
  2. **What is the difference between GPA and CGPA?** Your GPA covers one semester. Your CGPA covers every semester so far, weighted by units. To see your CGPA here, open "Add your CGPA so far" and enter your CGPA and units before this semester: 4.47 over 74 units plus a 4.15 semester over 13 units gives 4.42.
  3. **What is PI (Performance Index)?** PI uses your actual scores instead of the letter: each total ÷ 100 × 5, averaged by units. A 76 counts as 3.80 and a 65 as 3.25, so PI shows how strong your scores are inside each grade. Not every school uses PI. With letter grades only, PI equals your GPA.
  4. **Should I enter letter grades or scores?** Use what your result slip shows. Scores give you PI as well as GPA. If your slip shows CA and exam separately, add them: CA out of 30 plus exam out of 70 is your score out of 100.
  5. **Can I share my calculation without an account?** Yes. "Share this calculation" gives a link with your courses built into it, so anyone with the link sees them. Nothing is stored on our side. For a link that expires or needs a PIN, save the semester to your record and share your transcript.
  6. **Is this my official result, and is anything saved?** No to both. It is your own estimate, worked out on this device; your university's result is the official one. Nothing is saved unless you choose "Save to your record", which keeps the courses on this device for 24 hours while you sign up.
- **Phone:** one column at body with 16px margins; the heading leads at 32px; the photograph follows the heading at 60% width, flush left; 18px between paragraphs; nothing collapses.

### 5.5 Keep it (blueprint `cta-plain-sentence-one-action`)

- **Why this blueprint:** the page's only remaining job is to offer the same save, quietly. It is the opposite of the dense sections above, and it gives the page its one rest.
- **Layout:** on `--pg-ground`, with no band and no panel; 30svh of empty ground above, 20svh below before the footer. On the slip's left edge (column 1), the sentence at lead, full ink, 34ch: "Results come every semester. Keep them in one record and your CGPA updates itself." 24px below: the primary button (size `sm`, 44px) **Save to your record** (the same handoff as the slip; "Start your free record" → `/register` when the slip has nothing to save; "Open dashboard" when signed in), and on its baseline the text link "or see all free tools" (`/tools`).
- **Phone:** the sentence at lead (20px) with 16px margins; the button at its natural width, 44px; 20svh above, 14svh below.
- **Empty-screen check:** this is the page's single deliberate rest; every other desktop screen is more than 20% filled.

### 5.6 Footer

The shared `PublicFooter` ("the back of the card", `02` §4.3). Its Free tools group lists the calculator first. The imprint credits this page's photograph.

## 6. Imagery

| Slot | Picture | Source and licence | Treatment |
|---|---|---|---|
| The tool | The calculator slip itself (`data-ui`) | AcadeGrade's own interface | Paper on the ground |
| §5.2 receipt | The live receipt slip (`data-ui`) | AcadeGrade's own interface | Paper on `--pg-ground-2`, zigzag bottom |
| §5.4 | Nnamdi Azikiwe Library, University of Nigeria, Nsukka (`openverse:af32be22-489e-4c3b-821b-52439c5d4a85` / Commons `File:Nnamdi_Azikiwe_Library_University_of_Nigeria_Nsukka.jpg`) | Wikimedia Commons, by Udeagbala, CC BY-SA 4.0, credit required | Greyscale with the indigo cast, 3:4 crop, AVIF under 90 KB at 2x of 300px, lazy |
| Footer stamp | UNN gate | as `home.md` | 3:4, 88px |
| Drawings | Stripe band, `ArcMeter`, grade keys, perforation, zigzag | Code | Flat fills from the palette |

- **Picture count** (inspector floor of four): two interface fragments of at least 300×200 (`data-ui` slip and receipt) plus two real photographs (library, stamp). No photograph on the first screen: the tool is the picture, and the first screen costs no image bytes.
- **Credit line:** "Nnamdi Azikiwe Library, University of Nigeria, Nsukka, by Udeagbala (CC BY-SA 4.0, via Wikimedia Commons; tinted)." Download with `assets.mjs --get openverse:af32be22-489e-4c3b-821b-52439c5d4a85` so `credits.md` records it.

## 7. Motion

- **Signature (short version, `03` §3.1):** on first load per session the slip rises 24px with opacity and its stripe fills left to right (5 × 60ms). The rows and foot bar are already in place (no row-by-row entrance here: the visitor wants to start typing).
- **Live feedback (`03` §3.6):** changed figures tween over 320ms with tabular figures (a tiny `requestAnimationFrame` tween, no library); the meter dot travels along the arc in 320ms; the class label crossfades in 160ms; a selected grade key fills with ink in 160ms and scales to 0.97 on press.
- **Rows:** a new row enters with 16px rise and opacity over 160ms, and focus moves into its code field; a removed row fades over 160ms, then leaves (no height animation).
- **Results strip (phone):** slides up 16px with opacity in 160ms when the foot bar leaves view, and back down when it returns.
- **Sections 5.2–5.5:** the standard entrance (heading, sentence, object; 70ms stagger; 24px rise; 640ms) at 15% visibility. The receipt rows enter 40ms apart. The decimal figures enter one after another at 50ms.
- **Controls:** button stripe on hover, 1px press, gold focus outline at once; text-link underline 2px → 3px.
- **Count:** at least 16 moving elements over load and one scroll (the slip, stripe steps, figures, meter dot, section parts, receipt rows, decimal rows). Under reduced motion and data saver every travel is dropped; figures jump to their new value; nothing hides content.

## 8. Components

- **Used:** `PublicHeader`, `Slip` (`result` editable, `receipt`, `stub`), `Stripe`, `ArcMeter`, `GradeKeys`, `Field` (text, number, with stepper), `Segmented` (the two-part control; the same component as the footer's System / Light / Dark control), `Button`, `TextLink`, `Dialog` (native `<dialog>` styled as a stub), `Figure`, `Credit`, `SectionHeading`, `Reveal`, `CookieStub`, `PublicFooter`.
- **Client islands:** the slip (with its aside and the phone strip) and the receipt (subscribes to the same store). Sections 5.3 to 5.5 are server components; the gold square in 5.3 is a tiny client hook on the same store. Budget: the calculator island under 25 KB gzipped beyond shared components.
- **Files:**
  - `app/(public)/calculator/page.tsx` becomes a server component: metadata, JSON-LD, the server-rendered default slip, and the static sections. The interactive slip moves to `app/(public)/calculator/CalculatorSlip.tsx` (client).
  - `lib/public/calculator.ts`: copy, FAQ list, the example student, default rows.
  - `lib/public/calculator-url.ts`: `encodeCalculation`, `decodeCalculation` (with the read rules in §5.1), tested against the three sample links.
  - `lib/public/scales.ts` (planned in `01` §9; first defined here because the calculator is the first consumer):

```ts
// lib/public/scales.ts (shape; one live entry today)
import { DEGREE_CLASS_BANDS, GRADE_BANDS, MAX_GRADE_POINT } from '@/lib/cgpa/academicRules';

export interface PublicScale {
  id: 'ng-university-5';
  line: string;               // "Nigerian university 5-point scale, with PI"
  maxPoint: number;           // 5 (field limits, arc end, "0.00 to 5.00" copy)
  gradeBands: typeof GRADE_BANDS;
  classBands: { label: string; short: string; min: number; max: number }[]; // display names; engine "Fail" → "Below a Pass"
  hasPI: boolean;             // true: PI shown, PI line in copy
  scoreSplit: { ca: number; exam: number }; // 30 / 70
  units: { min: number; max: number };      // 1 / 6 for the calculator stepper
  handbookNote: string;       // "If yours differs, your handbook is the final word."
}
export const LIVE_SCALES: readonly PublicScale[] = [/* ng-university-5, built from the engine constants above */];
export const DEFAULT_SCALE = LIVE_SCALES[0];
```

  - **Rule:** every scale-dependent string, range and band on this page (meta line, field limits, column headers' point values, §5.3, FAQ thresholds, JSON-LD text) is read from `DEFAULT_SCALE`; the maths is the engine's. With one live scale there is no switcher and no mention of any other scale.

## 9. SEO

- **Title:** "CGPA calculator for Nigerian universities" → "CGPA calculator for Nigerian universities | AcadeGrade".
- **Description:** "Work out your semester GPA, PI and CGPA from your result slip, using letter grades or scores. For Nigerian universities. Free, no account, nothing saved." (153 characters)
- **Keywords** (kept, extended): CGPA calculator, GPA calculator Nigeria, Performance Index calculator, 5 point scale GPA calculator.
- **Canonical:** `/calculator` (absolute, no parameters).
- **Open Graph:** the default slip with "CGPA calculator" and the stripe (`next/og`, 1200×630). Shared links use the same static image, so a link preview never shows anyone's grades.
- **JSON-LD:**
  - `WebApplication`: name "AcadeGrade CGPA calculator", url, `applicationCategory: "EducationalApplication"`, `operatingSystem: "Web"`, `isAccessibleForFree: true`, `offers: { price: 0, priceCurrency: "NGN" }`, `inLanguage: "en-NG"`, `publisher` → the site `Organization` id.
  - `FAQPage`: exactly the six questions and answers in §5.4.
  - `BreadcrumbList`: Home › Free tools (`/tools`) › CGPA calculator.
- **Headings:** one h1 (the slip title), h2 for Next questions, each section, and the close (visually hidden).
- **Sitemap:** `/calculator` stays in `PUBLIC_SITEMAP_ROUTES`.

## 10. Accessibility

- **Form semantics:** the slip is a `<form>` (submit does nothing; Enter in a field never reloads). Each course is a `<fieldset>` with a visually hidden `<legend>` ("Course 1: CSC 301"); the desktop column header row is `aria-hidden`, and every control has its own accessible name (§5.1 table).
- **Grade keys:** `role="radiogroup"` labelled by the course; arrow keys move and select; Home/End jump to A/F.
- **Units:** the number field is the keyboard path (arrow keys step 1–6); the − and + buttons are pointer helpers (`tabindex="-1"`, `aria-hidden`), at least 44×44px.
- **Focus management:** after Add, focus goes to the new code field; after Remove, to the next row's code field, or to Add when it was the last row; after Clear all, to Undo; after closing the dialog, back to the Save button.
- **Live region:** the foot bar is `role="status"`, polite, debounced 500ms: "Semester GPA 4.15. PI 4.15." and, with a prior record, "CGPA 4.42, Second Class Upper." A class change is announced once the input settles. The phone strip and the receipt are not live regions.
- **Errors:** linked with `aria-describedby`; a text icon ("!", as in `02` §4.8) plus words, never colour alone. Carry-over is said in words ("carry-over"), not only red.
- **Arc meter:** `role="img"` with the full sentence label.
- **Order:** slip → aside → sections, the same at every width; the skip link lands on the h1.
- **Targets and text:** every control 44px or more; nothing under 14px; the gold figure is ink on gold (about 9:1).

## 11. Carried over, replaced and removed

| Today | In the redesign |
|---|---|
| `Navbar` + `PublicFooter`, `.public-atmosphere` background PNGs | The shared public shell; flat `--pg-ground` |
| h1 "Quick CGPA calculator" (Bricolage, 64px) | h1 "CGPA calculator" inside the slip header (Hanken Grotesk, `--pg-head`) |
| Intro "Build a semester result from letter grades or raw scores and inspect the GPA, PI, and credit basis as you work…" | The slip sentence (§4) |
| "Calculate privately" panel with a lock icon tile | The meta line, the sentence ("nothing you type is saved") and the honest note; icon removed |
| "Semester record" heading with a mono count pill | The slip header; the count moves to the foot bar ("5 courses") |
| `SegmentedControl` "Letter grades / Scores out of 100" | `Segmented` with the label "What does your slip show?" (same values) |
| Course fieldsets with a numbered "01" tile in violet | Slip rows with no index numbers; the legend stays for screen readers |
| `Input` code, `Select` units, `Select` grade, score `Input` | `Field` code, units stepper, `GradeKeys`, score `Field` with 0–100 validation |
| Trash `IconButton` | "Remove" text button |
| `EmptyState` with a book icon in a dashed box | The empty slip with one line and Add (no icon, no dashed outline) |
| "Add a course", "Clear all" | Kept; Clear all gains Undo |
| "Live calculation / Current result" panel with a Sigma icon tile and shadowed card | The slip's foot bar with the gold figure, class and `ArcMeter` |
| GPA and PI in Geist Mono | Hanken Grotesk tabular figures |
| "Letter-grade result" / "Performance signal" captions | Removed; PI is explained in §5.3 and the FAQ |
| "Total credits" / "Courses" tiles | "13 units · 5 courses" in the foot bar's small line |
| "Use your institution's official result for formal verification." | The honest note |
| **Share calculation (login-gated)** | **Share this calculation, no login**; Web Share on phones; signed-in transcript path |
| "Save to profile" + arrow icon | "Save to your record" (same handoff, same routes) |
| Modal "Create an account to continue" (share or save) | Dialog "Save these courses to your record" (save only) |
| Suspense fallback "Preparing calculator…" and `return null` before mount | Server-rendered default slip; no blank first paint |
| Letters→scores sets 50; scores→letters sets C | Values kept per row; letters derived from scores; no invented scores |
| No links to the tools | Next questions (four tools with live hints) and "All free tools" |
| `layout.tsx` metadata "Free CGPA & Performance Index Calculator" | New title, description and JSON-LD (§9); `layout.tsx` can return to a pass-through or be removed once `page.tsx` exports metadata |
| Nothing | New: CGPA so far, the receipt (§5.2), the scale ledger (§5.3), the FAQ (§5.4) |

**Tests to update:** `tests/unit/calculator-save-handoff.test.tsx` (main name now "CGPA calculator"; button "Save to your record"; dialog title "Save these courses to your record"; the share test now expects a copy with no dialog and nothing kept). Add `calculator-url.test.ts` and pin every row of the sample-data table.

## 12. Acceptance checklist

- [ ] Five-second test: a stranger says "it works out my GPA and CGPA from my result slip".
- [ ] Every pinned state in §5.1 computes exactly (4.13; 4.15 / 4.42; 4.49; 4.53 First; 3.46 / 4.32 with a carry-over; score mode 4.15 / PI 3.30 / 65.9; 3.09).
- [ ] Old `?m=&c=` links (the three samples) open with the right rows; unreadable and out-of-range links show their notes; non-ASCII codes no longer break the URL.
- [ ] Share works signed out with no dialog; the privacy line is beside it; signed in shows the transcript line.
- [ ] Save: signed out writes the same handoff and opens the dialog with the right count; signed in goes to `/results`; blocked storage shows its message; nothing-to-save disables the button with its reason.
- [ ] Keyboard-only: add, edit (code, units, grade, score), remove, switch mode, open CGPA so far, save, share, all without a mouse; focus moves as in §10.
- [ ] Phone 390×844 with the cookie stub open: h1, sentence, mode control and the first row are visible, and the results strip sits above the cookie stub; only one primary action is ever on screen.
- [ ] No JavaScript: the default slip shows GPA 4.13; the FAQ and rule sections read fully.
- [ ] `inspect.mjs` 0 FAIL at 1440/768/390, light and dark (pictures: 2 `data-ui` + 2 photographs; one rest screen only); `lint.mjs` and `impeccable detect` clean.
- [ ] Lighthouse mobile ≥ 90 ×4; LCP under 2.0s (the LCP element is the h1 or the slip, not an image); CLS under 0.05 when a `?c=` link replaces the default rows.
- [ ] FAQ JSON-LD equals the visible FAQ; `WebApplication` and `BreadcrumbList` validate; canonical has no parameters.
- [ ] No mono, no eyebrow, no icon tiles, no pills, no shadows at rest, no gradients, no "beta"/"coming soon"/"illustrative".

## 13. Open items for the owner

1. **RESOLVED (17 Nov):** the home slip now shows "331 points over 74 units (CGPA 4.47)", so it no longer implies the rounded CGPA. The calculator keeps its own honest 4.42 example. Original note: **Home example mismatch:** `home.md` shows "CGPA 4.47 over 74 units" but computes 4.43 from 331 points; typed into this calculator, 4.47 and 74 give 4.42. Choose one: change the home prior-record line to "331 points over 74 units", or have the home slip compute from the typed 4.47 and show 4.42 (the 4.49 and 4.53 First states hold either way).
2. **CGPA so far** is a new addition (two optional fields and `pc`/`pu` in the URL). Confirm it, since it is what makes the page a true CGPA calculator.
3. **Units range:** the calculator offers 1–6 units (today's range) while the handoff accepts up to 12. Do any partner departments use 0-unit or 8-unit courses (for example SIWES or a project) that the calculator should accept?
4. **Class at this GPA** without a prior record: keep it (helpful for 100L first semester) or show the class only once a CGPA so far is entered?
5. **Example programme:** the example student is 300L Computer Science (shared with the home page). Confirm, or name another programme.
