# Page plan · Features (`/features`)

Inherits `01`–`04` and follows the template of `pages/home.md`. Anything not stated here follows those files. The example student, the hero slip courses and every figure are the same as on the home page, so a visitor who moves between the two pages sees one consistent record.

## 1. Purpose

- **Mode:** Persuade.
- **Visitor:** a student who clicked **Features** in the header, came from a home sheet link, or searched for "CGPA app" or "result tracker Nigeria". Often on a phone, usually already curious after the home page.
- **First question:** "What exactly can it do for me, where does it work, and what does it cost?" Answer within five seconds: *everything after the result slip, on web and Android, free*.
- **One action:** **Create your free record** (`/register`). Signed in, it reads **Open dashboard** (`/dashboard`).
- **Secondary (text links only):** each feature page, the free calculator, the Android app.
- **Anchors this page must keep:** `#record`, `#scanner`, `#academind`, `#timetable`, `#planning`, `#transcript` (linked from home sheet 4), `#sharing`, `#privacy`.

## 2. The argument (each section exists because of one claim)

| # | Claim | Proof on the page | Section |
|---|---|---|---|
| 1 | AcadeGrade covers every step after the result slip, and says where each part works | A printed contents sheet listing every capability with where it runs and who can use it | Hero |
| 2 | The numbers are right and traceable | A giant CGPA beside the receipt that adds up to it | Every figure, worked out (`#record`) |
| 3 | It saves time and helps the next decision | Four stacked sheets, each with a real interface fragment | Tools for the next decision |
| 4 | You can show your record on your own terms | The transcript as a ticket, with the share link as its stub | A transcript you can share safely (`#transcript`) |
| 5 | It fits student life in many small ways | Twelve short points beside a campus library | Small things that help |
| 6 | Your record stays yours | Four plain facts with real figures | Your record stays yours (`#privacy`) |
| 7 | Starting is small | The idea restated on the ink field | Start with one slip |

## 3. First screen

### Desktop (1440×900)

- **Ground:** `--pg-ground`, the header transparent over it.
- **Left, columns 1–6** (top-aligned with the sheet, 64px below the header):
  1. **h1** at `--pg-display` (96px here), two lines: "From result slip / to plan."
  2. **Sentence** at `--pg-lead`, held to 40ch, 32px below (copy in §4).
  3. **Primary button**, 40px below: **Create your free record**.
  4. **Two text links** in one row, 20px below the button: "Try the calculator first" (`/calculator`) and "Get the Android app" (`/app`).
  5. **Scale line** at `--pg-small`, soft ink, anchored 48px above the fold: "For Nigerian universities, on the 5-point scale with PI." (read from `lib/public/scales.ts`; with one live scale it is this single line).
- **Right, columns 7–12: the contents sheet** (blueprint `features-capabilities-as-a-menu`, §5.1). A paper sheet 560px wide, taller than wide (about 560×760 visible), its top and bottom edges cut into shallow scallops; its lower 15% runs below the fold so the visitor sees there is more.

### Phone (390×844)

- **Order:** h1 at 40px on two lines, the sentence at 20px, the full-width button (52px), the two links on one wrapped line. All of it fits on the first screen with the cookie stub open (stub 132px, button sits above it).
- **The contents sheet** follows at full width minus 12px margins, scalloped top and bottom, 20px inner padding. It starts about 70svh down, so its scalloped top edge shows on the first screen as a promise of the list.
- The scale line moves under the links.

### Why this works

- **Fast:** what it is, who it is for and what it costs are in large type, with one action.
- **Specific:** the contents sheet is the page's index, set as a printed object in the slip's manner, and every row says where it works and who can use it, which is the question students ask before anything else ("Does it work on my phone? Is it free?").

## 4. Copy deck (final wording; sentence case; two-line rule checked)

