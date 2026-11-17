# Page plan · Free tools hub (`/tools`, new)

This page inherits `01`–`04` and follows the exemplar `pages/home.md`; anything not stated here follows those files. It is an **Operate** page and a new route: today `/tools` is a 404 and the four tool pages are orphaned (audit `00` §3). The hub is where the header's **Free tools** link goes. It **leads with the CGPA calculator**, then sets out the four tools by the question each one answers, and every tool links back here.

Code today: `app/(public)/tools/ToolPage.tsx`, `tools-config.ts` (titles, descriptions, keywords, FAQs, `faqJsonLd`, `TOOL_PATHS`), `tool-math.ts`, `calculators.tsx`. The hub adds `app/(public)/tools/page.tsx`.

## 1. Purpose

- **Mode:** Operate (the visitor is choosing which sum to do, then doing it).
- **Visitor:** a student who tapped **Free tools** in the header or footer, followed a "More free tools" link from a tool page, or searched "CGPA tools" / "free GPA calculator Nigeria". Usually on a phone, often with a specific question already in mind.
- **First question:** "Which of these answers my question?" Answer in five seconds: *the calculator for a semester's courses; four quick tools for class, target, carry-over and average score; all free, all on the Nigerian 5-point scale, nothing saved.*
- **One action:** **Open the CGPA calculator** (`/calculator`).
- **Secondary (text links):** each of the four tools, "Open this example" (the calculator with the example loaded).

## 2. The argument

| # | Claim | Proof on the page | Section |
|---|---|---|---|
| 1 | The calculator is the main tool, and it works on a real slip | A printed result slip from the calculator, every figure computed | First screen (§5.1) |
| 2 | Each quick tool answers one question you already have | The four tools listed by their question, each with a worked answer | Four quick answers (§5.2) |
| 3 | They all speak your university's grading language | The grade bands, classes and PI, from the one live scale | The scale behind every tool (§5.3) |
| 4 | The doubts are answered (free? saved? official?) | Five answers, open on the page | Questions about the tools (§5.4) |
| 5 | When you want more than a quick sum, there is a record | One sentence and one action | Close (§5.5) |

## 3. First screen

### Desktop (1440×900)

- **Header:** the shared `PublicHeader`; **Free tools** carries `aria-current="page"`.
- **Blueprint:** the dealt hero "Striped card beside the room", adjusted. The printed card is the calculator's result slip and sits on the right; the "room" (the photograph) is replaced by the page's own text column on the left, because on an Operate page the words that route the visitor matter more than a picture on the first screen. Kept from the blueprint: the stripe band as the card's only ornament, the centred printed header on the card, one ink on paper, a single solid action.
- **Columns 1–5 (on the ground, top-aligned 64px below the header):**
  - **h1** at `--pg-display` (96px), two lines: "Free CGPA / tools".
  - 32px below, the **sentence** at lead, 34ch: "Work out your GPA and CGPA, check your class and see what next semester needs. Built for Nigerian universities. Free, and nothing you type is saved."
  - 40px below, three plain lines at body (no bullets, no icons), 12px apart: "No account needed" · "Nigerian university 5-point scale, with PI" (from `lib/public/scales.ts`) · "Personal estimates; your university's result is the official one".
