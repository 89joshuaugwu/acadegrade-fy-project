# Page plan · AcadeMind (`/features/ai-insights`)

Inherits `01`–`04` and follows the template of `pages/home.md`. Anything not stated here follows those files. **The URL stays `/features/ai-insights`** (existing links and search results keep working); the page is titled and written as AcadeMind. The example student is the same as on the home, features and scanner pages; this page adds the four earlier semesters behind the home page's "74 units, 331 points".

## 1. Purpose

- **Mode:** Persuade.
- **Visitor:** a student who already tracks results (or is about to) and wonders what "AI" will do with their grades; often sceptical, sometimes under 18, often worried about data. Arrives from the home sheet "AcadeMind reads your record", the features page, or a search for "CGPA forecast" or "what GPA do I need".
- **First question:** "What does AcadeMind actually tell me, and is my record safe with it?" Answer within five seconds: *it writes a plain analysis of your semesters, forecasts your CGPA and answers what-if questions; you choose to switch it on*.
- **One action:** **Create your free record** (`/register`). Signed in, it reads **Open AcadeMind** (`/insights`).
- **Secondary (text links):** "How your data is handled" (`#data`), "Free uses each day" (`#free-uses`), "Next feature: Timetable".
- **Must say plainly:** guidance, not a verdict; free daily uses (live numbers) and, on Android, coins from short ads when coins are switched on; off for under-18s; off until the student allows AI processing; which providers read the data, in plain words.
- **Brand mark:** the AcadeMind logo (`public/acadegradeailogo.png`, to be vectorised to SVG per `01` §10). No sparkles, no robot clip art, no glow added by the page. The mark has a white mortarboard, so it always sits on `--pg-ink` or `--pg-violet`, never directly on paper; on paper it sits on a small ink square tile.

## 2. The argument (each section exists because of one claim)

| # | Claim | Proof on the page | Section |
|---|---|---|---|
| 1 | AcadeMind reads your record and writes about it in plain English | A real written analysis of the example student, on paper | Hero |
| 2 | It helps in three concrete ways | Written analysis, forecast and what-if, each with its real fragment and the facts about it | What it tells you |
| 3 | It knows its place | Four plain statements: your university decides; forecasts can be wrong; every answer is checkable; you switch it on | Guidance, not a verdict |
| 4 | It is free every day | The daily allowances set like a menu, with coins only when they exist | Free every day (`#free-uses`) |
| 5 | Your data is handled carefully and honestly | Six open answers: what is sent, who reads it, what is kept, consent, under-18s, wrong answers | Your data, in plain words (`#data`) |
| 6 | Trying it is easy | A last photograph with one line and one button | Close |

## 3. First screen

### Desktop (1440×900)

- **Composition** (blueprint `about-shaped-portrait-panel`, adjusted): one `--pg-ink` panel inset by the page margin (`--pg-margin`) on left, right and bottom, square corners (the page has one radius: 0), filling the viewport below the header, `overflow: hidden`.
- **Left half (56px padding):**
  1. Trail at `--pg-small` in the ground's soft ink on ink (`--pg-on-ground-soft` value `#A9A6C4`): "Features / AcadeMind".
  2. **The AcadeMind mark** at 88px with the name "AcadeMind" at `--pg-lead` in paper beside it (the brand line; it is not a heading).
  3. **h1** at `--pg-display` (capped 80px for the half), paper colour, two lines: "AcadeMind reads / your record."
  4. **Sentence** at `--pg-lead`, 40ch, 24px below (copy in §4).
  5. **Primary button**, paper with ink text (`02` §4.4, on ink fields): **Create your free record**.
  6. **Two text links** in paper: "Free uses each day" (`#free-uses`) and "How your data is handled" (`#data`).
- **Right half: the written analysis sheet.** A paper sheet 560px wide starting at 56% of the width, its top 120px below the panel's top, running past the panel's bottom edge so the panel crops its lowest fifth (the blueprint's shaped picture, here the product's own output). Content in §5.1.

### Phone (390×844)