- **h1:** "From result slip to plan." (25 characters; lines of 15 and 9)
- **Sentence:** "AcadeGrade keeps every semester, works out your GPA, CGPA, PI and degree class, and helps you plan the next one. Free for Nigerian university students, on the web and on Android." (178 characters, five lines at 40ch)
- **Button:** "Create your free record"; signed in "Open dashboard".
- **Hero links:** "Try the calculator first", "Get the Android app".
- **Section headings (h2):**
  1. "What's in AcadeGrade" (on the contents sheet; it is the sheet's heading and the page's first h2)
  2. "Every figure, worked out"
  3. "Tools for the next decision"
  4. "A transcript you can share safely"
  5. "Small things that help"
  6. "Your record stays yours"
  7. "Start with one slip."
- **Sheet names (h3):** "Scan or paste your results", "AcadeMind reads your record", "Timetables that remind you", "Plan the next semester".
- Body copy is written in each section below. No "illustrative", "unlock" or "journey" anywhere.

## 5. Sections

### 5.1 Hero: the contents sheet (blueprint `features-capabilities-as-a-menu`, adjusted as the first screen)

- **Sheet anatomy** (paper, square sides, scalloped top and bottom, 40px padding):
  - The AcadeGrade mark (24px) centred, then the heading "What's in AcadeGrade" centred at `--pg-lead`, then 40px of space.
  - Three groups. Each group name at `--pg-body` weight 500. Each item is one row: the name at `--pg-body` on the left, a short value at `--pg-small` on the right, a leader of round 4px dots between them, and a one-line description at `--pg-small` in soft ink under the name (34ch at most). 18px between items, 44px between groups.
  - Every row is a link to its anchor on this page (the whole row is the target, at least 44px tall). Hover thickens the dot leader to 5px; focus shows the gold outline around the row.
- **Rows** (exact text):

| Group | Name | Value (right) | Description | Links to |
|---|---|---|---|---|
| Your record | Semesters, GPA and CGPA | Web and Android | GPA and PI each semester, CGPA, class and carry-overs | `#record` |
| | Transcript and share links | Web and Android | A clean PDF, or a link that expires | `#transcript` |
| | Course codes for classmates | Web and Android | Share your course list; scores stay private | `#sharing` |
| Getting results in | Result scanner | 18 and over | Photograph the slip; check every row | `#scanner` |
| | Paste from your portal | Everyone | Copy your results page; check every row | `#scanner` |
| Planning | AcadeMind | 18 and over | Written analysis, forecast and what-if | `#academind` |
| | Timetables | Reminders on Android | Lectures, reading plans and exams | `#timetable` |
| | Free planning tools | No sign-up | Required GPA, carry-over impact and more | `#planning` |

- **Semantics:** the sheet is `<nav aria-label="On this page">` containing an `h2` and three `<ul>`s; values are part of each link's accessible name ("Result scanner, 18 and over").
- **Phone:** the sheet keeps names left and values right with the dot leader; descriptions wrap under at 15px; group names drop to 18px; padding 20px.
- **Data:** static (`lib/public/features.ts`). The "18 and over" values come from the same constant the FAQ uses, so they cannot drift.

### 5.2 Every figure, worked out (`#record`; blueprint `stats-total-and-its-receipt`)

- **Field:** `--pg-ground-2`, at least 100svh.
- **Left, columns 1–6:**
  - Heading at `--pg-head` (capped 56px): "Every figure, worked out".
  - Two-line note at `--pg-body`, 24px below: "Your GPA and PI each semester, your CGPA and degree class, carry-overs and weighted average, all traced back to the courses behind them."
  - The space between the note and the total stays empty.
  - **The total**, anchored to the section's lower-left: "4.43", at the Display step scaled in container units to about 18vw (the "giant CGPA figure" named in `01` §5; it counts as the Display step), leading 0.8, ink on the ground.
  - **Caption** at `--pg-body` under it: "CGPA after 87 units · Second Class Upper · 0.07 to First Class".
  - **Text link** under the caption: "Check it yourself in the free calculator" (`/calculator`).
- **Right, columns 8–11: the receipt.** A paper slip 420px wide, top-aligned with the heading, zigzag bottom edge (depth 10px, teeth 20px). Header: mark (20px) and "Example · 300L Computer Science" at `--pg-small`, centred. A real `<table>` with caption "How the example CGPA adds up", rows at `--pg-small`/`--pg-body` with tabular figures and 4px dot leaders:

