# Page plan · Timetable (`/features/timetable`, new)

Inherits `01`–`04` and follows the template of `pages/home.md`. Anything not stated here follows those files. **New page:** add `/features/timetable` to `PUBLIC_SITEMAP_ROUTES`, to the footer's Product group (already listed in `02` §4.3) and to the home sheet 3 link. The example student is the same 300L Computer Science student as on the other pages; the reading plan below is the real output of `buildStudyPlan` (`lib/timetable/engine.ts`) for the stated inputs, run on 17 Nov 2026.

## 1. Purpose

- **Mode:** Persuade.
- **Visitor:** a student juggling lectures, reading and exams who wants one timetable that reminds them, often after missing a class or before exams; usually on an Android phone with patchy data. Also existing users who saw "Build with AcadeMind" and want to know what it does.
- **First question:** "Can it hold my lecture timetable and remind me, even without data?" Answer within five seconds: *your week in one place, a reading plan built around your lectures, and reminders on your Android phone, with or without data*.
- **One action:** **Create your free record** (`/register`). Signed in, it reads **Open your timetables** (`/timetable`); when the `timetable` switch is off it reads **Open dashboard** instead, so the button never lands on the paused notice.
- **Secondary (text links):** "Get the Android app" (`/app`), "Next feature: Result scanner".
- **Must say plainly:** fixed, reading and custom timetables; valid for hours, days, weeks or months with an ending-soon notice and **Extend**; edit any time; the six Build with AcadeMind questions; up to 3 reminders per event, 10 minutes by default; reminders are an Android feature and work offline; the battery tip; on the web, a calendar file (.ics). **The builder is rule-based and is never called AI, smart or machine learning.**

## 2. The argument (each section exists because of one claim)

| # | Claim | Proof on the page | Section |
|---|---|---|---|
| 1 | Your whole week sits in one timetable, with a reminder before each event | A real week: lectures and reading sessions by day, each with its reminder time | Hero |
| 2 | There is a kind for every job | Fixed, reading and custom, each with a real fact | Three kinds |
| 3 | AcadeMind builds a reading plan from six plain questions | The questions as a coupon, filled in with the example answers | Build with AcadeMind |
| 4 | The plan follows rules you can read | The real output: sessions per subject that add up, and the rules it followed | It shows its working |
| 5 | A timetable lasts as long as you say, and you can extend it | The four lengths with their notices, and the Extend panel | As long as you need it |
| 6 | Reminders reach you, even offline; the web has a calendar file | The Android notification in a lecture hall; the .ics download | Reminders |
| 7 | The doubts are answered | Seven open answers | Timetable questions |
| 8 | Starting is small | Three photographs and one underlined phrase | Close |

## 3. First screen

### Desktop (1440×900)

- **Composition** (blueprint `list-day-tabs-banded-agenda`): on `--pg-ground`.
- **Top row:**
  - Trail at `--pg-small`: "Features / Timetable".
  - **h1** at `--pg-display` (capped 88px) in two lines, the first in soft ink, the second in full ink: "Your week, / on time."
  - **Primary button** on the same row at the far right, aligned to the h1's last baseline: **Create your free record**.
  - **Sentence** at `--pg-lead`, 52ch, under the h1 (the blueprint has no sentence; one is added so the first screen says what the page is): "Put in your lectures and exams, let AcadeMind build a reading plan around them, and get a reminder before each one on your Android phone."
  - Text link under the sentence: "Get the Android app" (`/app`).
- **The agenda, 56px below** (a live but local component, §5.1):
  - **Left, 150px column:** six day tabs, each a filled block 150×64px with 6px gaps, weekday at `--pg-body`, date at `--pg-small`: Mon 30 Nov, Tue 1 Dec, Wed 2 Dec, Thu 3 Dec, Fri 4 Dec, Sat 5 Dec. Monday is active: ink fill, paper text. Others: `--pg-ground-2`.
  - **Right, from 190px to the margin:** Monday's events as alternating tone bands (`--pg-paper` and `--pg-paper-2`), 76px tall, square corners, 4px gaps. Fixed columns inside a band: the time range at `--pg-lead` with tabular figures, 20px from the left; at 22% the title at `--pg-body` weight 500 with a one-line note at `--pg-small` in soft ink under it; right-aligned at `--pg-small` the reminder time, and under it the timetable's name.
  - The agenda's lower bands run below the fold.

### Phone (390×844)

