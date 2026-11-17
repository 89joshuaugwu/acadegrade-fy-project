# Page plan · About (`/about`)

Inherits `01`–`04` and follows the structure of `pages/home.md`. Anything not stated here follows those files.

## 1. Purpose

- **Mode:** Read, with a light Persuade close (`04` §1: Read/Persuade).
- **Visitors:**
  - a student who has used the calculator or heard about AcadeGrade and wants to know who is behind it before entering their results;
  - a parent, sponsor or scholarship officer who has been sent a shared transcript link;
  - a Google Play reviewer or a journalist checking who operates the app.
- **First question:** "Who makes this, and can I trust it with my results?" Answer within five seconds: *one person in Enugu runs it, it is built for Nigerian universities, it is free, and your record stays private.*
- **One action:** **Start your free record** (`/register`). Signed in: **Open dashboard**.
- **Secondary:** writing to us (support email or the in-app request), the Privacy notice, and the calculator, as text links only.
- **What About adds that home does not:** who runs AcadeGrade and where (the operator facts), the mission in the owner's words (admin text), how a figure is actually worked out line by line, the privacy commitments with the place each one is controlled, what AcadeGrade is not, and how to reach a person. It does **not** repeat home's live slip, scale bars, feature sheets or founder letter; it links to home for those.

## 2. The argument (each section exists because of one claim)

| # | Claim | Proof on the page | Section |
|---|---|---|---|
| 1 | AcadeGrade is a private academic record for Nigerian university students, made in Enugu | The owner's headline and description, four plain facts, the library at Nsukka | Intro |
| 2 | A real, named person runs it, for a stated reason | The operator facts (name, place, price) beside the mission paragraph, and what it covers | Who runs AcadeGrade |
| 3 | The numbers can be checked by hand | One course and one semester worked out on a printed working sheet that adds up | We show our working |
| 4 | Your record stays yours, and you hold the controls | Eleven commitments, each with the place you control it | Your record is yours |
| 5 | It does not pretend to be what it is not | Four "Not …" lines with the fact behind each | What AcadeGrade is not |
| 6 | A person answers | The email (or the in-app request), the support page and the place | Write to us |
| 7 | Starting is small and free | The inverted close with one button | Close |

## 3. First screen

### Desktop (1440×900)

