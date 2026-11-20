# Page plan · Home (`/`)

The template for every other page plan. It inherits `01`–`04`; anything not stated here follows those files.

## 1. Purpose

- **Mode:** Persuade.
- **Visitor:** a Nigerian university student who heard about AcadeGrade from a classmate, a WhatsApp status or a search, usually on a phone on mobile data, often on or after results day.
- **First question:** "What is this, and is it for me?" Answer within five seconds: *it works out your CGPA and degree class from your result slip, for Nigerian universities, free.*
- **One action:** **Start your free record** (`/register`). After the visitor touches the live slip, the same button reads **Save this semester** and carries the slip into sign-up.
- **Secondary:** the calculator and the Android app, as text links only.

## 2. The argument (each section exists because of one claim)

| # | Claim | Proof on the page | Section |
|---|---|---|---|
| 1 | AcadeGrade turns your results into your GPA, CGPA and class, instantly | The live result slip: change a grade and watch the class change | Hero |
| 2 | It speaks your university's grading language | The full 5-point scale, the class bands, how GPA and PI are worked out, carry-overs, direct entry | Scale |
| 3 | One slip becomes a whole record and a plan | Six real outputs printed as slips | What one slip gives you |
| 4 | It fits into results day and takes minutes | A results-day itinerary with real timings | How it works (`#how-it-works`) |
| 5 | Everything after the slip is covered | Five capabilities, each shown with its real interface | Everything after the slip |
| 6 | Other students use it (only with real proof) | Approved quotes and a real count | What students say (hidden until real) |
| 7 | A real person built it, for students like them | A signed letter from the founder | Letter |
| 8 | The doubts are answered | Facts plus six answers | Before you start |
| 9 | Starting is small and free | The reply card | Start |

## 3. First screen

### Desktop (1440×900)

- **Layout:** the viewport splits 50/50 with 12px outer margins and a 12px gap.
- **Left half: the hero slip.** A paper panel the height of the viewport minus the header, scrolling normally. In order:
  1. **Stripe band:** five flat blocks, `--pg-step-1…5`, 56px.
  2. **Mark and wordmark,** centred.
  3. **h1**, centred, at `--pg-head` (64px here): "Know your CGPA. / Know your class."
  4. **Supporting sentence** at lead, held to 40ch, centred, 32px below: "AcadeGrade turns each semester's result slip into your GPA, CGPA and degree class, then helps you plan the next one. Free for Nigerian university students."
  5. **The live slip table** (five courses; see §5.1), then the foot bar with GPA, CGPA, class and the arc meter.
  6. **Primary button**, centred: **Start your free record**.
  7. **Three text links** in one centred row: "Try the full calculator" (`/calculator`), "Get the Android app" (`/app`), "Sign in" (`/login`).
- **Right half: the campus photograph.** It covers the full height, square corners, `position: sticky; top: 0`.
  - Frames: University of Nigeria, Nsukka main gate, crossfading slowly to the Faculty of Arts building and a lecture theatre.
  - Treatment: greyscale with an indigo cast.
  - Caption, small, bottom-left on a paper tab: "University of Nigeria, Nsukka".

### Phone (390×844)

- **Photograph first,** full width inside the 16px margins, 30svh. (The blueprint says 48svh; it is shortened so the h1, sentence and button fit on the first screen. This deviation is deliberate.)
- **Slip below it,** overlapping the photograph by 24px. It holds: a 40px stripe; the h1 at 40px over two lines; the sentence at 20px; and the **Start your free record** button at full width (52px).
- **Further down:** the live slip table, with the five courses as stacked rows; Title wraps under Code; the grade keys sit on their own line, 44px each.
- **Links** wrap into the slip's foot.

### Why this works

- **Fast:** the first screen says what AcadeGrade is, who it is for and what it costs in large type, with one action.
- **Specific:** the slip is the product working, not a picture of it, and the photograph is a real Nigerian campus, not a stock model.

## 4. Copy deck (final wording; sentence case; checked against the two-line rule)