- The panel is inset 12px and stacks: trail, mark at 56px with its name, h1 at 40px on two lines, sentence at 20px, full-width paper button, the two links. All of it fits the first screen with the cookie stub open.
- The sheet follows at 92% width, centred, cropped by the panel's bottom edge by a quarter of its height; a text link under the panel reads "Read the full example analysis" and expands it (native `details`).

### Why this works

- **Specific:** the visitor reads what AcadeMind would actually write about a believable 300L student, in full sentences that cite real courses and figures, instead of an abstract "academic signal" with invented labels.
- **Calm:** ink, paper and the brand mark; no sparkles and no glow, so it reads as a careful tool, not a gimmick.

## 4. Copy deck (final wording; sentence case; two-line rule checked)

- **Trail:** "Features / AcadeMind".
- **h1:** "AcadeMind reads your record." (28 characters; lines of 15 and 12)
- **Sentence:** "A written analysis of your semesters, a forecast of where your CGPA is heading, and what-if answers in plain English. Guidance to plan with, never a verdict." (157 characters)
- **Button:** "Create your free record"; signed in "Open AcadeMind".
- **Section headings (h2):**
  1. "What it tells you"
  2. "Guidance, not a verdict." (the first colour field's phrase)
  3. "Free every day"
  4. "Your data, in plain words"
  5. "Ask your record a question." (the close)
- **Disclaimer line** (the product's own, from `AI_DISCLAIMER`): "AI-generated. It can be wrong and isn't official academic advice."
- **Feature foot:** "Next feature: Timetable" · "Other features: Result scanner, Transcripts, Free tools, Android app".

## 5. Sections

### Example record used on this page (shared data, `lib/public/example-student.ts`)

| Semester | Session | Units | Points | Semester GPA | CGPA after |
|---|---|---|---|---|---|
| 100L First | 2023/2024 | 18 | 85 | 4.72 | 4.72 |
| 100L Second | 2023/2024 | 18 | 86 | 4.78 | 4.75 |
| 200L First | 2024/2025 | 19 | 72 (MTH 201: F) | 3.79 | 4.42 |
| 200L Second | 2024/2025 | 19 | 88 (MTH 201 passed on retake) | 4.63 | 4.47 |
| 300L First | 2025/2026 | 13 | 54 | 4.15 | 4.43 |
| **Total** | | **87** | **385** | | **4.43** |

- **Checks:** 85 + 86 + 72 + 88 = 331 over 74 units (CGPA 4.47, as on home); running CGPA 85/18 = 4.72, 171/36 = 4.75, 243/55 = 4.42, 331/74 = 4.47, 385/87 = 4.43. 200L First: the F carries 3 units at 0, so the other 16 units earned 72 points (an average of 4.50), which is believable. Semester GPAs are stored unrounded and only displayed to two places, as the engine does.
- **Story the page tells:** the student started at First Class pace, one F in MTH 201 pulled the CGPA into Second Class Upper, the retake helped, and MTH 301 (56, C) cost this semester. This matches home's slips ("MTH 201: passed on retake, 2024/2025"; "0.07 to First Class").

### 5.1 Hero: the written analysis

- **The sheet** (paper, square corners, 40px padding, rendered from the real Written Analysis component's four sections, restyled as stationery for the public page):
  - Header: the AcadeMind mark (24px) on its ink tile, "Written analysis" at `--pg-lead`, meta line at `--pg-small`: "Example · 300L Computer Science · after 2025/2026 First Semester".
  - Four headed paragraphs (h3 at `--pg-body` weight 500, text at `--pg-body`, 12px apart). The headings use sentence case in place of the app's Title Case labels:
    - **Strengths:** "Your Computer Science courses are consistently strong. CSC 301 (76) and CSC 305 (72) were both A this semester."
    - **Concerns:** "Mathematics is where you lose points. MTH 201 needed a retake in 200L, and MTH 301 is your lowest score this semester (56, C)."
    - **Recommendations:** "Give your extra reading hours to mathematics. Had MTH 301 been an A, this semester would have been 4.62 instead of 4.15."
    - **Degree outlook:** "Second Class Upper at 4.43, 0.07 below First Class. With three semesters left, an average of 4.67 gets you there."
  - Foot (perforation above it), at `--pg-small`: the disclaimer "AI-generated. It can be wrong and isn't official academic advice." and, as plain text, "Helpful · Not helpful · Report".
- **Checks** (pinned in a test): MTH 301 C→A adds 2 × 3 = 6 points: 60 ÷ 13 = 4.615 → 4.62; 4.50 − 4.43 = 0.07; required = (4.50 × 126 − 385) ÷ 39 = 182 ÷ 39 = 4.667 → 4.67 (three semesters of 13 units; required averages round up).
- **Honesty:** this is an example of the kind of text AcadeMind writes, in a fixed sample, not generated live on the public page; the meta line says "Example", like every sample on the site.

### 5.2 What it tells you (blueprint `features-pinned-heading-passing-rows`)

- **Field:** `--pg-violet`, full bleed, white text (white on violet about 5.8:1), as tall as its content.
- **Columns 1–5:** h2 at `--pg-display` (blueprint 56–104px), weight 500 (the type system has no heavier weight), `position: sticky; top: 104px` (header plus 32px): "What it tells you". It releases when the last block's bottom reaches it.
- **Columns 7–12:** three blocks, 120px apart. Each: a title (h3) at `--pg-lead`; then a two-part row: a real fragment (`UiFrame` on paper, portrait crop 3:4, 260px wide, square corners) and, top-aligned beside it, five short lines at `--pg-body` with 14px between lines. Fragments alternate left and right of their lines.

**Block 1 · Written analysis** (fragment: the Strengths and Concerns sections of the analysis above, cropped)
- "Strengths, concerns, recommendations and your degree outlook"
- "Built from your courses, scores and semesters"
- "Your name, email and reg. no. are removed before it is sent"
- "A fresh analysis at most every 12 hours"
- "{insights} free each day"

**Block 2 · Forecast** (fragment: the forecast panel in its CGPA view)
- "Where your CGPA and PI are heading if your pattern holds"
- "The projection is plain maths and works for every student"
- "AcadeMind adds a short trend note when you allow it"
- "Carry-overs still to clear are listed beside it"
- "{forecast} trend notes free each day"
- **Fragment data:** "Cumulative GPA projection"; a five-point line for 4.72, 4.75, 4.42, 4.47, 4.43 and two projected points; "Projected next semester CGPA **4.30**", then **4.21**; "Trend: slipping since 100L".
- **Checks:** least-squares line through x = 0…4 and y = 4.722, 4.750, 4.418, 4.473, 4.425 (unrounded running CGPAs): slope −0.087, prediction 4.296 → **4.30** at x = 5 and 4.209 → **4.21** at x = 6. With the rounded values the result is the same (4.30, 4.21). Pin with `computeForecast(piHistory, cgpaHistory)`.

**Block 3 · What-if** (fragment: the what-if panel)
- "Pick a target class and see the GPA you need"
- "Change the semesters left and your unit load"
- "The numbers work for every student"
- "AcadeMind adds a note on how to get there when you allow it"
- "{whatif} notes free each day"
- **Fragment data:** Current 4.43; Target CGPA 4.50 (First Class); Semesters left 3; Units per semester 13; **Required GPA 4.67**; Target average score **~93%**. AcadeMind note: "4.67 means an A in almost every course for three semesters. It can be done, but only if mathematics stops costing you points. Second Class Upper stays safe as long as you average 1.44 or more."
- **Checks:** 182 ÷ 39 = 4.667 → 4.67; 4.667 ÷ 5 × 100 = 93.3 → ~93%; Second Class Upper floor = (3.50 × 126 − 385) ÷ 39 = 56 ÷ 39 = 1.436 → 1.44 (rounded up).

- **Live values:** `{insights}`, `{forecast}`, `{whatif}` come from `config/usage` (`dailyLimits`; defaults 3, 8 and 20) through `lib/public/usage-public.ts`. If a value is 0 the line reads "Not available right now"; if the read fails the line reads "Free uses every day".
- **Phone:** the heading becomes a sticky bar at the top of the section (one line at 9vw on violet, 12px padding); each block stacks its title, the fragment at full width (4:3 crop), then the lines at 17px; 72px between blocks.

### 5.3 Guidance, not a verdict (blueprint `features-statements-on-colour-fields`)

- **Four full-bleed fields,** butted with no gap. Each is 64svh (shorter than the blueprint's 72–80svh on purpose: these are boundaries, and four full screens would over-weight them). Each holds one phrase at `--pg-display`, two lines at most, hugging the bottom-left corner (28px margins), and its explanation at `--pg-body` (30ch) near the top at column 8. Alternate fields mirror (phrase bottom-right, paragraph top-left at column 2). The first phrase is the h2; the other three are h3.

| Field | Text colour | Phrase | Explanation |
|---|---|---|---|
| `--pg-ground-2` | ink | Guidance, not a verdict. | "Your degree class is decided by your university, from its own records and rules. AcadeMind helps you think it through; it never decides." |
| `--pg-paper` | ink | Forecasts can be wrong. | "A forecast follows your past pattern. One strong semester changes it, and so can a course you haven't taken yet." |
| `--pg-ink` | paper | Check it against your record. | "Every answer sits beside the real numbers it came from, so you can check it line by line. Spot something wrong? Report it from the answer." |
| `--pg-gold` | ink | Yours to switch on. | "AcadeMind runs only if you're 18 or over and allow AI processing. Withdraw any time in Settings; your record and all the maths keep working." |

- **Phone:** fields 56svh; paragraph top-left at 16px across 80% width; phrase bottom-left at 13vw on two lines; mirroring dropped.

### 5.4 Free every day (`#free-uses`; blueprint `pricing-menu-list`)

- **Ground:** `--pg-ground`.
- **Columns 1–3:** h2 at `--pg-head` (blueprint 32–40px, capped 44px): "Free every day"; under it a small 4:5 photograph (three columns wide): the Kenneth Dike Library, University of Ibadan, captioned at `--pg-small`.
- **Columns 5–12:** the list in two text columns, 64px gap. Groups under names at `--pg-lead` weight 500 with 48px above each. Items: name left at `--pg-body`, value right on the same baseline (space between, no leaders, no lines), a one-line description under the name at `--pg-small` in soft ink (36ch). Rows 22px apart. Values use tabular figures.

**Group: Free each day** (live from `config/usage`; "a day" means any 24 hours)

| Name | Value | Description |
|---|---|---|
| Written analysis | {insights} a day | At most 2 an hour, and a fresh one every 12 hours |
| Forecast trend notes | {forecast} a day | At most 2 an hour |
| What-if notes | {whatif} a day | At most 3 in 5 minutes |
| Result scans | {ocr} a day | At most 5 in 15 minutes |

**Group: Always free, no limit**

| Name | Value | Description |
|---|---|---|
| Your record, GPA, PI and CGPA | Free | Every semester, every figure |
| What-if numbers | Free | The GPA you need for any target, worked out on your device |
| Timetables and Build with AcadeMind | Free | Rule-based, with no daily limit |
| Calculator and free tools | Free | No sign-up needed |

**Group: Extra uses with coins on Android** (rendered only when `coins.enabled` is true)

| Name | Value | Description |
|---|---|---|
| Earn coins | {coinsPerAd} per ad | Watch a short ad in the Android app, up to {dailyEarnCap} coins a day |
| Written analysis | {insights.price} coins | Up to {insights.dailyUseCap} extra a day |
| Forecast trend note | {forecast.price} coin(s) | Up to {forecast.dailyUseCap} extra a day |
| What-if note | {whatif.price} coin(s) | Up to {whatif.dailyUseCap} extra a day |
| Result scan | {ocr.price} coins | Up to {ocr.dailyUseCap} extra a day |

- Under the coins group, one line at `--pg-small`: "Coins can't be bought, and there is nothing to pay for. Coins aren't offered to accounts under 18."
- **When coins are off,** the third group is not rendered, and one line closes the list instead: "Used them all? Your free uses come back within 24 hours."
- **Value formatting:** singular "coin" for a price of 1. Per-feature coin rows render only when that feature's coin setting is enabled. Defaults today: 2 coins per ad, 10 a day; prices 2 / 1 / 1 / 3; daily caps 2 / 5 / 10 / 5 (`DEFAULT_COIN_POLICY`); the page never hard-codes them.
- **Why the forecast projection is not in the "no limit" group:** for a student who has switched AcadeMind on, the projection and its trend note come back from one request that counts against the forecast allowance (a cached result is free). Students without AcadeMind get the projection with a fixed label and no limit (`/api/ai/forecast`). Listing it as unlimited would be untrue for the first group, so the page says only "plain maths and works for every student" (§5.2).
- **Phone:** one column; the heading at 28px; the photograph at 60% width; each item keeps name left and value right at 17px with its description beneath; group names at 20px with 40px above.

### 5.5 Your data, in plain words (`#data`; blueprint `faq-large-questions-answers-beside`)

- **Ground:** `--pg-ground-2`. Every answer is open; nothing collapses.
- **Rows on the 12-column grid:** the question (h3) in columns 1–6 at `--pg-head` capped 40px, weight 500, leading 1.1, two lines at most; the answer in columns 8–12 at `--pg-body`, leading 1.55, about 40ch, its first baseline level with the question's. 72–88px of space between rows, nothing else.
- **The section heading** "Your data, in plain words" is set at the same size as the questions in soft ink, as the first row's left cell, with an empty right cell. It is the h2.
- **Rows** (these also feed the `FAQPage` JSON-LD, word for word):
  1. **What does AcadeMind see?** "Your courses, scores, grades, GPA, CGPA and programme details. Before a written analysis is sent, your name, email and registration number are removed. Forecast and what-if requests send numbers only."
  2. **Who reads it?** "AI providers that work for AcadeGrade: Google (Gemini), Groq, and OpenRouter, which may pass a request to another model provider. They are in the United States and other countries."
  3. **Do they keep it?** "Some keep request logs for up to 55 days to check for abuse. Where a provider lets us, we ask that your data is not used to train its models, and we ask OpenRouter to use only providers that don't collect it."
  4. **Is it on by default?** "No. AI processing stays off until you allow it, and you can withdraw in Settings, Privacy & AI choices, at any time. Withdrawing is as easy as allowing, and your record keeps working."
  5. **I'm under 18. Can I use it?** "AcadeMind, result scanning and coins are for students 18 and over. Everything else, from your CGPA to your timetables, works the same. When you turn 18, choose \"I've turned 18\" in Settings. Please make sure a parent or guardian knows you use AcadeGrade."
  6. **What if an answer is wrong?** "Tell us. Every answer has Helpful, Not helpful and Report. AcadeMind can be wrong; your record and your university's rules are the final word."
- **Under the rows,** a text link: "Read the AI section of the privacy notice" → `/privacy#ai-and-scanning`.
- **Source of truth:** answers 1–4 restate `lib/legal/builtin.ts` §"AI processing and result scanning" and §"Who we share information with"; answer 5 restates `MINOR_NOTICE` and the "I've turned 18" setting; answer 6 restates `AiDisclosure`. A test fails if the privacy notice's provider list changes and this page's answer 2 does not.
- **Phone:** each pair stacks: question at 24px, answer 12px beneath at 17px, then 56px of space; the heading leads at 24px in soft ink.

### 5.6 Close (blueprint `cta-photograph-text-one-half`)

- **Feature foot first,** on `--pg-ground-2` continuing from §5.5, 64px above the photograph: "Next feature: Timetable" (`/features/timetable`) at `--pg-lead`, then "Other features: Result scanner · Transcripts · Free tools · Android app" at `--pg-small`.
- **The photograph:** full bleed, 100vw × 90svh: the reading room of the University library, Nsukka, 1962 (archival, students reading), greyscale-indigo, darkened evenly with `filter: brightness(0.8)` if its right half is not calm enough; no panel behind the words.
- **Text** in columns 8–12, anchored to the lower third, paper colour:
  - h2 at `--pg-head` (blueprint "about 3.4vw", regular weight since the face has no light weight): "Ask your record a question."
  - Paragraph at `--pg-body`, three lines: "Add your semesters, allow AcadeMind when you're ready, and read your first analysis today. Free every day."
  - Button, paper with ink text, 52px: **Create your free record** (signed in: **Open AcadeMind**).
- The section butts the footer; the photograph's bottom edge is a hard line.
- **Caption/credit:** the picture's credit joins the footer imprint; a visually hidden caption names it for screen readers.
- **Phone:** the photograph at 100vw × 70svh; the text leaves the image and sits beneath it on `--pg-ink` (the footer card sits on the ground below, so the ink band is the "solid colour"): heading at 28px, paragraph at 17px, full-width button.

### 5.7 Footer

The shared `PublicFooter`.

## 6. Imagery for this page

| Slot | Picture | Source and licence | Treatment |
|---|---|---|---|
| Brand mark | AcadeMind logo | `public/acadegradeailogo.png` (vectorise to SVG with Adobe `image_vectorize`; today's PNG is 562 KB) | On ink or violet only; on paper, on an ink tile |
| Hero sheet and three fragments | Written analysis, forecast panel, what-if panel | AcadeGrade's own components with the example record | Paper sheet; `UiFrame` (inert, captioned) |
| Free every day | Kenneth Dike Library, University of Ibadan (`openverse:f38b686d-f6cb-4e74-bbd7-85a2b117f4aa`) | Wikimedia Commons, by Temilolub.52021, CC BY-SA 4.0, https://commons.wikimedia.org/w/index.php?curid=106285685 | Greyscale-indigo, 4:5, AVIF under 90 KB |
| Close | "University of Nsukka. Students … in the library reading room", 1962 (`commons:97066569`) | Wikimedia Commons, ASC Leiden, by Maarten van Dis, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:ASC_Leiden_-_NSAG_-_van_Dis_4_-_160_-_University_of_Nsukka._Students_in_western_clothes_in_the_library_reading_room_-_Nsukka,_Enugu_State,_South_East_Nigeria_-_22-30_January_1962.tif | Greyscale-indigo, 16:9 crop, AVIF under 180 KB. Fallback if the right half is busy: American University of Nigeria Library (`openverse:9ac2a5aa-f94f-4255-a182-0509135b41aa`, by Ojonugwa1, CC BY-SA 4.0) |

Credit line (imprint): "Kenneth Dike Library, UI, by Temilolub.52021; University of Nsukka library reading room, 1962, by Maarten van Dis / ASC Leiden (CC BY-SA 4.0, via Wikimedia Commons; tinted)." The archival photograph shows students of 1962 and is never presented as AcadeGrade users.

## 7. Motion on this page

- **Signature: the analysis is written.** Once per visit, the hero sheet rises 24px and its four sections appear in order, 120ms apart (opacity and an 8px rise; never a typewriter). Reduced motion: the sheet is simply present.
- **What it tells you:** the heading holds (CSS sticky); each block enters with the standard rise; the forecast fragment draws its line once (stroke-dashoffset from 100% to 0 over 640ms) and the two projected points appear last.
- **Colour fields:** each phrase rises 24px as its field enters; nothing else moves.
- **Free every day:** rows fade in 30ms apart; nothing counts up.
- **Data rows:** standard entrances.
- **Close:** the photograph drifts from scale 1.0 to 1.04 over the section's scroll (transform only); none under data saver.
- **Count:** at least 10 moving elements over load and scroll.

## 8. Components

- **Used:** `PublicHeader`, `Trail`, `UiFrame`, `Figure`, `Credit`, `Button`, `TextLink`, `SectionHeading`, `FeatureFoot`, `CookieStub`, `PublicFooter`.
- **New:**
  - `AcadeMindMark` (the vectorised logo with its ink tile variant; replaces every sparkles icon on public pages).
  - `InsetPanel` (hero panel with the cropped sheet).
  - `AnalysisSheet` (the written analysis as stationery, from the real component's sections).
  - `PinnedRows` (sticky heading with passing blocks).
  - `ColourStatements` (full-bleed statement fields).
  - `MenuList` (grouped name/value rows without leaders; renders live values and hides groups by rule).
  - `OpenQA` (large questions with open answers; feeds `FAQPage`).
  - `PhotoClose` (last photograph with text in one half).
- **Fragments:** `ForecastFragment`, `WhatIfFragment`, `AnalysisFragment`.
- **Data:** `lib/public/example-student.ts` (now including the four earlier semesters); `lib/public/academind.ts` (copy, blocks, statements, Q&A); `lib/public/usage-public.ts` (live allowances and coin settings).

## 9. SEO

- **Title:** "AcadeMind | AcadeGrade".
- **Description:** "AcadeMind writes a plain analysis of your semesters, forecasts your CGPA and answers what-if questions. Free daily uses, off until you allow it. 18 and over." (156 characters)
- **Canonical:** `/features/ai-insights` (unchanged URL).
- **Open Graph:** the AcadeMind mark beside "AcadeMind reads your record." on ink.
- **JSON-LD:** `BreadcrumbList` (Home › Features › AcadeMind) and `FAQPage` built from §5.5, exactly the visible questions and answers.
- **Keywords:** "CGPA forecast", "what GPA do I need", "first class target", "academic analysis".
- **Headings:** one h1; h2 per section; h3 for blocks, the later statement phrases and the questions.

## 10. Accessibility

- **Mark:** `alt="AcadeMind"` where it labels something; `alt=""` where the name is written beside it.
- **Hero sheet:** an `<article aria-label="Example written analysis">`; its four headings are h3; the "Helpful · Not helpful · Report" text is plain text, not fake buttons.
- **Forecast fragment:** `role="img"` with a full text alternative: "Running CGPA 4.72, 4.75, 4.42, 4.47, 4.43; projected 4.30 next semester and 4.21 after."
- **Sticky heading:** never covers block titles (offset includes the header); checked with `scenes.mjs`.
- **Colour fields:** contrast per field (ink on gold about 9:1; paper on ink about 16:1).
- **Menu list:** a `<dl>` per group; live values are plain text (no live region needed).
- **Q&A:** questions are h3, answers are paragraphs; no accordion, so nothing is hidden from search or screen readers.

## 11. Carried over, replaced and removed

| Today | In the redesign |
|---|---|
| Title "Turn academic history into better questions." + "AI-assisted explanations" | h1 "AcadeMind reads your record." with a real example analysis |
| `InsightPreview` with sparkles, invented labels (Trend Rising, Risk Review, Plan Ready) and a duplicated quote | The written analysis sheet with the product's real four sections and disclaimer; sparkles removed |
| Insight types: Trend context, Forward view, What-if planning | What it tells you: Written analysis, Forecast, What-if (the forecast block keeps "trend context") |
| "Guidance, not a verdict." checklist (4 points) | Kept as the first colour field; its four points become the four statements |
| "You choose when to use an AI-assisted feature" | "Yours to switch on." with the real consent and age rules |
| No limits, coins, providers or under-18 information | Free every day (`#free-uses`) and Your data, in plain words (`#data`) |
| `ProductCta` | The photograph close, plus the feature foot |
| Metadata "AI-assisted academic insights" | "AcadeMind \| AcadeGrade", same URL |
| `ShieldCheck`, `Sparkles` and other icon tiles | Removed; the AcadeMind mark is the only emblem |

## 12. Acceptance checklist

- [ ] Five-second test: a stranger says "it writes about your results, forecasts your CGPA and tells you what you need; you have to switch it on".
- [ ] The sample analysis, forecast (4.30, 4.21) and what-if (4.67, ~93%, 1.44) figures are pinned by unit tests against `academicRules` and `computeForecast`.
- [ ] Daily allowances show `config/usage` values; the coins group appears only when coins are on; a failed read shows numberless wording.
- [ ] The data answers match the privacy notice; `FAQPage` JSON-LD matches the visible Q&A exactly.
- [ ] No sparkles icon, no "AI-powered", no "illustrative" anywhere; the timetable builder is not mentioned as AI.
- [ ] Phone: h1, sentence and button on the first screen at 390×844 with the cookie stub open.
- [ ] `inspect.mjs`: 0 FAIL at 1440/768/390, light and dark; `scenes.mjs`: sticky heading never covers a block title; Lighthouse mobile ≥ 90 ×4.

## 13. Open items for the owner

1. Vectorise the AcadeMind logo to SVG (Adobe `image_vectorize`) and approve the result; the 562 KB PNG must not ship on public pages.
2. Approve the example analysis wording (it reads like AcadeMind's real output, but it is a fixed sample).
3. Confirm whether coins should be switched on before launch; the page hides that group while they are off.
4. Approve the 1962 Nsukka library photograph for the close, or choose the AUN library fallback.