- h1 at 40px on two lines, the sentence at 20px, then the full-width button (52px), then the link. All on the first screen with the cookie stub open.
- The day tabs become one horizontal row of six equal filled blocks (weekday over date at 15px), sticky under the header while the agenda is in view.
- Each band stacks time over title over note, with the reminder time at its top-right; 16px padding; bands grow to fit.

### Why this works

- **Specific:** a real Nigerian 300L week (CSC 301 in LT 2 at 9:00, a Lab 3 practical, evening reading) is the picture, not an abstract calendar grid.
- **Answers the question at once:** the reminder time sits on every band, so "does it remind me?" is answered by looking.

## 4. Copy deck (final wording; sentence case; two-line rule checked)

- **Trail:** "Features / Timetable".
- **h1:** "Your week, on time." (19 characters; lines of 10 and 8)
- **Sentence:** see §3 (138 characters).
- **Button:** "Create your free record"; signed in "Open your timetables" (or "Open dashboard" when the timetable switch is off).
- **Section headings (h2):**
  1. "Three kinds of timetable" (visually hidden; the field names carry the section)
  2. "Build with AcadeMind"
  3. "It shows its working"
  4. "As long as you need it"
  5. "A reminder before every class"
  6. "Timetable questions"
  7. "Put your week in one place" (visually hidden; the close's underlined phrase is the visible action)
- **Feature foot:** "Next feature: Result scanner" · "Other features: AcadeMind, Transcripts, Free tools, Android app".

## 5. Sections

### Example data used on this page (`lib/public/example-timetables.ts`)

**Fixed timetable** "300L First Semester lectures": kind `fixed`; valid for 3 months from Mon 2 Nov 2026 (`validityEnd('2026-11-02', 'months', 3)` = `2027-02-01T23:59:59`, shown as "until Mon 1 Feb 2027"); default reminders `[10]`.

| Event | Type | Code | Days | Time | Venue |
|---|---|---|---|---|---|
| Data Structures | lecture | CSC 301 | Mon | 09:00–11:00 | LT 2 |
| Numerical Analysis | lecture | MTH 301 | Mon | 12:00–14:00 | Maths Hall |
| Operating Systems | lecture | CSC 303 | Tue | 10:00–12:00 | LT 1 |
| Entrepreneurship | lecture | GST 311 | Tue | 14:00–15:00 | Faculty Hall |
| Computer Networks | lecture | CSC 305 | Wed | 08:00–10:00 | LT 2 |
| Numerical Analysis tutorial | class | MTH 301 | Wed | 13:00–14:00 | Maths Hall |
| Operating Systems | lecture | CSC 303 | Thu | 09:00–10:00 | LT 1 |
| Computer Networks practical | class | CSC 305 | Thu | 16:00–18:00 | Lab 3 |
| Data Structures | lecture | CSC 301 | Fri | 10:00–11:00 | LT 2 |

**Reading timetable** "Exam reading plan": kind `reading`, `builtWith: 'academind'`; valid for 2 weeks from Mon 30 Nov 2026 (`validityEnd` = `2026-12-13T23:59:59`, shown as "Valid for 2 weeks, until Sun 13 Dec 2026"); default reminders `[10]`.

**Builder input** (exactly what was run):

| Subject | Code | Priority | Difficulty | Exam date |
|---|---|---|---|---|
| Numerical Analysis | MTH 301 | High (3) | High (3) | Fri 11 Dec 2026 |
| Operating Systems | CSC 303 | High (3) | Medium (2) | Wed 9 Dec 2026 |
| Data Structures | CSC 301 | Medium (2) | Medium (2) | Mon 14 Dec 2026 |
| Entrepreneurship | GST 311 | Low (1) | Low (1) | none |

- Days Monday to Saturday; one shared window 16:00–20:00; sessions of 60 minutes with 10-minute breaks; sessions per day **per day**: Mon–Fri 2, Sat 3; busy times filled from the fixed timetable (only Thu 16:00–18:00, Lab 3, falls inside the window); plan from 30 Nov to 13 Dec.

**Builder output** (`buildStudyPlan`, verbatim):

- Warnings: "Only 23 of 24 requested sessions fit around your lectures and exams."
- Why it looks this way:
  - "23 study sessions of 60 minutes were placed over 12 days, around your lectures and exams."
  - "Subjects with a higher priority or difficulty get more sessions, and a subject with an exam coming up soon gets extra."
  - "Data Structures: 6 sessions (priority 2, difficulty 2, exam on 2026-12-14)."
  - "Entrepreneurship: 2 sessions (priority 1, difficulty 1)."
  - "Numerical Analysis: 10 sessions (priority 3, difficulty 3, exam on 2026-12-11)."
  - "Operating Systems: 5 sessions (priority 3, difficulty 2, exam on 2026-12-09)."
  - "2 days are lighter because an exam follows the next day."
  - "No subject is repeated straight after itself, and no subject is studied on or after its exam day."
- Sessions, week one (week two continues in the same way to Sat 12 Dec):

| Day | 16:00–17:00 | 17:10–18:10 | 18:00–19:00 / 18:20–19:20 |
|---|---|---|---|
| Mon 30 Nov | Numerical Analysis | Operating Systems | |
| Tue 1 Dec | Numerical Analysis | Operating Systems | |
| Wed 2 Dec | Numerical Analysis | Operating Systems | |
| Thu 3 Dec | (Lab 3 practical) | | Numerical Analysis, 18:00–19:00 |
| Fri 4 Dec | Numerical Analysis | Data Structures | |
| Sat 5 Dec | Numerical Analysis | Operating Systems | Data Structures, 18:20–19:20 |

- **Checks:** 10 + 6 + 5 + 2 = 23 sessions; requested = 2 weeks × (5 × 2 + 3) = 26, less one each on Tue 8 Dec and Thu 10 Dec (the days before the CSC 303 and MTH 301 exams) = 24; Thu 3 Dec fits only one session after the practical, so 23 of 24. No Operating Systems session on or after Wed 9 Dec; no Numerical Analysis on or after Fri 11 Dec.
- **Built at build time:** the page imports the engine and computes this output during the build (a pure function, no network), so the public example can never drift from the real rules. A unit test pins the totals above.

### 5.1 Hero: the week (blueprint `list-day-tabs-banded-agenda`)

- **Bands for each tab** (titles are the event titles; notes give code, venue and timetable):

| Tab | Time | Title | Note | Right |
|---|---|---|---|---|
| Mon 30 Nov | 09:00–11:00 | Data Structures | CSC 301 · LT 2 · Lecture | Reminder 08:50 · 300L lectures |
| | 12:00–14:00 | Numerical Analysis | MTH 301 · Maths Hall · Lecture | Reminder 11:50 · 300L lectures |
| | 16:00–17:00 | Study: Numerical Analysis | MTH 301 · Built with AcadeMind | Reminder 15:50 · Exam reading plan |
| | 17:10–18:10 | Study: Operating Systems | CSC 303 · Built with AcadeMind | Reminder 17:00 · Exam reading plan |
| Thu 3 Dec | 09:00–10:00 | Operating Systems | CSC 303 · LT 1 · Lecture | Reminder 08:50 · 300L lectures |
| | 16:00–18:00 | Computer Networks practical | CSC 305 · Lab 3 · Class | Reminder 15:50 · 300L lectures |
| | 18:00–19:00 | Study: Numerical Analysis | MTH 301 · Built with AcadeMind | Reminder 17:50 · Exam reading plan |

  The other four tabs follow the same tables (fixed events plus the reading sessions in §"Example data").
- "Built with AcadeMind" is plain text in the note (the app's gold pill tag is not used on public pages: no pill badges).
- **Behaviour:** the tabs are a `role="tablist"` client island; arrow keys move between days; choosing a day crossfades its bands (160ms). Without JavaScript, Monday shows and the other days are listed below it under plain day headings.
- **Reminder times** are computed with `reminderTimes(occurrence, [10])` from the engine, not typed by hand.

### 5.2 Three kinds of timetable (blueprint `pricing-two-plans-two-fields`, adapted to three fields)

- **Three full-height colour fields,** 80svh, meeting at hard vertical edges with no gap, bleeding to the viewport edges; unequal widths say which matters most: **Fixed** columns 1–5 (`--pg-ink`, paper text), **Reading** columns 6–9 (`--pg-violet`, white text), **Custom** columns 10–12 (`--pg-gold`, ink text).
- **Inside each,** on a shared grid: the name (h3) at `--pg-head` top-left with 40px padding; one sentence at `--pg-lead` beneath it, 26ch at most; anchored bottom-left, a figure at the Display step with a caption at `--pg-small` beside or under it. No buttons (one action per screen; the fields are explanations).

| Field | Name | Sentence | Figure | Caption |
|---|---|---|---|---|
| Ink | Fixed | "Lectures, classes and exams you type in once. They repeat every week until the timetable ends." | Mon 09:00 | "Data Structures, LT 2, every Monday" |
| Violet | Reading | "Your own study sessions. Type them in, or let AcadeMind build them around your lectures." | 23 | "sessions in a two-week exam plan" |
| Gold | Custom | "Anything else on a schedule: fellowship, gym, a weekend shift." | 10 | "timetables you can keep, each with up to 300 events" |

- **Facts:** `KINDS = ['fixed', 'reading', 'custom']`; `TIMETABLE_LIMITS.maxTimetables = 10`, `maxEvents = 300`.
- **Phone:** the fields stack, each 60svh, Fixed first; name at 12vw, sentence beneath, figure at 24vw bottom-left with its caption.

### 5.3 Build with AcadeMind (blueprint `contact-clip-out-coupon`)

- **Ground:** `--pg-ground`, 120px above and below the card.
- **The coupon:** one `--pg-violet` card about 2.2:1 spanning columns 2–11, square corners (the blueprint's 14px radius becomes 0). Semicircular notches 28px across cut into its top and bottom edges at the 46% mark; a vertical perforation of round 5px dots in the ground colour joins them.
- **Left of the perforation** (48px padding, white text):
  - h2 at `--pg-head` (capped 44px), sentence case and weight 500 (the blueprint's heavy capitals do not exist in this type system): "Build with AcadeMind".
  - At the bottom, `--pg-body`: "Answer six questions and AcadeMind lays out reading sessions around your lectures, by clear rules you can read. Change anything before you save."
  - Under it at `--pg-small`: "Free with no daily limit, and open to every student, including under-18s."
- **Right of the perforation:** six filled blocks (paper, ink text), each at least 52px tall with 10px gaps, set as a `<dl>` (they show the example answers; they are not form fields). Each block: the question at `--pg-small` weight 500, the answer at `--pg-body`:
  1. **Subjects** · "4: MTH 301, CSC 303, CSC 301, GST 311, each with a priority, a difficulty and an exam date"
  2. **Days** · "Monday to Saturday"
  3. **Study window** · "16:00 to 20:00, the same every day (or a different window for each day)"
  4. **Sessions** · "60 minutes with 10-minute breaks · 2 a day, 3 on Saturday (or the same number every day)"
  5. **Busy times** · "Your lectures, filled in for you · Thu 16:00 to 18:00, Lab 3"
  6. **How long** · "2 weeks from Mon 30 Nov"
- **Then the full-width bar,** ink, 56px: **Build yours** → `/register` (signed in and timetable switch on: `/timetable/build`).
- **Under the coupon,** at `--pg-small`, soft ink, columns 2–11: "Up to 12 subjects. Sessions from 25 minutes to 3 hours, up to 8 a day. On Android the questions come one per screen; on the website, in five steps." (`MAX_SUBJECTS = 12`; session 25–180 minutes; 1–8 sessions; Android `WIZARD_STEPS` has six steps, the web wizard five.)
- **Wording rule:** the coupon never says AI, smart, intelligent or learns. "By clear rules you can read" is the explanation.
- **Phone:** the card turns upright with 12px margins; the perforation runs across with notches on the left and right edges; heading and sentence above it; the six blocks and the bar below it, each at least 54px tall.

### 5.4 It shows its working (blueprint `stats-total-and-its-receipt`)

- **Field:** `--pg-ground-2`.
- **Left, columns 1–6:** h2 at `--pg-head`: "It shows its working"; note at `--pg-body`, two lines: "Every plan comes with the reasons behind it. Change a time or remove a session before you save, and edit it any time after." The space below stays empty. Anchored to the lower-left: **"23"** at the Display step scaled in container units (about 18vw; it counts as the Display step, as on `/features`); caption at `--pg-body`: "study sessions of 60 minutes over 12 days, around your lectures".
- **Right, columns 8–11: the receipt** (paper, 420px, zigzag bottom), header "Exam reading plan" with "Built with AcadeMind" at `--pg-small`; rows with dot leaders:

| Group | Row | Value |
|---|---|---|
| Sessions per subject | Numerical Analysis · high, hard, exam Fri 11 Dec | 10 |
| | Data Structures · medium, medium, exam Mon 14 Dec | 6 |
| | Operating Systems · high, medium, exam Wed 9 Dec | 5 |
| | Entrepreneurship · low, easy, no exam date | 2 |
| Rules it followed | Harder and higher-priority subjects get more | applied |
| | An exam coming up soon adds sessions | applied |
| | Lighter day before an exam | Tue 8, Thu 10 Dec |
| | Never on or after its exam day | all 4 subjects |
| | Never the same subject twice in a row | all 12 days |
| Heads-up | Only 23 of 24 requested sessions fit | Thu 3 Dec, Lab 3 |
| Inverted ink bar | Exam reading plan | 23 sessions |

- **The values sum to the total** (10 + 6 + 5 + 2 = 23). Rows are generated from the engine output at build time (§"Example data"); the row wording is the public page's plain rendering of the engine's `why` and `warnings` lines.
- **Phone:** heading and note first; "23" at 40vw with its caption; the receipt at full width minus 16px.

### 5.5 As long as you need it (blueprint `intro-title-note-facts`)

- **Ground:** `--pg-ground`; 140px top padding, 120px bottom.
- **First row:** h2 at `--pg-head` in columns 1–6: "As long as you need it"; the note at `--pg-body` in columns 10–12 (260px wide, five lines; its last line on the heading's baseline): "Choose how long a timetable lasts when you make it. Before it ends, AcadeGrade tells you, and Extend adds more time without touching your events. Edit any event, title or reminder whenever you like."
- **120px lower, the facts row:** four facts at `--pg-head` (capped 44px), spread across the 12 columns (`justify-content: space-between`), each with a one-line explanation at `--pg-small` in soft ink:
  - **Hours** · "For an exam day. Ending-soon notice 1 hour before."
  - **Days** · "For a short stretch. Notice 1 day before."
  - **Weeks** · "For a reading plan. Notice 3 days before."
  - **Months** · "For a semester of lectures. Notice 7 days before."
- Under the facts, one line at `--pg-small`: "Up to 52 of any unit. Weekly events repeat until the end; one-off events keep their date." (`maxAmount = 52`; `expiryState` windows: 1 hour, 1 day, 3 days, 7 days.)
- **Below the right half of the facts row,** 5 columns wide at 4:3 (the blueprint's photograph slot, used for the product): a `UiFrame` of the timetable list card and the Extend panel, captioned "Extending a reading plan on the website":
  - Card: "Exam reading plan" · "Reading timetable, 23 events" · "Valid for 2 weeks, until Sun 13 Dec 2026" · "Built with AcadeMind" · status "Ending soon".
  - Extend panel: "Extend this timetable" · "Weekly events keep repeating until the new end date. Nothing else changes." · Valid for (amount) 2 · Valid for (unit) Weeks · "New end: Sun 27 Dec 2026" · **Extend timetable** · Cancel.
- **Checks:** at Fri 11 Dec 09:00 the plan is `ending_soon` (within 3 days of the end), at Thu 10 Dec 23:00 it is `ok`; `extendValidity(plan, 'weeks', 2, '2026-12-11T09:00:00')` starts the day after the old end (14 Dec) and ends `2026-12-27T23:59:59`, shown as "Sun 27 Dec 2026". Pin in a test.
- **Phone:** heading at 11vw, note under it full width; facts as a two-column grid with a 32px row gap, each at 26px; the fragment last at full width.

### 5.6 A reminder before every class (blueprint `showcase-close-up-with-column-card`, two frames)

**Frame 1 · Android reminders**

- **Photograph:** full bleed, 100vw × 100svh: a lecture hall at the University of Abuja, greyscale-indigo.
- **Card:** solid `--pg-ink`, one grid column wide (about 22vw), 52svh tall, in the second of four columns, vertically centred, square corners, opaque, no blur. Centred inside:
  - h2 at `--pg-head` (capped 36px), paper: "A reminder before every class".
  - Variant line at `--pg-body`: "Up to 3 per event, 10 minutes before unless you change it".
  - Fact line at `--pg-body`: "Arrives offline on Android".
  - A small 3:2 fragment: the Android notification as the app sends it: title "Data Structures", text "Starts in 10 minutes, at 09:00, LT 2." (the body format from `planReminders`), with the AcadeGrade icon.
  - At the foot, a square-cornered action filling the card's width: **Get the Android app** → `/app`.
- **Facts:** offsets 1–3, 1–1440 minutes, default `[10]` (`normaliseOffsets`); presets in the app 5, 10, 15, 30 and 60 minutes; reminders are local notifications scheduled on the phone (no data needed), a high-priority notification rather than a full-screen alarm.

**Frame 2 · On the website**

- **Photograph:** full bleed: the Nnamdi Azikiwe Library, University of Nigeria, Nsukka (a different crop from the one on `/features`).
- **Card** in the third column (position carries the sequence):
  - h3 at `--pg-head` (capped 36px): "On the website, your calendar".
  - Variant line: "Download a calendar file (.ics)".
  - Fact line: "Google Calendar or your phone's calendar does the reminding, on any phone, iPhone included. Your reminder times come with it."
  - Fragment: the timetable page's **Download calendar (.ics)** button and the confirmation "Downloaded acadegrade-exam-reading-plan.ics" (`icsFileName('Exam reading plan')`).
  - Action: **Start on the website** → `/register` (signed in: `/timetable`).
- **Facts:** `buildIcs` writes one `VALARM` per reminder offset and a weekly `RRULE` that stops at the timetable's end.
- **Phone (deviation, deliberate):** each photograph is 56svh (not 100svh, so the two frames do not cost four screens); the card docks over its bottom edge as a full-width block, 20px padding, left-aligned, with the fragment to the right of the heading at 96px wide.

### 5.7 Timetable questions (blueprint `faq-alternating-tone-bands`)

- **Heading band:** `--pg-gold`, full bleed, about 40svh, the h2 "Timetable questions" at the Display step (blueprint about 7vw), ink, anchored bottom-left.
- **Question bands** alternate `--pg-ground` and `--pg-ground-2`, full bleed, butted, as tall as their content: question (h3) in columns 1–5 at `--pg-lead` weight 500; answer in columns 7–12 at `--pg-body`, leading 1.5; 56px padding top and bottom. All answers visible; no toggles. These feed the `FAQPage` JSON-LD word for word.
  1. **Will reminders work without data?** "Yes, on Android. Reminders are set on your phone, so they arrive with no data and no signal. The app keeps the next two weeks of reminders ready and tops them up whenever you open it, so open AcadeGrade at least once every two weeks."
  2. **Why didn't a reminder arrive?** "Some phones stop background reminders to save battery. Open Settings, then Apps, AcadeGrade, Battery, and choose Unrestricted; the names differ a little between phones. Check that notifications are allowed for AcadeGrade too. On some phones a reminder can arrive a few minutes late."
  3. **Is it an alarm?** "It's a high-priority notification, not a ringing alarm that takes over your screen. If your phone offers Alarms & reminders for AcadeGrade, allow it so reminders arrive on the minute."
  4. **Do reminders work on the website or on an iPhone?** "Not as notifications. On the website, download your timetable as a calendar file (.ics) and open it in Google Calendar or your phone's calendar, which will remind you at the same times."
  5. **Does Build with AcadeMind use up my AcadeMind uses?** "No. It follows fixed rules, costs nothing, has no daily limit and works for students under 18 too."
  6. **Can I change a timetable after saving it?** "Yes. Add, edit or remove events, change times and reminders, or rename it whenever you like. You can keep up to 10 timetables, each with up to 300 events."
  7. **What happens when a timetable ends?** "Its weekly events stop and so do its reminders. On Android you get a notice before it ends, and Extend brings it back with every event as it was. You can also archive it to keep it out of your week."
- **Sources:** answer 1 from `WINDOW_DAYS = 14` and the rebuild on app open; answer 2 is the app's own battery card ("Make sure reminders get through"); answer 3 from `app.config.js` (high-priority notifications; exact alarms only where Android allows); answer 7 from the expiry notice "Timetable ending soon … Open AcadeGrade to extend it." and `ExtendPanel`.
- **Phone:** bands stay full bleed; question at 22px, answer at 17px, 32px padding; the heading band 30svh with the words at 13vw.

### 5.8 Close (blueprint `cta-photo-strip-then-field`)

- **Feature foot first,** on the ground, 64px above the strip: "Next feature: Result scanner" (`/features/result-scanner`) at `--pg-lead`; "Other features: AcadeMind · Transcripts · Free tools · Android app" at `--pg-small`.
- **Strip:** three photographs butted edge to edge, each a third of the viewport wide and 40svh tall, `object-fit: cover`, one treatment, no captions (credits in the imprint): the Unilorin arts lecture theatre; the 1962 thumbtacked notice at University College, Ibadan; the University of Abuja lecture hall (a tighter crop than frame 1).
- **Band** directly beneath, `--pg-ink`, about 44svh. Columns 1–7: the statement at `--pg-lead` over three lines in paper, with one phrase underlined by a 4px bar (`text-decoration-thickness: 4px; text-underline-offset: 6px`), which is the link and the action: "Your lectures are already set. **Put them in AcadeGrade** and let your reading fit around them." (link → `/register`; signed in, the phrase reads "Open your timetables" → `/timetable`). 32px lower, two lines at `--pg-small`: "Free on the website. Reminders in the Android app."
- **Deviation:** the blueprint's small portrait of "the person who will answer" is left out; no one answers here, and a stock face would break `01` §6.
- **Phone:** the strip becomes one full-width photograph at 4:3 with the other two side by side at half width beneath, gutterless; the band follows with the statement at 22px and the two small lines.

### 5.9 Footer

The shared `PublicFooter`.

## 6. Imagery for this page

| Slot | Picture | Source and licence | Treatment |
|---|---|---|---|
| Hero agenda, Extend panel, notification, .ics button | AcadeGrade's own timetable screens and the Android notification | Own components and the app's notification format, with the example data | Agenda as stationery; `UiFrame` fragments inert and captioned |
| Reminders frame 1; strip (tight crop) | "UniAbuja.LectureMG 0152" (`openverse:740d127e-0ec6-4bbb-9c68-a87414f8b3da`) | Wikimedia Commons, by Iamjoezy, CC BY-SA 4.0, https://commons.wikimedia.org/w/index.php?curid=109370231 | Greyscale-indigo, 16:9, AVIF under 180 KB, lazy |
| Reminders frame 2 | Nnamdi Azikiwe Library, UNN (`openverse:af32be22-489e-4c3b-821b-52439c5d4a85`) | Wikimedia Commons, by Udeagbala, CC BY-SA 4.0 | Same treatment, new crop |
| Strip | "Unilorin arts lecture theatre (ALT)" (`commons:169412850`) | Wikimedia Commons, by Abdurrazaq A.F.O, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Unilorin_arts_lecture_theatre_(ALT).jpg | Same treatment, 4:3 crop |
| Strip | "University College Ibadan. Thumbtacked notice", 1962 (`openverse:c1a32c03-adf9-4cf8-8780-0f1ec6c26495`) | Wikimedia Commons, ASC Leiden, by Maarten van Dis, CC BY-SA 4.0 | Same treatment |

Credit line (imprint): "UniAbuja lecture hall by Iamjoezy; Nnamdi Azikiwe Library, UNN, by Udeagbala; Unilorin Arts Lecture Theatre by Abdurrazaq A.F.O; University College Ibadan notice, 1962, by Maarten van Dis / ASC Leiden (CC BY-SA 4.0, via Wikimedia Commons; tinted)." All photographs load lazily; nothing above the fold is a photograph.

## 7. Motion on this page

- **Signature: the week is laid down.** Once per visit, the day tabs drop in from 16px above, 50ms apart; then Monday's bands slide in from 24px to the right, 70ms apart, like slips placed on a board. Under reduced motion they are simply present.
- **Tabs:** a 160ms crossfade between days.
- **Kinds:** each field's figure rises 24px as the field enters.
- **Coupon:** the card enters at 1° and settles flat; the six answer blocks fill in order, 60ms apart.
- **Receipt:** prints row by row; "23" is static.
- **Facts row:** the four facts enter left to right, 70ms apart.
- **Reminders:** the notification fragment slides down 12px into place when its card is in view, once (how a notification arrives).
- **Bands and close:** standard entrances; the strip's photographs never move.
- **Count:** at least 12 moving elements over load and scroll; all respect reduced motion and data saver.

## 8. Components

- **Used:** `PublicHeader`, `Trail`, `Slip` (`receipt`), `UiFrame`, `Figure`, `Credit`, `Button`, `TextLink`, `SectionHeading`, `FeatureFoot`, `CookieStub`, `PublicFooter`.
- **New:**
  - `DayAgenda` (client island: tabs and bands; data from the engine with `expandOccurrences` and `reminderTimes`).
  - `KindFields` (unequal colour fields).
  - `Coupon` (notched card with a perforation; `<dl>` blocks; one bar action).
  - `Receipt` with build-time engine data (shared component from `/features`).
  - `FactsRow`.
  - `PhotoCardFrame` (full-bleed photograph with a column card; repeatable, card shifts one column per frame).
  - `ToneBands` (open FAQ bands; feeds `FAQPage`).
  - `PhotoStripClose`.
- **Fragments:** `NotificationFragment` (Android notification), `ExtendFragment`, `IcsDownloadFragment`, `TimetableCardFragment`.
- **Data:** `lib/public/example-timetables.ts` (the two timetables and the builder input; the output is computed at build time with `buildStudyPlan`), `lib/public/timetable-page.ts` (copy and FAQ).

## 9. SEO

- **Title:** "Timetable and reminders | AcadeGrade".
- **Description:** "Keep your lectures, reading and exams in one timetable. Build a reading plan with AcadeMind and get reminders on Android, even offline. Free for students." (155 characters)
- **Canonical:** `/features/timetable`.
- **Open Graph:** the day agenda with "Your week, on time."
- **JSON-LD:** `BreadcrumbList` (Home › Features › Timetable) and `FAQPage` from §5.7, exactly the visible questions.
- **Sitemap:** add `/features/timetable` to `PUBLIC_SITEMAP_ROUTES` (priority 0.9 with the other feature pages).
- **Keywords:** "lecture timetable app", "reading timetable", "study planner Nigeria", "exam timetable reminder".

## 10. Accessibility

- **Agenda:** a tablist of days; each panel is a list of events whose items read "09:00 to 11:00, Data Structures, CSC 301, LT 2, lecture, reminder at 08:50". Times are `<time>` elements.
- **Kind fields:** h3 names; figures carry their captions as accessible descriptions.
- **Coupon:** the answers are a `<dl>`, not inputs, so nothing pretends to be a form; the bar is a link.
- **Receipt:** a `<table>` with caption "Why the example plan looks this way".
- **Photo frames:** each photograph has alt text naming the place; cards are real content in reading order; text never sits on the photograph without the opaque card.
- **FAQ bands:** h3 questions with paragraph answers; nothing hidden.
- **Underlined close phrase:** a real link whose text describes the destination; the 4px underline is its normal state, thickening is not the only focus cue (gold outline).

## 11. Carried over, replaced and removed

| Today | In the redesign |
|---|---|
| No public page for timetables; the feature appears only inside the student app and as one line in `PRODUCT.md` | A new feature page, linked from the header's Features, the footer, the home sheet and `/features#timetable` |
| In-app copy "Tell us your subjects and the time you have. We lay out a reading timetable … using clear rules" | Kept in spirit: "by clear rules you can read" |
| In-app notice "Reminders are an Android app feature … On the website you can download a calendar file (.ics)" | The two reminder frames and FAQ answer 4 |
| Android battery card "Make sure reminders get through" | FAQ answer 2, same instructions |
| "Built with AcadeMind" gold pill tag | Plain text on public pages (no pill badges) |

## 12. Acceptance checklist

- [ ] Five-second test: a stranger says "a timetable for lectures and reading that reminds you on your phone".
- [ ] The example plan is computed by `buildStudyPlan` at build time and its totals (23 of 24; 10 / 6 / 5 / 2) are pinned by a unit test; the reminder, validity, expiry and extend values are pinned too.
- [ ] No rendered text calls the builder AI, smart, intelligent or learning.
- [ ] Phone: h1, sentence and button on the first screen at 390×844 with the cookie stub open; the day tabs work with touch and keyboard.
- [ ] `inspect.mjs`: 0 FAIL at 1440/768/390, light and dark; Lighthouse mobile ≥ 90 ×4; all photographs lazy.
- [ ] `FAQPage` JSON-LD matches the visible questions; `/features/timetable` is in the sitemap and the footer.
- [ ] With the `timetable` switch off, the page still renders and signed-in visitors get **Open dashboard**.

## 13. Open items for the owner

1. Confirm the example week (courses, venues such as "LT 2", "Maths Hall", "Lab 3", and the exam dates in December 2026).
2. Confirm the reading of `02` §5 for the switched-off state: the page stays, and the signed-in action becomes **Open dashboard** rather than sending a signed-in student to sign in.
3. Supply a screenshot of a real reminder notification from an Android phone (example data), if you prefer it to the rebuilt fragment.
4. Confirm the FAQ promise "open AcadeGrade at least once every two weeks" (it reflects the 14-day reminder window).