- **h1:** "Know your CGPA. Know your class." (31 characters; two lines of 15 and 16)
- **Sentence:** see above (147 characters, three lines at 40ch).
- **Button:** "Start your free record" → after interaction "Save this semester".
- **Live slip meta line:** "Example · 300L Computer Science · 2025/2026 First Semester".
- **Live slip hint** (small, under the table): "Change a grade to see your class move."
- **Foot bar labels:** "Semester GPA", "CGPA", "Class".
- **Prior-record line** (small, above the foot): "Before this semester: 331 points over 74 units (CGPA 4.47)". It shows the points because the slip computes from them; a rounded CGPA typed into the calculator gives 4.42, not 4.43 (see `calculator.md` §13; resolved 17 Nov).
- **Section headings** (h2):
  1. "Scale" (visible giant word), with `aria-label`: "The Nigerian university grading scale"
  2. "What one slip gives you"
  3. "Results day, sorted."
  4. "Everything after the slip"
  5. "What students say" (proof; hidden until real)
  6. "Why I built AcadeGrade" (the letter's heading)
  7. "Before you start"
  8. "Start your record"
- Section body copy is written inside each section below.

## 5. Sections

### 5.1 Hero: live slip beside the campus

- **Blueprint:** "Striped card beside the room", adjusted. The card is the result slip; the room is the campus.
- **Live slip data** (sample, computed with the 5-point rules):

| Code | Course title | Units | Grade | Point | Units × point |
|---|---|---|---|---|---|
| CSC 301 | Data Structures | 3 | A | 5 | 15 |
| CSC 303 | Operating Systems | 3 | B | 4 | 12 |
| MTH 301 | Numerical Analysis | 3 | C | 3 | 9 |
| CSC 305 | Computer Networks | 2 | A | 5 | 10 |
| GST 311 | Entrepreneurship | 2 | B | 4 | 8 |
| **Total** | | **13** | | | **54** |

- **Results at load:**
  - Semester GPA = 54 ÷ 13 = **4.15**.
  - Prior record: 331 points over 74 units (CGPA 4.47). New CGPA = (331 + 54) ÷ (74 + 13) = 385 ÷ 87 = **4.43**, **Second Class Upper**.
- **The story the visitor discovers:**
  - MTH 301 C→A gives 391 ÷ 87 = 4.49 (still Second Class Upper, "0.01 short").
  - Then CSC 303 B→A gives 394 ÷ 87 = **4.53, First Class**: the dot crosses into gold.
  - Setting any course to F marks the row in examiner red and adds "1 carry-over" to the foot.
- **Engine:** compute with `lib/cgpa/academicRules.ts` (the same shared module as the app). A unit test pins these three states (4.15 / 4.43; 4.49; 4.53 First).
- **Behaviour:**
  - The grade keys use `GradeKeys` (radiogroup); figures tween; the meter dot travels; the polite live region reads "CGPA 4.53, First Class".
  - The first interaction swaps the button label to "Save this semester", which writes the existing calculator handoff (five rows, letter-grade mode) and goes to `/register`. For signed-in visitors the button reads "Open dashboard".
- **No-JavaScript fallback:** a server-rendered static slip with the load values; the keys render as plain text grades.
- **States:** none load from the network; the slip is static data plus local maths.

### 5.2 Scale (blueprint: "Giant word, filled bar rows")

- **Layout:** two columns.
  - Columns 1–6: the giant word **Scale**, sized in container units to fill the column edge to edge (Hanken Grotesk 500, leading 0.8).
  - 20px below it: seven filled bars (56px tall, 6px gaps, `--pg-paper` on the ground, square corners). Each bar is a `<details>`; the first is open.
  - Columns 7–12: a large `ArcMeter` (about 520px), whose highlighted band follows the open bar (grades → the five point steps; classes → the four thresholds).
- **Bars and their contents** (name left, value right, tabular figures):
  1. **Grades on the 5-point scale** (open): A 70–100 → 5 · B 60–69 → 4 · C 50–59 → 3 · D 45–49 → 2 · E 40–44 → 1 · F 0–39 → 0.
  2. **Degree classes:** First Class 4.50–5.00 · Second Class Upper 3.50–4.49 · Second Class Lower 2.40–3.49 · Third Class 1.50–2.39 · Pass 1.00–1.49.
  3. **How your GPA is worked out:** "Multiply each course's point by its units, add them up, divide by your total units. The example above: 54 ÷ 13 = 4.15."
  4. **Performance Index (PI):** "PI uses your actual scores, not just the letter: each total ÷ 100 × 5, averaged by units. A 76 counts as 3.80, a 72 as 3.60. AcadeGrade shows PI beside your GPA."
  5. **Carry-overs:** "An F stays on your record until you pass the course again. AcadeGrade flags it and shows what it does to your CGPA."
  6. **Direct entry and spill-over:** "Started in 200L or 300L? Your timeline starts there. Extra semesters after your final year are counted as spill-over."
  7. **Your handbook decides:** "Most Nigerian universities use these bands. If yours differs, your handbook is the final word; AcadeGrade's numbers are your personal record, not an official result."
- **Built to grow:** the bars are generated from `lib/public/scales.ts`. A second scale later adds a scale switcher above the bars; nothing else changes.
- **Phone:** the giant word fills the screen width, then the bars stack. The meter moves above the bars at 80% width.

### 5.3 What one slip gives you (blueprint: "Output slips along the edge")

- **Ground:** a full-bleed photograph (FUT Minna lecture hall), 100vw × 96svh, greyscale-indigo, under a neutral scrim behind the text column only.
- **Text:** a column starting at 18% of the width, in paper colour at lead size:
  > What one slip gives you. The moment your results are in, AcadeGrade works out the semester, updates your record and tells you what it means for your class.
  >
  > Then it keeps going: what you need next semester, which courses to carry, when your next lecture starts.
- **Six paper slips** stand along the bottom edge at different heights (26–44svh), 12px apart, cropped by the section edge. Two are tilted 1–2°. Each carries real output at 15px (small step), a first line at body weight 500, then a divider of typed characters ("··········"):
  1. **Semester result:** "2025/2026 First Semester / 13 units / GPA 4.15 / PI 3.30*" (*the slip shows PI from these example scores: 76, 65, 56, 72, 61, whose weighted PI = 42.85 ÷ 13 = 3.30).
  2. **Your record:** "CGPA 4.43 / 87 units / Second Class Upper / 0.07 to First Class".
  3. **Carry-overs:** "None outstanding / MTH 201: passed on retake, 2024/2025".
  4. **Your target:** "Aiming for First Class (4.50) / Remaining: 40 units / You need 4.67 average" (check: (4.50 × 127 − 385) ÷ 40 = 186.5 ÷ 40 = 4.6625; a required average is always rounded up, so it shows 4.67. Use `requiredAverageForTarget` and pin this in a test).
  5. **AcadeMind:** "Your strongest results are in 3-unit CSC courses. Raising MTH 301 is the quickest way to First Class." (AcadeMind logo at 20px; text in full ink.)
  6. **Next lecture:** "CSC 401 Software Engineering / Mon 9:00, LT 2 / Reminder 8:50".
- **Phone:** the photograph fills 100svh; the paragraphs sit in the top third at 22px; three slips show at 30vw each and the row scrolls sideways (scroll snap) for the rest.
- **Moving picture:** when the owner's screen recording exists, slip 1 becomes a small looping video frame (muted, `preload="none"`). Until then the photograph drifts slowly.

### 5.4 Results day, sorted (`#how-it-works`; blueprint: "Itinerary on a slip")

- **Layout:**
  - Columns 1–5: the heading "Results day, sorted." and the paragraph "Most students spend results day doing arithmetic on the back of a page. Here is the same day with AcadeGrade."
  - Columns 7–11: a receipt slip, 460px, on the `--pg-ground-2` field, with a zigzag bottom edge.
- **Slip rows** (body size, tabular figures, dot leaders of 4px round dots):
  - **Results day**
    - Scan or paste your result slip · 30 sec
    - Check each course · 1 min
    - Save the semester · 1 tap
  - **That evening**
    - Read your GPA, CGPA and class · instant
    - See any carry-over flagged · instant
  - **Before next semester**
    - Set the class you're aiming for · 1 min
    - Build a reading timetable with AcadeMind · 2 min
    - Turn on reminders · automatic
  - **Final inverted row** (ink bar, paper text): "You hold: an up-to-date CGPA and a plan · about 5 minutes".
- **Phone:** the heading and paragraph come first; the slip goes full width (16px margins) and keeps its zigzag.

### 5.5 Everything after the slip (blueprint: "Stacking colour sheets")

- **Heading** on the ground: "Everything after the slip", with 48px below.
- **Five sticky sheets** about 86svh tall, top offsets rising 72px. Top corners are square (the page's single radius is 0), so the folder-tab effect comes from the offsets. Each sheet has:
  - its name (top-left, in its 72px band, head step capped at 44px);
  - a paragraph (bottom-left, 40ch, body);
  - a real interface fragment (`UiFrame`) filling columns 7–12 from below the band to the bottom edge;
  - a text link to its feature page.

| Sheet | Field | Name | Paragraph | Fragment | Link |
|---|---|---|---|---|---|
| 1 | `--pg-ink` (paper text) | Scan or paste your results | "Photograph a result slip or paste your portal page. AcadeGrade reads the courses, you check every line, and nothing is saved until you say so." | The scanner review screen with five extracted rows | Result scanner → `/features/result-scanner` |
| 2 | `--pg-violet` (white text) | AcadeMind reads your record | "A written analysis of your semesters, a forecast of where your CGPA is heading, and what-if answers in plain English. Your grades stay yours." | The AcadeMind written analysis screen with its logo | AcadeMind → `/features/ai-insights` |
| 3 | `--pg-gold` (ink text) | Timetable with reminders | "Put in your lectures and exams, or let AcadeMind build a reading plan around them. Reminders reach your Android phone even without data." | The timetable week view and a reminder notification | Timetable → `/features/timetable` |
| 4 | `--pg-paper` | A transcript you can share safely | "Download a clean record of every semester, or share a link that expires, shows only a summary, or needs a PIN." | The transcript summary and share settings | Features → `/features#transcript` |
| 5 | `--pg-ground-2` | Plan the next semester | "See the GPA you need for your target class, check your unit load, preview grades you're still waiting for." | What-if result plus a credit-load warning | Free tools → `/tools` |

- **Phone:** the offset shrinks to 52px and the name to 22px; the fragment comes first at 4:3, then the paragraph; sheets are at least 70svh.
- **Check:** `scenes.mjs` must show every sheet's name readable at every point of the hold.

### 5.6 What students say (proof; owner-requested; hidden until real)

- **Production visibility:** shown only when at least 3 approved quotes exist in `public_testimonials`. Otherwise the whole section, heading included, is not rendered, and the page flows from 5.5 to 5.7.
- **CountLine:** shown under the heading when `admin_metrics` passes the threshold (suggested 100 registered students), for example "Used by 1,240 students across 38 Nigerian universities". It shows real figures only.
- **Composition:** on a `--pg-ground-2` field, the heading at head size top-left and three ticket stubs in a row (columns 2–11), each with a notch on its left edge, staggered vertically by 24px, one tilted 1°.
- **SAMPLE quotes** (admin preview only; replace with real, consented quotes before turning on):
  - "I scanned my slip on results day and knew my CGPA before I reached the hostel." · Chiamaka, 300L Microbiology
  - "The what-if told me exactly what I needed for a 2:1. It made my second semester plan." · Tunde, 200L Mechanical Engineering
  - "My reading timetable reminds me even when I have no data. That alone helped me." · Amina, 400L Law
- **Phone:** the stubs stack with 16px gaps; there is no tilt.

### 5.7 Why I built AcadeGrade (blueprint: "Founder's letter", sheet variant)

- **Layout:** on a `--pg-ground` field, a paper sheet 640px wide with 60px padding, square corners and a scalloped bottom edge. Below it, after a row of 5px dots, sits a 72px tear-off strip.
- **Content:**
  - A round portrait (44px; the owner's real photo, supplied by the owner) top-left.
  - The heading at lead: "Why I built AcadeGrade".
  - Four short paragraphs in the first person, at body size.
  - The sign-off "Joshua" at lead, and "Founder, AcadeGrade · Computer Science, ESUT" at small.
  - The tear-off strip carries the support email and a "Write to us" link.
- **Draft letter** (OWNER TO CONFIRM; wording must be true):
  > I studied Computer Science at ESUT. Every results day, I watched friends add up grade points on the back of a page, then do it again because they weren't sure.
  >
  > I built AcadeGrade so the arithmetic is never the hard part. You enter your results once, or scan the slip, and the numbers are always right and always explained.
  >
  > It is your record. It stays private, and you decide who sees it and for how long.
  >
  > If something is wrong or missing for your school, write to me. I read every message.
- **Phone:** the sheet runs edge to edge with 24px padding; the tear-off strip stacks the email above a full-width button.

### 5.8 Before you start (FAQ; blueprint: "Questions beside a tall photograph")

- **Layout:**
  - Columns 1–5: the heading "Before you start", then four facts at body size as plain lines:
    - "Free for students"
    - "On the web and on Android"
    - "For Nigerian universities, on the 5-point scale with PI"
    - "Your record stays private"
  - Then six questions as `Accordion` (24–28px between rows, no lines), and finally a primary button **Start your free record** and a text link "Read all questions on Support".
  - Columns 7–12: a tall photograph (IBBU Lapai lecture hall, 3:4) bleeding off the top edge and stopping 80px short of the bottom, with a square photograph (a library or notice board, found with `assets.mjs`) overlapping its lower-left corner by 40px.
- **Questions and answers** (these also feed the FAQPage JSON-LD):
  1. **Is AcadeGrade free?** Yes. Recording results, the calculator, the free tools, transcripts and the timetable are free. AcadeMind has free daily uses; on Android you can earn extra uses by watching a short ad.
  2. **Is this my official result?** No. AcadeGrade is your personal record, worked out from the results you enter. Your university's transcript stays the official one.
  3. **Which universities does it work for?** Nigerian universities that grade on the 5-point scale (A = 5 down to F = 0). If your school changes any band, your handbook is the final word.
  4. **What happens to my result slip when I scan it?** It is read to fill in your courses, you check every line, and nothing is saved until you confirm. Scanning is not available to students under 18.
  5. **Do I need the Android app?** No. Everything works on the website. The app adds timetable reminders that work offline and the result scanner on your camera.
  6. **Can I delete my account?** Yes, any time in Settings. Your records are removed; see Delete your account for what is kept for a short time and why.
- **Phone:** the tall photograph leads at 4:5 with the square overlapping its bottom-right; the facts and accordion run full width; the button is full width.

### 5.9 Start your record (CTA; blueprint: "The reply card")

- **Field:** `--pg-ink`, about 80svh.
- **Left** (columns 1–4, bottom-aligned 64px above the edge, paper ink at lead size): "Results come out whether you're ready or not. Be the one who already knows."
- **The reply card:** a paper card 44vw wide (7:5) in columns 6–12, rotated 2°, its lower edge hanging 60px below the section. Centred on it:
  - the heading "Start your record" at head size (capped 44px);
  - "About two minutes. Free, private and yours." at body size;
  - the action as a full-width ink bar, 56px: **Create your free record**;
  - under it a text link: "or try the calculator first".
- **Phone:** the paragraph comes first; the card is 90% wide, tilted 1°, its heading at 32px, and the action bar 52px.

### 5.10 Footer

The shared `PublicFooter` ("the back of the card"; `02` §4.3). The stamp photograph is the UNN gate; credits for all home photographs sit in the imprint line.

## 6. Imagery for this page

| Slot | Picture | Source and licence | Treatment |
|---|---|---|---|
| Hero frames | UNN main gate; UNN Faculty of Arts; a lecture theatre | Wikimedia Commons, CC BY-SA 4.0 (credit each) | Greyscale and indigo, 4:5 crop, AVIF under 180 KB for frame 1 |
| Showcase | FUT Minna lecture hall | Wikimedia Commons, by Baleegraphy, CC BY-SA 4.0 | Full bleed, scrim behind the text column |
| FAQ | IBBU Lapai lecture hall (tall); a library or notice board (square) | Wikimedia Commons (check the licence on download) | Same treatment |
| Footer stamp | UNN gate (crop) | as above | 3:4, 88px |
| Fragments | Real app screens (scanner review, AcadeMind analysis, timetable, transcript, what-if) | AcadeGrade's own interface | Built from the real components with the example student's data |
| Letter portrait | The owner's photograph | Supplied by the owner | Round, 44px |

Credit line (imprint): "Photographs: University Gate, UNN, by Favouridowu; FUT Minna Lecture Hall by Baleegraphy; … (CC BY-SA 4.0, via Wikimedia Commons; tinted)."

## 7. Motion on this page

- **Signature:** the slip is laid down (`03` §3.1), then the slow campus crossfade (§3.2).
- **Entrances:** every section uses the standard entrance, and the Scale bars enter one after another at 50ms.
- **Showcase:** the slips rise from below the edge with a 90ms stagger as the section enters; the photograph drifts.
- **Sheets:** sticky stacking, CSS only.
- **Proof:** the stubs drop in 16px with a 90ms stagger.
- **CTA:** the reply card settles with a spring.
- **Count:** at least 16 moving elements over load and scroll; all respect reduced motion and data saver.

## 8. Components

- **Used:** `PublicHeader`, `Slip` (result, receipt, letter, reply, stub), `Stripe`, `ArcMeter`, `GradeKeys`, `Accordion`, `UiFrame`, `Figure`, `Credit`, `Button`, `TextLink`, `SectionHeading`, `ProofStub`, `CountLine`, `CookieStub`, `PublicFooter`.
- **New data modules:**
  - `lib/public/home.ts`: copy, the example slip, FAQ.
  - `lib/public/scales.ts`.
  - `lib/public/credits.ts`.
  - `lib/public/proof.ts`: server read of approved testimonials and the count, with the threshold, and the admin preview flag.

## 9. SEO

- **Title:** "AcadeGrade: CGPA, GPA and degree class for Nigerian universities".
- **Description:** "Work out your GPA, CGPA and degree class from your result slip. Scan results, plan your next semester and share your transcript safely. Free on web and Android." (158 characters)
- **Canonical:** `/`.
- **Open Graph:** the hero slip with the headline.
- **JSON-LD:** `Organization`, `SoftwareApplication` (Android, Web; free; EducationalApplication) and `FAQPage` built from §5.8 (exactly the visible questions).
- **Headings:** a single h1 (the hero line) and an h2 for every section.

## 10. Accessibility

- **Live slip:** a real table with `<caption>` "Example result slip". The grade keys are radio groups labelled by the course ("Grade for CSC 301 Data Structures"); results are announced politely.
- **Arc meter:** a text alternative.
- **Sheets:** each sheet name is an h3, and focus order follows the visual order.
- **Photographs:** alt text describes the place ("The main gate of the University of Nigeria, Nsukka").

## 11. Carried over, replaced and removed

| Today | In the redesign |
|---|---|
| "See the path behind every result." + typewriter | The h1 "Know your CGPA. Know your class."; the typewriter is removed |
| Three stock/composite student photos (≈6 MB) | Real campus photographs (under 400 KB total on first load) and the live slip |
| `AcademicProof` deck with a live MTH 321 slider | The live hero slip (the same real engine) and the Scale section |
| Scanner and AcadeMind stories | Sheets 1 and 2 plus feature pages |
| "Record. Understand. Plan." rail | "Results day, sorted." itinerary |
| Android showcase with the owner's real profile | The Android app page and sheet 3; personal data removed |
| HomeFAQ (4) | "Before you start" (6) plus FAQPage JSON-LD |
| Context strip ("Session and level aware…") | Covered by the Scale section and the FAQ facts |
| Unlabelled 3.71 / 117 numbers | One consistent example student whose numbers add up |

## 12. Acceptance checklist

- [ ] Five-second test: a stranger says "it works out your CGPA and class from your results, for Nigerian universities".
- [ ] Live slip: the three pinned states compute exactly (4.15/4.43 → 4.49 → 4.53 First); keyboard-only works; the fallback renders without JavaScript.
- [ ] Phone: the h1, sentence and button are on the first screen at 390×844 with the cookie stub open.
- [ ] `inspect.mjs`: 0 FAIL at 1440/768/390, light and dark; `scenes.mjs`: no covered sheet names.
- [ ] Lighthouse mobile ≥ 90 ×4; LCP under 2.0s; first-load images under 400 KB.
- [ ] FAQ JSON-LD matches the visible FAQ exactly; every link resolves.
- [ ] Proof section absent in production with fewer than three approved quotes; visible with the SAMPLE quotes in admin preview.

## 13. Open items for the owner

1. Confirm or edit the founder letter and supply a portrait (or drop the portrait).
2. Record a 6–10 second screen video of scanning a slip on the phone (no personal data) for the showcase.
3. Choose the CountLine threshold (default 100).
4. Confirm the example student's courses (CSC, MTH, GST at 300L) or name another programme.