- **Blueprint:** `intro-title-note-facts` (Title, note, facts row), the direction's own intro blueprint.
- **Ground:** `--pg-ground`. Section padding 96px top (the blueprint's 140px is shortened so the facts row lands on the first screen; deliberate), 120px bottom.
- **Row one** (top-aligned to the content column):
  - Columns 1–6: the **h1** at `--pg-display` (96px here), weight 500, leading 0.95, two lines: the admin headline (default "A private record, made in Enugu.").
  - 40px below the h1, still in columns 1–6: the primary button **Start your free record**, and 24px to its right the text link "Try the calculator first" (`/calculator`).
  - Columns 7–8 stay empty.
  - Columns 9–12: the note, the admin `platformDescription`, at `--pg-body`, held to 46ch, bottom-aligned so its last line sits on the h1's second baseline (`align-self: end`). A longer admin text simply grows upwards from that baseline; above six lines the row grows taller instead of overlapping anything. A screenshot test pins the default text at four lines at 1440.
- **Row two** (96px lower): four facts spread across the 12 columns with `justify-content: space-between`. Each fact is at `--pg-lead`, weight 500, with one explanation line under it at `--pg-small` in `--pg-on-ground-soft`, left-aligned to the fact. Facts are separated by space only.
- **Photograph** (starts 40px under the facts row, columns 8–12, 4:3, square corners): Nnamdi Azikiwe Library, University of Nigeria, Nsukka. A smaller tipped-in plate (the same library's reading room in January 1962, 3:4, 30% of the large photograph's width) overlaps its lower-left corner by 40px, with a 6px paper margin like a mounted print. Caption at small, under the pair, left-aligned to the large photograph: "Nnamdi Azikiwe Library, University of Nigeria, Nsukka; inset, the university library reading room in January 1962."
- **Above the fold at 900px:** header 72, padding 96, h1 182, gap 40, button 52, gap 96, facts row about 80, gap 40, then about 240px of the photograph. The h1, note, button and all four facts are visible.

### Phone (390×844)

- 48px padding top. The h1 at `--pg-display` (40px), two lines ("A private record," / "made in Enugu.").
- The note follows directly under it at body (17px), full width.
- The button at full width (52px), then the text link on its own line.
- The facts become a two-column grid with a 32px row gap, each fact at lead (20px) with its explanation beneath at small.
- The photograph pair goes last, full width at 4:3, the inset at 34% width overlapping its lower-right corner by 24px.
- **Budget:** header 60 + 48 + h1 76 + 24 + note about 150 + 24 + button 52 + 40 + facts about 190 = about 664px, so everything but the photograph fits with the 132px cookie stub open.

### Why this works

- **Fast:** the headline, the description and the button answer "what and who" in large type; the facts answer "where, for whom, how much, on what" without a paragraph.
- **Specific:** the photograph is a real library at the university closest to where AcadeGrade is made, and the 1962 inset says "Nigerian universities have a long record of their own" without claiming anyone in it as a user.

## 4. Copy deck (final wording; sentence case; checked against the two-line rule)

The four admin fields (`config/about`) keep working: what the admin saves always wins. The defaults below replace `DEFAULT_ABOUT_CONTENT` in `lib/about/content.ts`; they show only when the admin has never saved the About page or a field is blank. **The owner should re-save the About page in Admin > Settings > Public site with the wording he approves**, because the text already saved in Firestore will keep overriding these defaults.

- **h1** (`headline`, default): "A private record, made in Enugu." (32 characters; two lines of 17 and 14). The admin field allows 100 characters; plan an admin hint "Keep it under 32 characters so it fits on two lines" and a live counter (Admin > Settings > Public site). At more than 32 characters the page drops the h1 from `--pg-display` to `--pg-head`, so a long headline still fits on two or three lines without a sixth size.
- **Note** (`platformDescription`, default): "AcadeGrade works out your GPA, CGPA, PI and degree class from your semester results, on the 5-point scale Nigerian universities use, then helps you plan the next semester. It is free and private." (195 characters)
- **Button:** "Start your free record" (signed in: "Open dashboard"). Text link: "Try the calculator first".
- **Facts row:**
  - "Enugu State, Nigeria" / "Where AcadeGrade is made and run."
  - "Nigerian universities" / "The 5-point scale, with PI beside GPA."
  - "Free for students" / "No subscription and no payment details."
  - "Web and Android" / "The website works on iPhone too."
- **Mission** (`mission`, default): "Every Nigerian university student should know exactly where they stand: their GPA, their CGPA and their class, worked out correctly and explained course by course, without paying for it and without handing their record to anyone."
- **Trust statement** (`trustStatement`, default): "Your record is yours. It is private by default, you decide who sees it and for how long, and you can download it or delete it whenever you want."
- **Section headings** (h2):
  1. "Who runs AcadeGrade"
  2. "We show our working."
  3. "Your record is yours"
  4. "What AcadeGrade is not" (visually hidden; the poster lines carry it)
  5. "Write to us" (visually hidden; the sentence carries it)
  6. "Keep your record ready." (the close)
- Body copy for each section is written inside §5.

**Wording removed:** "Academic progress, made clear." (generic), "Clarity before complexity." (typewriter), "Progress, in context" with its "Private" pill and "Illustrative degree progress" chart (illustrative wording is banned on public pages), "Let's make academic progress easier to understand.", "Questions or partnership ideas are welcome.", "Showing our standard product information." (the error banner, which is no longer possible; see §5.1).

## 5. Sections

### 5.1 Intro (blueprint `intro-title-note-facts`)

- **Composition:** see §3.
- **Data:** `headline`, `platformDescription` from `config/about`, read **on the server** (see §8). No client fetch, so the h1 is in the first HTML and never changes after load: this removes today's hydration flash, where the default headline showed first and was then replaced by the saved one.
- **States:**
  - Firestore readable: the saved text.
  - Firestore unreadable or the document missing: the defaults from `lib/about/content.ts`, silently (a server log line, no visitor-facing banner). Today's "Showing our standard product information. Retry" box is removed: a visitor cannot fix a storage outage, and the defaults are complete, production copy.
  - Signed in: the button label and destination swap to "Open dashboard" (`/dashboard`) in the client island that the header already uses, at the same width.

### 5.2 Who runs AcadeGrade (blueprint `about-side-facts-wide-paragraph`)

- **Ground:** `--pg-ground-2`, full bleed, padding `--pg-gap-section`.
- **Row one** (shares one vertical line at 34% of the viewport width):
  - At the left margin, in a 200px column, the h2 "Who runs AcadeGrade" at lead, weight 500, and 32px below it three label and value pairs, 20px apart, each a label at small in `--pg-on-ground-soft` with its value beneath at small in full ink (the blueprint's 13px is raised to the small step, 14–15px):
    - "Run by" / "Joshua Chimaobie Ugwu"
    - "Based in" / "Enugu State, Nigeria"
    - "Price for students" / "Free"
  - From the 34% line to 90% of the width: the admin `mission` at `--pg-lead`, leading 1.35, about five lines. Directly under it, at small in soft ink: "Joshua Chimaobie Ugwu operates AcadeGrade as an individual. It is not a company and is not affiliated with any university." (both facts are in the Privacy notice and Terms; OWNER TO CONFIRM the sentence).
- **Row two** (120px lower), the record of what it covers:
  - At the far left, one plain word at small: "Covers".
  - From the 34% line, two list columns 300px wide with a 64px gutter, at small, 10px between lines, name at the left and value at the right in soft ink, tabular figures:
    - **Grading:** "5-point scale · A = 5 to F = 0"; "Degree classes · First Class to Pass"; "Performance Index · beside every GPA"; "Carry-overs · flagged until passed"; "Levels · 100L to 500L"; "Entry · direct entry and spill-over".
    - **Where:** "Website · any browser"; "Android · the AcadeGrade app"; "iPhone · the website in Safari"; "Free tools · no account needed"; "Transcripts · PDF and share links".
  - Each list is a `<dl>` (term = name, definition = value), introduced by its own word ("Grading", "Where") at small, weight 500.
- **Built to grow:** the "Grading" list is generated from `lib/public/scales.ts` (`01` §9). When a second scale goes live it adds its own line; nothing else changes. It never lists a scale that is not live.
- **Phone:** the h2, then the mission at 19px (lead), then the three pairs as a two-column grid at small, then the two lists stacked with 40px between them, each opened by its word in full ink.

### 5.3 We show our working (blueprint `list-printed-menu-sheet`, offset)

- **Ground:** `--pg-ground`.
- **Left, columns 1–5:** the h2 "We show our working." at `--pg-head`, then 32px below at lead: "Every figure in AcadeGrade can be checked with a pen. Here is one semester for our example student, worked out the way your record shows it." Then four principles as plain lines (no boxes, no icons), each a first line at body weight 500 and one sentence at body, 28px apart:
  1. **"The rules are printed, not hidden."** "The 5-point scale, the class bands and the PI formula are on the home page and in every free tool." (links: "home page" → `/`, or `/#scale` once the home Scale section carries that id; "free tool" → `/tools`)
  2. **"Every figure has its courses behind it."** "Open any GPA in your record and you see the courses and units that made it."
  3. **"One engine everywhere."** "The website, the Android app, the calculator and the free tools all use the same calculation code."
  4. **"Your handbook is the final word."** "If your university uses different bands, its rules apply. AcadeGrade is your personal record, not an official result."
- **Right, columns 7–12:** the working sheet, a paper panel 640px wide (`Slip` variant `letter`, without the tear-off strip), square corners, top and bottom edges cut into shallow scallops, 64px padding (28px on phones), set centred like a printed card:
  - Header, centred: the AcadeGrade mark (24px); "Working sheet" at lead; the meta line at small: "Example · 300L Computer Science · 2025/2026 First Semester".
  - **Group "One course"** (group name at lead, centred, 56px above), items at body with the value right-aligned on a 420px measure, a one-line description at small in soft ink under some names, 16px between items, no leaders:
    - "CSC 301 Data Structures" · "3 units"
    - "Continuous assessment" · "24 of 30"
    - "Examination" · "52 of 70"
    - "Total" · "76"
    - "Grade" (description: "70 to 100 is an A") · "A = 5 points"
    - "Units × points" · "3 × 5 = 15"
  - **Group "The semester"**:
    - "Units × points, five courses" (description: "15 + 12 + 9 + 10 + 8") · "54"
    - "Units taken" (description: "3 + 3 + 3 + 2 + 2") · "13"
    - "Semester GPA" (description: "54 ÷ 13") · "4.15"
    - "Performance Index" (description: "Each total ÷ 100 × 5, weighted by units: 42.85 ÷ 13") · "3.30"
  - **Group "The record"**:
    - "Before this semester" · "331 points, 74 units"
    - "CGPA" (description: "(331 + 54) ÷ (74 + 13) = 385 ÷ 87") · "4.43"
    - "Class" · "Second Class Upper"
    - "To First Class (4.50)" · "0.07 to go"
  - The highlighted figure: "4.43" sits on a gold fill (ink text), the one accent on this page.
  - Two centred closing lines at small: "Figures are rounded to two places, half up, and the class is read from the rounded CGPA." / "Your handbook decides if your school differs."
- **Sample data check** (the same example student as home §5.1; a unit test pins every line):

| Code | Units | CA | Exam | Total | Grade | Point | Units × point | PI point × units |
|---|---|---|---|---|---|---|---|---|
| CSC 301 | 3 | 24 | 52 | 76 | A | 5 | 15 | 3.80 × 3 = 11.40 |
| CSC 303 | 3 | | | 65 | B | 4 | 12 | 3.25 × 3 = 9.75 |
| MTH 301 | 3 | | | 56 | C | 3 | 9 | 2.80 × 3 = 8.40 |
| CSC 305 | 2 | | | 72 | A | 5 | 10 | 3.60 × 2 = 7.20 |
| GST 311 | 2 | | | 61 | B | 4 | 8 | 3.05 × 2 = 6.10 |
| **Total** | **13** | | | | | | **54** | **42.85** |

  GPA 54 ÷ 13 = 4.1538 → **4.15**; PI 42.85 ÷ 13 = 3.296 → **3.30**; CGPA 385 ÷ 87 = 4.4253 → **4.43** (`roundCgpa`, half up), Second Class Upper; 4.50 − 4.43 = **0.07**. Compute every value with `lib/cgpa/academicRules.ts` (`roundCgpa`, the semester and cumulative functions, `degreeClassFor…`), never as typed strings.
- **Phone:** the h2, the lead and the four principles come first; the sheet follows full width inside the 16px margins with 28px padding, keeping its scalloped edges; the measure is the full inner width and values stay right-aligned; long names wrap and the value aligns with the first line.

### 5.4 Your record is yours (blueprint `list-two-ended-rows`)

- **Ground:** `--pg-ground-2`.
- **Layout:** one column 640px wide starting at 22% of the viewport width (the blueprint's 520px widened for the longer commitments). The h2 "Your record is yours" at lead, weight 500, 32px above the first row; under it the admin `trustStatement` at body in full ink, held to 52ch, 32px above the first group.
- **Rows:** 44px minimum height, no box, nothing drawn between rows. Left: a 12px round dot in `--pg-step-1` (the arc's violet start; decorative, `aria-hidden`), then after 8px the commitment at body. Right end of the column: where you control it, at small in `--pg-on-ground-soft`, tabular figures. Groups are 40px apart and open with one plain word at body in soft ink. Long commitments wrap to two lines; the value aligns with the first line.
- **Rows (facts taken from the Privacy notice, Terms and the code; each one is true today):**
  - **Your record**
    - "Only you can see your record unless you share it" · "Private by default"
    - "Download everything you have entered" · "Settings → Privacy & AI choices" (link `/settings#privacy`)
    - "Delete your account and records at any time" · "Delete your account" (link `/account-deletion`)
  - **Sharing**
    - "Share links expire after 1, 7 or 30 days" · "You choose" (from `SHARE_EXPIRY_CHOICES`)
    - "Show a summary only, or protect a link with a PIN" · "When you create a link"
    - "Every shared record is labelled self-reported and unofficial" · "Always"
  - **AcadeMind**
    - "Off until you allow it, and only for students 18 or older" · "Settings → Privacy & AI choices"
    - "Your name, email and matric number are removed before a written analysis is requested" · "Written Analysis"
    - "A scanned slip is not kept after the scan; only the rows you confirm are saved" · "Result scanner"
  - **Money**
    - "We do not sell your information" · "Ever"
    - "Ads and ad cookies on the website only with your permission" · "Cookie choices" (link `#cookie-choices`, which reopens the cookie stub)
- **Foot line** (small, 40px below the last row): "The full detail is in the Privacy notice." (link `/privacy`).
- **Phone:** the column fills the width inside 16px margins; rows stay 44px or taller for touch; long values wrap beneath the commitment at small, left-aligned with it; group spacing 32px.

### 5.5 What AcadeGrade is not (blueprint `list-poster-lines`)

- **Ground:** `--pg-ground` (flat).
- **Heading:** h2 "What AcadeGrade is not", visually hidden (`sr-only`); the lines themselves read as the heading.
- **Lines:** four items, one per line at `--pg-display` (96px; the blueprint's 150px is mapped to the display step, the largest of the five), weight 500, sentence case (the blueprint's all-capitals is dropped: house type is sentence case), leading 0.92, flush left at the page margin. Each line's fact sits in columns 8–12 on the same first baseline at `--pg-lead`, wrapping to two lines if needed. The first line starts 80px below the section top and the last ends 80px above the bottom.
  - "Not official." · "Your university's transcript stays the official record. AcadeGrade is your own."
  - "Not affiliated." · "No university, and not the National Universities Commission, issues, verifies or endorses AcadeGrade."
  - "Not for sale." · "We don't sell your information, and there is no subscription. Coins can't be bought."
  - "Not a verdict." · "AcadeMind gives guidance. Your department and your adviser decide."
- **Semantics:** a `<ul>`; each item holds the line (`<p>` styled at display) and its fact (`<p>`).
- **Removed from the blueprint:** the hover swap to the accent (gold is a fill, never text; and Read pages keep hover for controls only).
- **Phone:** each line at display (40px), one per line, flush left at 16px; each fact moves beneath its line at body, with 6px above and 28px below. All four words fit at 40px on 358px ("Not affiliated." is the longest at about 300px).

### 5.6 Write to us (blueprint `contact-sentence-portrait-links`)

- **Ground:** `--pg-ground`, 160px above, 120px below.
- **Layout:** three elements hanging from one top line on the 12-column grid.
  - Columns 1–6: the sentence "Something wrong for your university? Tell us." at `--pg-head`, three lines, leading 1.0. (The blueprint's 12–18 words are cut to seven so the head step stays at three lines; deliberate.) The section's h2 "Write to us" is visually hidden; the sentence is a `<p>`.
  - Columns 8–9: one square photograph, 160px, square corners: the front of the Institute of African Studies, University of Nigeria, Nsukka.
  - Columns 10–12: the question "Write to a person" at body weight 500; 20px below, two underlined text links stacked at body; beneath them a line at small in soft ink.
- **Contact states** (from `getContactEmail()`: admin `config/about.contactEmail`, then `NEXT_PUBLIC_SUPPORT_EMAIL`, then none; this plan keeps that order exactly):
  - **Email set:** links "{email}" (`mailto:` with subject "AcadeGrade enquiry") and "Get help on the support page" (`/support`). Small line: "Enugu State, Nigeria. We reply by email, or in your AcadeGrade inbox when you write from your account."
  - **No email set:** links "Send a request from your account" (`/support#request`) and "Fix common problems" (`/support#quick-fixes`). Small line: "Enugu State, Nigeria. We reply in your AcadeGrade inbox and by email." The section never says an address "will be published" or anything else unfinished; it reads as a complete contact route.
- **Phone:** the sentence first at head (32px); below it the photograph at 96px square at the left margin with the question and the two links to its right, top-aligned; the small line spans the full width beneath.

### 5.7 Close (blueprint `cta-idea-restated-inverted`)

- **Field:** `--pg-ink` full bleed, at least 90svh on desktop, 80svh on phones; its top edge is a hard line against the section above. (Dark mode: the field stays `--pg-ink` `#18153D`, one step lighter than the night ground `#0E0C22`; the hard edge plus the 8px stripe above the footer keep it distinct.)
- **Headline** (h2) at `--pg-display` in `--pg-paper`, two lines, flush left, in the upper two-thirds: "Keep your record ready." (23 characters; echoes the hero's "record", does not repeat it).
- **Bottom row**, one shared baseline 40px above the edge: columns 1–5 the sentence at lead in paper ink, "Results come out whether you're ready or not. Your record takes about two minutes to start, and it's free."; columns 10–12 the primary button **Start your free record**, paper-filled with ink text (`02` §4.4, on ink fields; the blueprint's accent button is replaced because gold is the accent fill, not a button colour).
- **Signed in:** the button reads "Open dashboard".
- **Phone:** headline at display (40px) at the top; the sentence lower at body; the button full width at the bottom, 52px, inside 16px margins.
- **Footer:** `PublicFooter` follows; 160px of the ink field before the footer's stripe so the close reads as its own screen.

## 6. Imagery for this page

| Slot | Picture | Source and licence | Treatment |
|---|---|---|---|
| Intro, large | Nnamdi Azikiwe Library, University of Nigeria, Nsukka | Wikimedia Commons, by Udeagbala, CC BY-SA 4.0 (`openverse:af32be22-489e-4c3b-821b-52439c5d4a85`, https://commons.wikimedia.org/w/index.php?curid=56211168) | Greyscale and indigo, 4:3 crop, AVIF under 160 KB, lazy (it starts below the h1 and is not the LCP element) |
| Intro, inset | "University of Nsukka. Students in western clothes in the library reading room", 22–30 January 1962 | Wikimedia Commons, ASC Leiden, NSAG, van Dis 4 - 160, by Maarten van Dis, CC BY-SA 4.0 (https://commons.wikimedia.org/wiki/File:ASC_Leiden_-_NSAG_-_van_Dis_4_-_160_-_University_of_Nsukka._Students_in_western_clothes_in_the_library_reading_room_-_Nsukka,_Enugu_State,_South_East_Nigeria_-_22-30_January_1962.tif) | Already monochrome; same indigo cast; 3:4 crop; under 60 KB |
| Write to us | Front of the Institute of African Studies, University of Nigeria, Nsukka | Wikimedia Commons, by Bemanenough, CC0 (`openverse:250ac9b8-9768-4bd8-8492-da6b8947a0b8`, https://commons.wikimedia.org/wiki/File:Front_of_the_Institute_of_African_Studies,_University_of_Nigeria,_Nsukka.jpg); credited anyway | Square crop, 160px (320px at 2x), under 30 KB |
| Footer stamp | UNN gate (shared footer) | as home | as home |
| Working sheet | Drawn in code (the `Slip` letter variant and the AcadeGrade mark) | AcadeGrade's own | Paper on ground |

- **Rules:** none of these pictures is presented as AcadeGrade's users or rooms; the captions say what and where. The 1962 inset shows students from a public archive, captioned with its date, so nobody can mistake it for a testimonial.
- **Floor:** four real pictures on the page (three plus the footer stamp), which meets the tasteskill floor.
- **Credits:** the three new credits join `lib/public/credits.ts` and appear in the footer imprint line ("… Nnamdi Azikiwe Library, UNN, by Udeagbala; University of Nsukka library reading room, 1962, by Maarten van Dis (ASC Leiden) (CC BY-SA 4.0); Institute of African Studies, UNN, by Bemanenough (CC0); via Wikimedia Commons, tinted"), and in `docs/public-redesign/credits.md` on download.
- **Removed:** the `DegreeSignal` SVG chart ("Illustrative degree progress"), which was an invented trend with no data behind it.

## 7. Motion on this page

- **Mode rule:** Read page, so entrances only (`03` §5). No signature move beyond the short "laid down" on the working sheet.
- **Intro:** the h1, note, button and the four facts enter with the standard 70ms stagger (rise 24px, opacity, 640ms). The photograph pair enters last; the inset settles 120ms after the large photograph (rise 16px). The h1 is in the HTML and readable on the first frame (inspector `late-title`).
- **Who runs AcadeGrade:** the three pairs, then the mission, then the two lists, one after another at 70ms.
- **Working sheet:** the sheet is laid down (`03` §3.1 short version: rise and opacity; the sheet has no stripe band, so its three groups enter 60ms apart instead of the stripe steps). Figures do not count up: they are a worked example to be read, and they are final on the first frame.
- **Commitments:** rows rise 16px with a 40ms stagger per group.
- **Poster lines:** each line enters from 24px lower at 90ms intervals as the section reaches 15% visibility.
- **Write to us** and **Close:** standard entrance; nothing else moves.
- **Count:** about 30 moving elements over load and scroll (well above the inspector's 8; Read pages are not required to reach 16). Reduced motion and data saver: everything is shown in place with no travel.

## 8. Components

- **Used:** `PublicHeader`, `SectionHeading` (h2 plus lead), `Button`, `TextLink`, `Figure` and `Credit`, `Slip` (`letter` variant for the working sheet, with the scallop edge on both ends), `PublicFooter`, `CookieStub`, `Reveal`.
- **New, small, page-level pieces** (server components unless stated):
  - `AboutFacts`: the four-fact row (an `<dl>`: fact as `<dt>`, explanation as `<dd>`).
  - `SideFacts`: label and value pairs and the two `<dl>` lists.
  - `WorkingSheet`: renders the example from data, computed with the engine.
  - `CommitmentRows`: the grouped two-ended rows.
  - `PosterLines`: the "Not …" list.
  - `AuthAwareAction` (client island, shared with the header): swaps "Start your free record" to "Open dashboard" at the same width.
- **Data and server functions:**
  - **`lib/about/server.ts` (new):** `getAboutContent()` reads `config/about` with the Admin SDK inside `unstable_cache` (tag `site-about`, revalidate 300 seconds) and returns `normalizeAboutContent(data)`, or `DEFAULT_ABOUT_CONTENT` when the document is missing or the read throws (logged with `console.warn`, never thrown). The contact email still comes from `getContactEmail()` (`lib/site/contact.ts`) so every page resolves the address the same way.
  - **`app/(public)/about/page.tsx`** becomes an async **server component** with `export const revalidate = 300` and calls `Promise.all([getAboutContent(), getContactEmail()])`. The `'use client'` directive, `useEffect` fetch, `AbortController`, error state and retry button are removed. `metadata` moves from `about/layout.tsx` into the page (the layout file then returns its children only or is deleted).
  - **`app/api/about/route.ts` stays** unchanged: Admin > Settings > Public site loads the editable text from it (`PublicSiteSettings.tsx`), and the Android API client lists it.
  - **Freshness after an admin save:** `app/api/admin/settings/route.ts`, when `mutation.target === 'about'`, calls `revalidateTag('site-about')`, `revalidateTag(CONTACT_EMAIL_CACHE_TAG)` and `revalidatePath('/about')` after the write, so a saved headline or email shows at once (today the email can lag five minutes and nothing revalidates `/about`).
  - **`lib/about/content.ts`:** new default strings (§4); `normalizeAboutContent` and `resolveContactEmail` behaviour unchanged.
  - **`lib/public/about.ts` (new):** the facts row, the side facts, the "Covers" lists, the commitments, the poster lines and the working-sheet example (as course data, not as result strings).
  - **`lib/public/scales.ts`:** read by the "Grading" list.
  - **`lib/public/credits.ts`:** three new credits.

## 9. SEO

- **Title:** "About" (renders as "About | AcadeGrade" through the root template; today's "About AcadeGrade" renders as "About AcadeGrade | AcadeGrade").
- **Description:** "Who runs AcadeGrade, how your GPA, CGPA, PI and degree class are worked out, what happens to your data, and how to reach us. Made in Enugu State, Nigeria." (154 characters)
- **Canonical:** `/about`.
- **Open Graph:** generated with `next/og` in the house style: the working sheet's "4.43" line and the headline on paper over the ground, with the stripe.
- **JSON-LD:** `AboutPage` (`name`, `description`, `url`, `about: { "@id": "<site>/#organization" }`) referencing the `Organization` defined on home, with that `Organization` gaining `founder: { "@type": "Person", "name": "Joshua Chimaobie Ugwu" }` and `address: { "@type": "PostalAddress", "addressRegion": "Enugu", "addressCountry": "NG" }` (OWNER TO CONFIRM; see §13). No `aggregateRating`, no review markup.
- **Headings:** one h1 (the admin headline) and an h2 for every section (two visually hidden, both real headings in the outline).
- **Sitemap:** `/about` stays in `PUBLIC_SITEMAP_ROUTES`.

## 10. Accessibility

- **Headline length:** the h1 is never truncated; a long admin headline drops to the head step (§4).
- **Facts and lists:** `<dl>` with `<dt>`/`<dd>`; the screen reader hears "Run by, Joshua Chimaobie Ugwu".
- **Working sheet:** a `<section>` with its own h3 "Working sheet"; each group is an h4 followed by a `<dl>`; the arithmetic in descriptions is real text ("54 ÷ 13"), and the "÷" and "×" signs are read correctly by NVDA and TalkBack (tested); the gold-highlighted 4.43 is not the only signal (it is also labelled "CGPA").
- **Commitment rows:** the dots are `aria-hidden`; each row is an `<li>` containing the commitment and its control as text ("Download everything you have entered. Settings, Privacy & AI choices.").
- **Poster lines:** a list under a visually hidden h2; the large lines are `<p>`, not headings, so the outline stays clean.
- **Links:** every link names its destination ("Get help on the support page", not "here"); the `mailto:` link's text is the address.
- **Photographs:** alt text describes the place: "The Nnamdi Azikiwe Library building at the University of Nigeria, Nsukka"; "Students reading in the University of Nigeria library reading room, 1962"; "The front of the Institute of African Studies, University of Nigeria, Nsukka".
- **Contrast:** all text pairs from `01` §4. Checked for this page's grounds: soft ink on `--pg-ground-2` (`#4B4868` on `#DCD9E6`) 6.2:1, on `--pg-ground` 6.9:1; dark soft ink `#A9A6C4` on the night ground-2 `#17143A` 7.5:1. The violet row dots (`#5B52F2` on `#DCD9E6`, 3.8:1) are decorative and carry no meaning, so the 3:1 non-text minimum is enough.
- **Targets:** the button 52px; text links in rows have a 44px hit area.

## 11. Carried over, replaced and removed

| Today | In the redesign |
|---|---|
| Client component fetching `/api/about` after load, default headline flashing then swapping | Server component reading `config/about` through `getAboutContent()`, ISR 300s, revalidated on admin save; `/api/about` kept for admin and Android |
| Error banner "Showing our standard product information." with Retry | Removed; defaults render silently on a read error (server log) |
| h1 from `headline` with `DirectionalText` per-word motion | Same `headline` field, static h1 at display (head when long), standard entrance only |
| `platformDescription` paragraph | The intro note (same field) |
| Buttons "Build your academic record" + outlined "Try the calculator" | One primary "Start your free record" + text link "Try the calculator first" |
| `DegreeSignal` chart with "Private" pill and "Illustrative degree progress" | Removed (invented trend, pill badge, banned wording); replaced by the photograph pair and the real working sheet |
| "Clarity before complexity." typewriter heading + paragraph | Removed; the idea is carried by "We show our working." |
| Three icon-topped principle cards (One dependable record, Insight with context, Private by default) | "One dependable record" → the working sheet's principles 2 and 3; "Insight with context" (CGPA with PI and trends) → principle 1 and the sheet's PI line; "Private by default" → the first commitment row |
| "Our mission" icon card with `mission` | Who runs AcadeGrade, mission paragraph beside the operator facts (same field) |
| "Our commitment" icon card with `trustStatement` | Lead of "Your record is yours" (same field), followed by eleven concrete commitments |
| CTA panel "Let's make academic progress easier to understand." + "Contact AcadeGrade" (mailto or `/support`) | Split into "Write to us" (contact, keeps `contactHref` logic and the `/support` fallback) and the inverted close (sign-up) |
| `Navbar`, `LandingMotion`, `PageTransition`, `public-atmosphere` background | Public shell (`PublicHeader`, `PublicFooter`, `CookieStub`) and `Reveal` |
| Metadata in `about/layout.tsx` ("About AcadeGrade", generic description) | Metadata in the page ("About", new description), plus `AboutPage` JSON-LD |
| `tests/unit/about-page.test.tsx` (pins old classes and text motion) | Rewritten: server render with saved text, with defaults on read error, h1 present in the first HTML, contact link in both email states, working-sheet numbers from the engine |
| New | Operator facts, "Covers" lists, working sheet, commitments with controls, "What AcadeGrade is not", three campus photographs |

## 12. Acceptance checklist

- [ ] Five-second test: a stranger says "one person in Enugu makes it, it's for Nigerian university students, it's free and private".
- [ ] View-source of `/about` contains the saved admin headline in the h1; there is no client request to `/api/about` from the page; no text changes after hydration (Playwright: compare the h1 before and after `networkidle`).
- [ ] Saving the About text in Admin > Settings > Public site shows on `/about` within one request (revalidation), and the email change shows at once in the contact section, footer and legal pages.
- [ ] With Firestore unreachable (mocked), the page renders the defaults with status 200 and no visible error.
- [ ] Working sheet: every figure is computed by the engine; a unit test pins 4.15, 3.30, 4.43, "Second Class Upper" and 0.07.
- [ ] Contact section renders correctly with an email (mailto with subject) and without one (links to `/support#request` and `/support#quick-fixes`); no unfinished wording in either state.
- [ ] No pills, eyebrows, icon cards, gradients, glass, shadows at rest, monospace or 01/02 numbering; five type steps only (lint and `inspect.mjs`: 0 FAIL at 1440/768/390, light and dark).
- [ ] Phone: the h1, note, button and facts fit on the first screen at 390×844 with the cookie stub open.
- [ ] Lighthouse mobile ≥ 90 ×4; LCP is the h1 text (no image on the critical path); first-load images under 250 KB.
- [ ] `AboutPage` JSON-LD validates; every link resolves; `/about` is in the sitemap.

## 13. Open items for the owner

1. **Approve the wording** of the new defaults (headline, description, mission, trust statement), then **re-save the About page** in Admin > Settings > Public site, because the saved Firestore text overrides the defaults.
2. **Confirm the operator facts** shown publicly: "Run by Joshua Chimaobie Ugwu", "Based in Enugu State, Nigeria", and the line "operates AcadeGrade as an individual. It is not a company and is not affiliated with any university." These already appear in the legal texts; confirm you want them on About and in the `Organization` JSON-LD (`founder`, `addressRegion`).
3. **Reply time:** if you want to state a usual reply time in "Write to us" (for example "usually within two working days"), give the figure; otherwise the line stays without one. Nothing is invented.
4. **Headline field limit:** approve adding the "under 32 characters" hint and counter to the admin headline field (the field keeps its 100-character maximum).
5. **Founder letter:** the letter stays on home only (About does not repeat it). If you would rather have it here instead of on home, say so; the "Who runs AcadeGrade" section would then take the letter's sheet and the facts would move into its tear-off strip.