- **Columns 7–12: the calculator slip** (`Slip` variant `result`, printed, `data-ui`, about 670px wide), top-aligned with the h1:
  1. Stripe band, 56px.
  2. Header, centred: the mark (24px); "CGPA calculator" at lead (an h2); the meta line at small: "Example · 300L Computer Science · 2025/2026 First Semester".
  3. A real `<table>` with `<caption>` "Example result slip from the CGPA calculator": Code · Course title · Units · Score · Grade · Point, five rows (§5.1 data), body size, tabular figures, 1px row lines inside the table.
  4. Perforation.
  5. Foot bar (ink): the headline figure on gold, "Semester GPA 4.15"; "PI 3.30" and "13 units" at lead; the class line "Class at this GPA: Second Class Upper"; a 160px `ArcMeter` with the dot at 4.15.
  6. On paper under the foot bar, centred: the primary button **Open the CGPA calculator** (52px), and beneath it the text link "Open this example" (`/calculator?m=score&c=…`, the example's link from `calculator.md` §5.1).
- **Nothing on the slip is interactive except the two links:** grades print as letters, not keys, so no visitor taps a grade that does nothing. The caption says it is an example.
- **At 1440×900** the h1, sentence, facts, the whole slip and the button are on the first screen (header 72 + 64 + slip about 720 = 856px).

### Phone (390×844)

- **Order:** h1 at 40px over two lines ("Free CGPA / tools"), the sentence at lead (20px), then the slip at full width inside the 16px margins, then the facts.
- **The slip on a phone:** 40px stripe; header; the table recomposed into two-line rows (line 1: code and point; line 2: title, then "3 units · 76 · A" at small in soft ink); the foot bar with the gold figure and class on row 1 and the arc meter full width (220px) on row 2; the button at full width; "Open this example" under it.
- **First screen at 390×844 with the cookie stub open:** h1, sentence and the top of the slip (stripe, header, first two rows). The button is on the second screen, after the slip shows what it does; this is deliberate (the slip is the explanation), and the header's own **Get started** is not a competing primary on this page (it stays a small header button by `02` §4.1).

### Why this works

- **Fast:** "Free CGPA tools" plus a working slip says what the page holds and that it is free before any scrolling.
- **Specific:** the first thing shown is a Nigerian result slip with real course codes and a 5-point result, not a grid of tool cards.

## 4. Copy deck (final wording; sentence case; two-line rule checked)

- **Title tag:** "Free CGPA tools for Nigerian universities" (template adds "| AcadeGrade").
- **h1:** "Free CGPA tools" (15 characters; two lines at 96px by design).
- **Sentence:** see §3 (148 characters).
- **Facts:** "No account needed" · "Nigerian university 5-point scale, with PI" · "Personal estimates; your university's result is the official one".
- **Slip:** h2 "CGPA calculator"; meta "Example · 300L Computer Science · 2025/2026 First Semester"; button "Open the CGPA calculator"; link "Open this example".
- **Section headings (h2):**
  1. "Four quick answers" (18)
  2. "The scale behind every tool" (27)
  3. "Questions about the tools" (25)
  4. Close: visually hidden h2 "Start your record"; visible sentence only.
- **Close sentence:** "When you want every semester kept in one place, start your free record." (13 words) Button **Start your free record** (`/register`); signed in: "Your record is waiting." with **Open dashboard**. Text link "Sign in" (signed out only).

## 5. Sections

### 5.1 First screen: the calculator leads (hero "Striped card beside the room", adjusted)

- **Example data** (the same example student as `calculator.md` and `home.md`; computed with `academicRules.ts` at build time and pinned in a test):

| Code | Course title | Units | Score | Grade | Point | Units × point | PI point × units |
|---|---|---|---|---|---|---|---|
| CSC 301 | Data Structures | 3 | 76 | A | 5 | 15 | 3.80 × 3 = 11.40 |
| CSC 303 | Operating Systems | 3 | 65 | B | 4 | 12 | 3.25 × 3 = 9.75 |
| MTH 301 | Numerical Analysis | 3 | 56 | C | 3 | 9 | 2.80 × 3 = 8.40 |
| CSC 305 | Computer Networks | 2 | 72 | A | 5 | 10 | 3.60 × 2 = 7.20 |
| GST 311 | Entrepreneurship | 2 | 61 | B | 4 | 8 | 3.05 × 2 = 6.10 |
| **Total** | | **13** | | | | **54** | **42.85** |

- **Results printed:** GPA 54 ÷ 13 = 4.1538 → **4.15**; PI 42.85 ÷ 13 = 3.2962 → **3.30**; class at this GPA **Second Class Upper** (`resolveDegreeClass(4.15)`).
- **Rendered on the server** (no client JavaScript for this section). The `ArcMeter` is static SVG with `role="img"` and the label "Semester GPA 4.15 of 5.00, Second Class Upper".
- **States:** none load from the network. Signed in: the button stays "Open the CGPA calculator" (the calculator itself offers Save to your record).
- **Analytics:** none here; the calculator fires its own events.

### 5.2 Four quick answers (blueprint `features-capabilities-as-a-menu`)

- **Why this blueprint:** four tools, each with one short answer, read naturally as a printed price list: name on the left, the answer on the right, a dot leader between. It is stationery, it is not a card grid, and it differs from the hero slip's table.
- **Ground:** `--pg-ground-2`, full bleed.
- **The sheet:** one paper sheet, 600px wide, in columns 2–6, taller than wide, top and bottom edges cut into a shallow zigzag (`zigzag(n, 10)`), sides straight, 48px padding.
  - Centred at the top: the h2 "Four quick answers" at `--pg-head` (capped at 56px on the sheet), then at small: "Each figure is a worked example from the tool." Then 40px.
  - **Group "Where you stand"** (body weight 500; 44px between groups):
    - **Degree class checker** ········ 4.43 → 2:1 — under the name at small, soft ink, 34ch: "Which class is my CGPA in, and how far is the next one?"
    - **Weighted average score** ········ 65.9 — "What is my average score out of 100, weighted by units?"
  - **Group "What comes next"**:
    - **Required GPA** ········ 3.68 needed — "What average do I need over my remaining units to reach my target?"
    - **Carry-over impact** ········ 3.10 or 3.25 — "What will retaking a failed course do to my CGPA?"
  - Each item is one link (`<a>` around name, leader and value; the name carries the text underline; the whole row is the 44px+ target). Values in tabular figures, right-aligned.
  - At the sheet's foot, centred, a text link: "Or work out a whole semester in the CGPA calculator".
- **Worked examples behind the values** (pinned in a test against `tool-math.ts`):
  - Degree class: CGPA 4.43 → Second Class Upper; First Class at 4.50 is 0.07 higher.
  - Weighted average: the example's five scores and units, (76 × 3 + 65 × 3 + 56 × 3 + 72 × 2 + 61 × 2) ÷ 13 = 857 ÷ 13 = 65.92 → **65.9**.
  - Required GPA: CGPA 3.38 after 90 units, 60 units left, target 3.50 → (3.50 × 150 − 3.38 × 90) ÷ 60 = (525 − 304.20) ÷ 60 = 220.80 ÷ 60 = **3.68**.
  - Carry-over: CGPA 3.00 over 60 units including a 3-unit F, retake graded A → added as extra units (180 + 15) ÷ 63 = 3.0952 → **3.10**; replacing the F (180 + 15) ÷ 60 = **3.25**.
- **Columns 8–12, beside the sheet (on the ground):**
  - Top-aligned with the sheet's heading, the four facts every tool shares, as plain lines at lead, 20px apart: "Answers appear as you type." · "Nothing you type is saved or sent." · "Nigerian university 5-point scale, with PI." · "Personal estimates, not official results."
  - Below them, 48px, a photograph at 4:3 filling columns 8–12, square corners, greyscale with the indigo cast: students learning at the Federal University of Technology, Owerri (§6). Caption at small: "Federal University of Technology, Owerri".
- **Built to grow:** the four items are generated from `TOOL_CONFIGS` (`tools-config.ts`, extended with `question`, `group` and `exampleValue`). A future tool adds one item; nothing else changes.
- **Phone:** the sheet fills the width minus 12px margins (so a sliver of ground shows each side) with 20px padding, keeping its zigzag edges; names left and values right on one line with the leader; questions wrap beneath at small. The facts follow the sheet; the photograph follows at full width, 4:3.

### 5.3 The scale behind every tool (blueprint `list-two-ended-rows`)

- **Why this blueprint:** the scale is a short reference list (grades, classes, PI). A narrow two-ended column reads like the back of a result slip, and it is quieter than the sheet above and the large-type FAQ below.
- **Ground:** `--pg-ground`.
- **Column:** 520px, starting at 22% of the viewport width. The h2 "The scale behind every tool" at `--pg-head`, then 32px, then the rows (44px pitch on all widths, no rules, no boxes):
  - **Grades** (one plain word in soft ink at body, 40px above the group):
    - ● A · 70 to 100 ········ 5 points
    - ● B · 60 to 69 ········ 4 points
    - ● C · 50 to 59 ········ 3 points
    - ● D · 45 to 49 ········ 2 points
    - ● E · 40 to 44 ········ 1 point
    - ● F · 0 to 39 ········ 0 points
  - **Classes:**
    - ● First Class ········ 4.50 to 5.00
    - ● Second Class Upper ········ 3.50 to 4.49
    - ● Second Class Lower ········ 2.40 to 3.49
    - ● Third Class ········ 1.50 to 2.39
    - ● Pass ········ 1.00 to 1.49
  - **Performance Index:**
    - ● PI ········ score ÷ 100 × 5, by units
  - The leaders shown here are for the plan only; on the page the two ends are joined by alignment and space (the blueprint draws nothing between).
  - **The dots** (16px, round, left of each name) are the brand stripe's steps: A and First Class `--pg-step-5` (gold), B and Second Class Upper `--pg-step-4`, C and Second Class Lower `--pg-step-3`, D and Third Class `--pg-step-2`, E and Pass `--pg-step-1`, F `--pg-mark`, PI `--pg-violet`. `aria-hidden`; the words carry the meaning.
  - Closing line at body, 32px below: "Most Nigerian universities use these bands. If yours differs, your handbook is the final word."
- **Columns 9–12:** a 4:5 photograph, top 80px below the first row: the front of the Institute of African Studies, University of Nigeria, Nsukka (§6), with its caption at small.
- **All rows come from `scales.ts`.** With one live scale there is no switcher; when a second scale goes live, a scale switcher appears above this list and the list re-renders for the chosen scale. No other scale is named before then.
- **Phone:** the column fills the width with 20px margins; values that do not fit wrap under the name at small, left-aligned with it; groups 32px apart; the photograph follows at 60% width on the right margin.

### 5.4 Questions about the tools (blueprint `faq-large-questions-answers-beside`)

- **Why this blueprint:** five answers stay open (nothing collapses, good for search), and the large questions work as an index. It differs from the narrow list above.
- **Ground:** `--pg-ground-2`.
- **Layout:** each pair is a row on the 12-column grid: the question in columns 1–6 at `--pg-head` (capped at 40px), weight 500, leading 1.1, two lines at most; the answer in columns 8–12 at body, leading 1.55, about 40ch, its first baseline level with the question's. 80px between rows. The h2 "Questions about the tools" sits as the first row's left cell at the same size in `--pg-on-ground-soft`, its right cell empty.
- **Questions and answers** (the FAQPage JSON-LD, word for word):
  1. **Are these CGPA tools free?** Yes. All five are free, need no account and work in any phone browser.
  2. **Which grading scale do they use?** The Nigerian university 5-point scale: A (70 to 100) is 5 points down to F (0 to 39) at 0, with classes from First Class (4.50 to 5.00) to Pass (1.00 to 1.49), and PI beside your GPA. If your handbook differs, it is the final word.
  3. **Do the tools save what I type?** No. The four quick tools save nothing: close the page and it is gone. The CGPA calculator keeps your courses only if you choose "Save to your record", and then only on your device for 24 hours while you sign up.
  4. **Which tool should I use?** The CGPA calculator for a semester's courses; the degree class checker if you know your CGPA; Required GPA to plan for a target class; Carry-over impact before a retake; the weighted average score if a form asks for an average score.
  5. **Are the results official?** No. They are personal estimates from the numbers you type. Your university's result and transcript are the official ones.
- **Phone:** each pair stacks: question at 24px (lead step), the answer 12px beneath at body, 56px before the next. The heading leads at 24px in soft ink. Answers stay open.

### 5.5 Close (blueprint `cta-plain-sentence-one-action`)

- **Layout:** on `--pg-ground`, no band, no panel; 30svh of ground above, 20svh below before the footer. On the page's left margin, the sentence at lead, 34ch: "When you want every semester kept in one place, start your free record." 24px below, the `sm` primary button **Start your free record** (`/register`), and on its baseline the text link "Sign in" (`/login`). Signed in: "Your record is waiting." and **Open dashboard**.
- **Phone:** sentence at 20px, 16px margins, button at natural width (44px), 20svh above and 14svh below.
- **This is the page's single rest screen.**

### 5.6 Footer

The shared `PublicFooter`. Its **Free tools** group (CGPA calculator, Degree class checker, Required GPA, Carry-over impact, Weighted average) is the second route here; "Free tools" in that group's heading links to `/tools`.

## 6. Imagery

| Slot | Picture | Source and licence | Treatment |
|---|---|---|---|
| First screen | The calculator's printed slip (`data-ui`) | AcadeGrade's own interface | Paper on the ground; no photograph on the first screen |
| §5.2 | "Learning at FUTO" (Federal University of Technology, Owerri), Commons id `63292084` | Wikimedia Commons, by Silverly 07, CC BY-SA 4.0, credit required | Greyscale and indigo, 4:3, AVIF under 120 KB, lazy |
| §5.3 | "Front of the Institute of African Studies, University of Nigeria, Nsukka" (`openverse:250ac9b8-9768-4bd8-8492-da6b8947a0b8`) | Wikimedia Commons, CC0 (credited anyway) | Greyscale and indigo, 4:5 crop, AVIF under 100 KB, lazy |
| Footer stamp | UNN gate | as `home.md` | 3:4, 88px |

- **Picture count:** one interface fragment (`data-ui`, 670×720) plus three photographs: four, with three real (inspector floor met).
- **Look before using:** open each download and reject it if it shows identifiable people in a way that could read as AcadeGrade's own users; it must read as the students' world.
- **Credit line:** "Learning at FUTO by Silverly 07 (CC BY-SA 4.0); Institute of African Studies, UNN (CC0); via Wikimedia Commons; tinted."

## 7. Motion

- **Signature (short version):** the calculator slip rises 24px with opacity and its stripe fills step by step (5 × 60ms), once per session; the arc meter's dot travels from 0.00 to 4.15 in 320ms after the stripe completes.
- **Entrances:** h1, sentence and facts enter with the standard 70ms stagger; the menu sheet's items enter 50ms apart; the scale rows enter by group; each FAQ row enters as a pair.
- **Feedback:** menu rows thicken their name's underline on hover and focus (2px → 3px); buttons as standard.
- **Photographs:** the §5.2 photograph drifts (scale 1.00 → 1.04 over its section's scroll, transform only); the moving picture of this page.
- **Count:** at least 16 moving elements over load and one scroll. Reduced motion and data saver: no travel, no drift, the dot drawn at 4.15.

## 8. Components

- **Used:** `PublicHeader`, `Slip` (`result` printed), `Stripe`, `ArcMeter`, `Button`, `TextLink`, `Figure`, `Credit`, `SectionHeading`, `Reveal`, `CookieStub`, `PublicFooter`. A small `MenuSheet`-style list is not a new component: it is the `Slip` variant `receipt` with the menu-row pattern (name, leader, value, description), shared with the receipt rows on the calculator.
- **Server component only:** the whole page is static (no client island beyond the shell's header, cookie stub and `Reveal`).
- **Data:**
  - `lib/public/scales.ts` (shape defined in `calculator.md` §8): the facts line, §5.3 rows, FAQ 2 thresholds.
  - `app/(public)/tools/tools-config.ts` extended: each tool gets `question`, `group` ("Where you stand" / "What comes next"), `exampleValue` and `example` inputs; the hub's values are computed from `example` with `tool-math.ts` at build time, so the sheet can never drift from the tools.
  - `lib/public/calculator.ts`: the example student (shared with the calculator).
  - `lib/public/tools-hub.ts`: hub copy and FAQ.

## 9. SEO

- **Title:** "Free CGPA tools for Nigerian universities" → "… | AcadeGrade".
- **Description:** "Free CGPA tools for Nigerian university students: a CGPA calculator, degree class checker, required GPA, carry-over impact and weighted average score." (150 characters)
- **Canonical:** `/tools`.
- **Open Graph:** the calculator slip on the ground with "Free CGPA tools" and the stripe.
- **JSON-LD:**
  - `CollectionPage` (name "Free CGPA tools", url `/tools`, `isPartOf` the site) with `mainEntity` an `ItemList` of five `ListItem`s in this order: CGPA calculator (`/calculator`), Degree class checker, Weighted average score, Required GPA, Carry-over impact (the sheet's order after the calculator), each with `name` and `url`.
  - `FAQPage` with exactly the five questions in §5.4.
  - `BreadcrumbList`: Home › Free tools.
  - Not `WebApplication`: the hub is an index; each tool page carries its own `WebApplication`.
- **Sitemap:** add `/tools` to `PUBLIC_SITEMAP_ROUTES` (`lib/seo/site.ts`) and extend `tests/unit/tool-pages.test.tsx` to expect it.
- **Internal links:** this page links to all five tools; every tool page links back here ("All free tools") and to the calculator; the calculator links to all four tools beside its result; the footer links all six.

## 10. Accessibility

- **Headings:** one h1 ("Free CGPA tools"); h2 for the slip ("CGPA calculator") and each section; the close has a visually hidden h2.
- **The slip table:** a real `<table>` with `<caption>`, `<th scope="col">` headers and numbers right-aligned; on phones the two-line rows keep the table semantics (CSS grid inside `tr` is avoided; the phone version is a `<dl>` per row rendered from the same data and the table is `display: none` below 640px, never both read).
- **Menu rows:** each is one link whose accessible name is the tool name plus the question ("Degree class checker: which class is my CGPA in, and how far is the next one?"); the example value is in the visible text but marked `aria-hidden` to keep the name short, and repeated in a visually hidden "Example: 4.43 is Second Class Upper."
- **Dots** in §5.3 are `aria-hidden`.
- **Photographs:** alt text describes the place: "Students in a lecture at the Federal University of Technology, Owerri"; "The front of the Institute of African Studies, University of Nigeria, Nsukka".
- **Targets:** every link row at least 44px; text never under 14px.

## 11. Carried over, replaced and removed

| Today | In the redesign |
|---|---|
| `/tools` returns 404 | New hub page |
| Tools reachable only from each other ("More free tools" list on `ToolPage.tsx`) and the sitemap | Header **Free tools** → `/tools`; footer Free tools group; calculator's Next questions; home sheet 5 links "Free tools" → `/tools` |
| Header "Calculator" link | Folded into Free tools (`04` §3); the calculator leads this hub and stays in the phone menu |
| `TOOL_CONFIGS` titles and descriptions | Reused for the menu items, extended with question, group and example |
| `TOOL_PATHS` and `PUBLIC_SITEMAP_ROUTES` | Kept; `/tools` added |
| "Track your results for free" outlined button on each tool page | The hub and tool pages close with one primary, **Start your free record** |

## 12. Acceptance checklist

- [ ] Five-second test: a stranger says "free CGPA tools for Nigerian students, starting with a calculator".
- [ ] The slip's figures equal the engine (GPA 4.15, PI 3.30, 13 units, Second Class Upper) and the sheet's four values equal `tool-math.ts` on the stored examples (4.43 → 2:1 with 0.07 to go; 65.9; 3.68; 3.10 / 3.25), each pinned in a test.
- [ ] Every one of the five tools is one click from this page, and every tool page links back here.
- [ ] `/tools` is in the sitemap; the JSON-LD (`CollectionPage` + `ItemList`, `FAQPage`, `BreadcrumbList`) validates and the FAQ matches the page.
- [ ] `inspect.mjs` 0 FAIL at 1440/768/390, light and dark (pictures: 1 `data-ui` + 3 photographs; one rest screen); `lint.mjs` and `impeccable detect` clean.
- [ ] Lighthouse mobile ≥ 90 ×4; no client JavaScript beyond the shell.
- [ ] No card grid, no icon tiles, no eyebrow, no pills, no mono, no numbering, no "coming soon".

## 13. Open items for the owner

1. **Photographs:** confirm "Learning at FUTO" and the Institute of African Studies front after seeing them (download with `assets.mjs --get`), or swap for another campus from the same search.
2. **Order of the four tools:** the sheet groups them as "Where you stand" (degree class, weighted average) and "What comes next" (required GPA, carry-over). Confirm, or order them by what students search for most once analytics shows it.