| Group | Row (left) | Value (right) |
|---|---|---|
| Before this semester | 100L and 200L, four semesters | 74 units · 331 points |
| 2025/2026 First Semester | CSC 301 Data Structures · 3 units × A (5) | 15 |
| | CSC 303 Operating Systems · 3 units × B (4) | 12 |
| | MTH 301 Numerical Analysis · 3 units × C (3) | 9 |
| | CSC 305 Computer Networks · 2 units × A (5) | 10 |
| | GST 311 Entrepreneurship · 2 units × B (4) | 8 |
| | Semester: 54 points ÷ 13 units | GPA 4.15 |
| | Performance Index (scores 76, 65, 56, 72, 61) | PI 3.30 |
| Your record | All units | 87 |
| | All points | 385 |
| Inverted ink bar | CGPA: 385 ÷ 87 | 4.43 |

- **Checks** (pinned in a unit test with `lib/cgpa/academicRules.ts`): 15 + 12 + 9 + 10 + 8 = 54; 54 ÷ 13 = 4.154 → 4.15; PI = (3.80×3 + 3.25×3 + 2.80×3 + 3.60×2 + 3.05×2) ÷ 13 = 42.85 ÷ 13 = 3.296 → 3.30; 331 + 54 = 385; 74 + 13 = 87; 385 ÷ 87 = 4.425 → 4.43; 4.50 − 4.43 = 0.07.
- **Phone:** heading and note first; the total at 40vw flush left with its caption; the receipt at full width minus 16px margins, keeping its zigzag and the inverted total row.

### 5.3 Tools for the next decision (blueprint `features-stacking-colour-sheets`, as `03` §3.4 requires for `/features`)

- **Heading** on the ground: "Tools for the next decision", with 48px below, scrolling away normally.
- **Four sticky sheets**, about 86svh tall, top offsets rising 72px, square corners. Each sheet: its name (h3) in the 72px band top-left (head step capped at 44px); a paragraph at `--pg-body` bottom-left (40ch); three fact lines at `--pg-small` above the paragraph; a real interface fragment (`UiFrame`) in columns 7–12 filling from below the band to the bottom edge; a text link under the paragraph. Each sheet carries its anchor id.
- **The fragments differ from the home page's sheets on purpose**, so the two pages show different parts of the product.

| Sheet | Anchor | Field (text) | Name | Fact lines | Paragraph | Fragment (example data) | Link |
|---|---|---|---|---|---|---|---|
| 1 | `#scanner` | `--pg-ink` (paper) | Scan or paste your results | "Photo, image or PDF up to 10 MB" · "Paste text from your school portal" · "You check every row before saving" | "Photograph your result slip or paste your portal page. AcadeGrade reads the courses into rows, you check each one, and nothing is saved until you say so." | The import panel on its **Paste text** tab, with the five example courses pasted and the line "5 courses found" (see the paste sample in `features-result-scanner.md` §5.4) | "How the result scanner works" → `/features/result-scanner` |
| 2 | `#academind` | `--pg-violet` (white) | AcadeMind reads your record | "Written analysis" · "Forecast of your CGPA" · "What-if guidance" | "AcadeMind writes a plain analysis of your semesters, shows where your CGPA is heading and answers what-if questions. It is guidance to plan with, never a verdict." | The forecast panel: "Cumulative GPA projection", projected next semester CGPA 4.30, trend "slipping since 100L" (data in `features-academind.md` §5.2) | "Meet AcadeMind" → `/features/ai-insights` |
| 3 | `#timetable` | `--pg-gold` (ink) | Timetables that remind you | "Lectures, reading and exams" · "Build with AcadeMind" · "Reminders on Android, even offline" | "Put in your lectures and exams, or let AcadeMind lay out a reading plan around them. Your Android phone reminds you before each one, with or without data." | The Build with AcadeMind preview: "Why it looks this way" and the sessions per subject (data in `features-timetable.md` §5.4) | "See how timetables work" → `/features/timetable` |
| 4 | `#planning` | `--pg-paper` on the ground (ink) | Plan the next semester | "Required GPA for your target class" · "Preview grades you're still waiting for" · "Carry-over impact" | "Pick the class you're aiming for and see the GPA you need. Try the grade you expect for a course that's still awaiting result, and see what a carry-over does to your CGPA." | The degree goal card: target First Class (4.50), 3 semesters of 13 units left, required GPA 4.67, target average score about 93% | "Open the free tools" → `/tools` |

- **Sheet 4 checks:** required = (4.50 × (87 + 39) − 385) ÷ 39 = 182 ÷ 39 = 4.667 → 4.67 (required averages round up; `requiredAverageForTarget`); 4.67 ÷ 5 × 100 = 93%. Pinned in the page test.
- **Phone:** offsets shrink to 52px, names to 22px; the fragment comes first at 4:3, then fact lines and paragraph; sheets are at least 70svh.
- **Check:** `scenes.mjs` shows every sheet name readable at every point of the hold, light and dark.

### 5.4 A transcript you can share safely (`#transcript`; blueprint `pricing-ticket-with-stub`)

- **Ground:** `--pg-ground`. One ticket centred, about 64vw wide at 2.3:1 (920×400 at 1440), built as a 7fr / 3fr grid in paper. Half-round notches 28px across bitten from the top and bottom edges at the join; a column of 6px round dots in the ground colour between them as the perforation.
- **Main part (left, 40px padding):**
  - h2 top-left at `--pg-head` (capped 48px): "A transcript you can share safely".
  - Along the bottom, two tidy columns of lines at `--pg-body`:
    - "Every semester in one clean PDF"
    - "Print it, or hide or show your photo"
    - "Marked as your own record, not an official one"
    - "Share it as a link with a QR code"
- **Stub (right):**
  - The value at `--pg-head`, centred: "30 days".
  - Under it at `--pg-small`, centred, four short lines: "Links last 1, 7 or 30 days" · "Full record or summary only" · "Optional PIN of 4 to 6 digits" · "Delete a link any time".
  - The action as a solid ink bar, the stub's full width, 56px: **Make your transcript** → `/register` (signed in: `/transcript`).
- **Under the ticket**, columns 3–10, one line at `--pg-body` in soft ink: "People you share with see a clean copy labelled as a self-reported record. When the link expires or you delete it, it stops working."
- **Phone:** the ticket turns upright, full width less 20px margins; main part on top, stub beneath; notches move to the left and right edges and the dots run across; the h2 at 32px, "30 days" at the head step, the action bar full width.
- **Facts used** (from code): expiry choices `SHARE_EXPIRY_CHOICES = [1, 7, 30]`, default 30; `level: 'summary' | 'full'`; PIN 4 to 6 digits (`isValidPin`); photo toggle; QR (`ShareQr`); PDF download and print on `/transcript`.

### 5.5 Small things that help (`#sharing` sits here; blueprint `features-shape-marked-small-points`)

- **Left, columns 1–5:** one photograph inside a circle (the logo's own shape, as its dot), about 78svh tall, pushed 12% past the section's left edge so the viewport crops it: the Nnamdi Azikiwe Library, University of Nigeria, Nsukka, in the greyscale-indigo treatment. Caption on a small paper tab at the bottom-right of the visible part: "Nnamdi Azikiwe Library, University of Nigeria, Nsukka".
- **Right, columns 7–12:** h2 at `--pg-head` (capped 48px): "Small things that help"; 56px below, twelve points in three columns (40px column gap, 44px row gap), no cells. Each point: a title (h3) at `--pg-body` weight 500 preceded by a flat filled dot at cap height (0.7em); then two lines at `--pg-small` in soft ink. Dot colours by column: `--pg-step-1`, `--pg-step-3`, `--pg-step-5` (the only colour on that side).
- **Points** (title · text):
  1. **Course codes for classmates** (`id="sharing"`) · "Share your course list as a code or link. Classmates get the codes, titles and units; your scores stay private."
  2. **Carry-overs flagged** · "An F stays marked until you pass the course again, with what it does to your CGPA."
  3. **Weighted average score** · "Your average mark across every course, weighted by units, beside your CGPA."
  4. **Grades you're waiting for** · "Try the grade you expect for a course awaiting result and watch your CGPA move. Nothing is saved."
  5. **Unit-load check** · "A gentle note if a course is entered twice or a semester's units fall outside your school's range."
  6. **Milestones** · "A quiet note when you reach something good. Never a comparison with anyone else."
  7. **Semester recap** · "A one-time summary when you complete a semester: what you earned and what changed."
  8. **Direct entry and spill-over** · "Started in 200L or 300L, or have extra semesters? Your timeline fits."
  9. **Data saver** · "Lighter screens and fewer images when your data is running low."
  10. **Signed-in devices** · "See where you're signed in and sign out everywhere at once."
  11. **Notices and support** · "Announcements in your inbox, and a support inbox that replies to you in the app."
  12. **Light or dark** · "Follows your phone, or choose for yourself."
- **Phone:** the shaped photograph first, 82vw wide, cropped by the left edge, at most 60svh; heading at 30px; points in one column, 28px apart, the dot hanging in the margin left of each title.

### 5.6 Your record stays yours (`#privacy`; blueprint `stats-quiet-figure-lines`)

- **Ground:** `--pg-ground`, with at least 18vh of empty ground above and below the block.
- **h2** at `--pg-lead` (blueprint 24–28px), on the sentences' left edge, 56px above the first row: "Your record stays yours".
- **Under the heading**, one sentence at `--pg-body` in full ink: "Your own record. Your university's transcript stays the official one."
- **Rows** in columns 2–7 as a `<dl>`: a 132px figure track (right-aligned, `--pg-lead`, weight 500, tabular) and a sentence track (24px gap, `--pg-body`, soft ink, 40ch), 28px between rows:
  - **18+** · "AcadeMind and result scanning are for students 18 and over, and only after you allow them. Under 18? Your record, the calculator, paste-from-portal and timetables all work."
  - **1, 7, 30** · "Days a share link can last. You choose, and you can delete a link sooner."
  - **4–6** · "Digits in the optional PIN that guards a share link."
  - **0** · "Records sold. We never sell your personal information, and classmates never see your scores, even when you share course codes."
- **Optional photograph**, columns 9–11, its top 80px below the first row, square: the 1962 photograph of a thumbtacked notice at University College, Ibadan (results and notices used to be pinned up for everyone; the contrast is the point). Caption at `--pg-small`: "A notice pinned at University College, Ibadan, 1962."
- **Two text links** under the rows: "Read the privacy notice" (`/privacy`) and "Delete your account" (`/account-deletion`).
- **Phone:** the two-track grid stays; figure track 88px, figures at 24px; the photograph after the rows at 56% width, flush right.

### 5.7 Start with one slip (CTA; blueprint `cta-idea-restated-inverted`)

- **Field:** `--pg-ink`, at least 90svh, full bleed; its top edge is a hard line.
- **Headline** at the Display step on two lines, leading 0.9, flush left in the upper two-thirds, paper colour: "Start with / one slip." It echoes the hero's "From result slip to plan." without repeating it.
- **Along the bottom** on one baseline 40px above the edge: the sentence at `--pg-lead` in columns 1–5, "Add this semester's results and your GPA, CGPA and class are ready in minutes. Free, private and yours."; and the button right-aligned in columns 10–12, 56px: **Create your free record** (signed in: **Open dashboard**).
- **Button colour (deviation, deliberate):** the blueprint asks for an accent-coloured button; `02` §4.4 binds buttons on ink fields to paper with ink text. Paper is used, and the hover stripe rises inside it as usual.
- **Phone:** 80svh; headline at the Display step's phone size (40px) on two lines at the top; sentence lower at 17px; the button full width at the bottom with 20px margins.
- 160px of ground before the footer.

### 5.8 Footer

The shared `PublicFooter`. Credits for this page's photographs join the imprint line through `lib/public/credits.ts`.

## 6. Imagery for this page

| Slot | Picture | Source and licence | Treatment |
|---|---|---|---|
| Small points (circle) | Nnamdi Azikiwe Library, University of Nigeria, Nsukka (`openverse:af32be22-489e-4c3b-821b-52439c5d4a85`) | Wikimedia Commons, by Udeagbala, CC BY-SA 4.0, https://commons.wikimedia.org/w/index.php?curid=56211168 | Greyscale-indigo, circle crop, AVIF under 120 KB |
| Privacy (square) | "University College Ibadan. Thumbtacked notice", 1962 (`openverse:c1a32c03-adf9-4cf8-8780-0f1ec6c26495`) | Wikimedia Commons, ASC Leiden, by Maarten van Dis, CC BY-SA 4.0, https://commons.wikimedia.org/w/index.php?curid=97090535 | Same treatment, 1:1 crop on the notice, AVIF under 60 KB |
| Sheets 1–4 | Real interface fragments: import panel (paste tab), forecast panel, Build with AcadeMind preview, degree goal card | AcadeGrade's own components with the example student's data | `UiFrame`, 70–100% scale, captions at small |
| Transcript ticket and receipt | Drawn in code (stationery) | n/a | Paper, ink, dots |

Credit line (imprint): "Nnamdi Azikiwe Library, UNN, by Udeagbala; University College Ibadan notice, 1962, by Maarten van Dis / ASC Leiden (CC BY-SA 4.0, via Wikimedia Commons; tinted)." Pictures show the students' world and are never presented as AcadeGrade users or rooms.

## 7. Motion on this page

- **Signature (short version, `03` §3.1):** the contents sheet is laid down: it rises 24px with opacity over 640ms, then its rows appear in order 40ms apart. Once per visit.
- **Receipt:** rows print in order (40ms apart) as the section enters; the inverted total row lands last. The giant 4.43 is static text.
- **Sheets:** sticky stacking, CSS only.
- **Ticket:** as it enters, the stub settles 8px to the right along the perforation (transform, 320ms, `--pg-ease-paper`), as if just torn.
- **Small points:** dots pop in by column, 50ms apart; the circle photograph drifts 2% in scale over the section's scroll.
- **Privacy rows and CTA:** standard entrances.
- **Count:** at least 10 moving elements over load and scroll; all drop travel under reduced motion and data saver.

## 8. Components

- **Used:** `PublicHeader`, `Slip` (`receipt`, `stub`), `Stripe`, `UiFrame`, `Figure`, `Credit`, `Button`, `TextLink`, `SectionHeading`, `CookieStub`, `PublicFooter`.
- **New, reusable:**
  - `ContentsSheet` (scalloped sheet with grouped rows, dot leaders and anchor links).
  - `Receipt` rows with dot leaders and an inverted total row (shared with the timetable page).
  - `Ticket` (7fr/3fr with notches and perforation; turns upright on phones).
  - `ShapePoints` (shaped photograph plus a point grid).
  - `FigureLines` (two-track `<dl>`).
  - `InvertedClose` (ink-field CTA).
- **Fragments** (`components/public/fragments/`): `ImportPasteFragment`, `ForecastFragment`, `StudyPlanPreviewFragment`, `DegreeGoalFragment`, each rendering the real student component (or a faithful server-rendered copy of it) inside `UiFrame` with the example data, `inert`, with a caption.
- **Data:** `lib/public/features.ts` (contents rows, receipt rows, sheets, points, privacy rows); `lib/public/example-student.ts` (shared with home: the five courses, the scores, the prior record) so every page computes from one source.

## 9. SEO

- **Title:** "Features | AcadeGrade".
- **Description:** "Everything AcadeGrade does for Nigerian university students: GPA, CGPA and PI, result scanning, AcadeMind, timetables with reminders and transcripts you can share." (157 characters)
- **Canonical:** `/features`.
- **Open Graph:** the contents sheet on the ground with "From result slip to plan."
- **JSON-LD:** `BreadcrumbList` (Home › Features).
- **Headings:** one h1; h2 for each section (the contents sheet's heading is the first h2); h3 for sheet names and points.
- **Internal links:** to all three feature pages, `/tools`, `/calculator`, `/app`, `/privacy`, `/account-deletion`.
- **Keywords** (metadata): "CGPA tracker Nigeria", "result slip scanner", "degree class calculator", "student timetable app". The old "AI academic insights" keyword is dropped.

## 10. Accessibility

- **Contents sheet:** a `<nav aria-label="On this page">`; each row is one link whose name includes its value; the dot leaders are `aria-hidden`.
- **Receipt:** a real `<table>` with a caption; the inverted row is a `<tfoot>`.
- **Giant 4.43:** real text, with the caption as its description (`aria-describedby`).
- **Sheets:** names are h3; focus order follows the visual order; fragments are `inert` with captions, so the keyboard never lands inside a picture of a form.
- **Ticket:** the notches and perforation are decorative (`aria-hidden`); the stub's action is a normal link.
- **Points:** a `<ul>` of h3 items; dots `aria-hidden`.
- **Photographs:** alt text names the place ("The Nnamdi Azikiwe Library building at the University of Nigeria, Nsukka").
- **Anchors:** `scroll-margin-top` equal to the header height.

## 11. Carried over, replaced and removed

| Today | In the redesign |
|---|---|
| Hero "One record. A clearer degree journey." + reused stock photo (`heroimage2.png`) | h1 "From result slip to plan." and the contents sheet; the stock photo is retired |
| "Useful at the moment you need it." + pill chip index (Record, Understand, Save time, Plan, Present) | The contents sheet: the same index as one printed object, now with where each part works |
| Capability "Record" (illustrative GST 111/MAT 111 table) | Every figure, worked out (`#record`), with the example student whose numbers add up |
| Capability "Understand" (CGPA 3.71, PI 3.04, unlabelled trend, "Illustrative") | The receipt (GPA 4.15, PI 3.30, CGPA 4.43) and sheet 2's forecast |
| Capability "Save time" (`ocr page.jpeg`) | Sheet 1 (`#scanner`) with the paste fragment, linking to the scanner page |
| Capability "Plan" ("4.63 in each of the next three") | Sheet 2 (`#academind`) and sheet 4 (`#planning`), numbers that add up |
| Capability "Present" (`transcrip-page.jpeg`) | The transcript ticket (`#transcript`), with the real share options |
| "Your record stays yours." privacy statement | Kept as the h2 of `#privacy`, now with real figures and links |
| `ProductCta` | "Start with one slip." on the ink field |
| Not mentioned today | Timetables, course-code sharing, paste-from-portal, the free tools, and the twelve small points |
| Metadata title "Academic tracking features" | "Features \| AcadeGrade" |
| Geist Mono figures, Bricolage headings, rounded cards, `ShieldCheck` icon | Hanken Grotesk with tabular figures, square stationery, no icon tiles |

## 12. Acceptance checklist

- [ ] Five-second test: a stranger can say "it records your results, works out your CGPA and class, and has a scanner, AcadeMind and timetables; free on web and Android".
- [ ] Every contents-sheet row jumps to its anchor; `/features#transcript` from the home page lands on the ticket with its heading visible under the header.
- [ ] The receipt sums exactly (54, 4.15, 3.30, 385, 87, 4.43) and sheet 4 shows 4.67; both pinned by unit tests against `lib/cgpa/academicRules.ts`.
- [ ] Phone: h1, sentence and button on the first screen at 390×844 with the cookie stub open.
- [ ] `inspect.mjs`: 0 FAIL at 1440/768/390, light and dark; `scenes.mjs`: no sheet name covered at any point.
- [ ] Lighthouse mobile ≥ 90 ×4; no image above the fold; first-load images under 400 KB.
- [ ] No "illustrative", "coming soon" or "beta" in the rendered page; the timetable sheet never calls the builder AI.

## 13. Open items for the owner

1. Confirm the twelve "small things" (drop any you would rather not promise on a public page, for example milestones).
2. Confirm "Make your transcript" as the ticket's action label, or prefer "Share your record".
3. Approve the 1962 University College Ibadan notice photograph for the privacy section (archival, CC BY-SA), or leave that slot empty.
