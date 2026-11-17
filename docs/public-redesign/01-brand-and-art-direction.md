# 01 · Brand and art direction

The decisions every public page inherits. Page plans in `pages/` apply these; they do not reinvent them. Where a page plan and this file disagree, this file wins, then `02-design-system.md`, then the page plan.

## 1. How the direction was chosen

- **Brief:** a full redesign of the public site with a real, production feel, keeping the AcadeGrade and AcadeMind logos (owner decision, 17 Nov 2026). Colours are free, but must relate to the logos.
- **Art direction:** dealt with tasteskill (`draw.mjs`, seed `162997270`, sector education, saved in `acadegrade-web/.taste-skill/direction.json`). Three directions were dealt. **The page is the object** was chosen over "the sentence is the layout" and "type only" because AcadeGrade's world already has a printed artefact that every student knows and the product literally reads: the **semester result slip**.
- **One slot replaced (with reason):** the dealt palette (rose grey with green) was replaced with colours taken from the logos, because the logos are binding brand assets. The dealt proportions (one ground, one ink, one accent, a few fields, like a two-colour print job) are kept.
- **Product truth:** `acadegrade-web/PRODUCT.md`.

## 2. The idea

> **On this site, the Nigerian semester result slip becomes the stationery every page is printed on, and AcadeGrade's own arc (violet at 0.00, gold at 5.00) becomes the meter that reads it.**

**What students recognise straight away:**

- **The slip itself:** course code, title, units, CA, exam, total, grade, point, with the GPA at the foot.
- **Its paper habits:** tidy columns, a header band, totals in a bar, a tear-off edge.
- **The arc:** the logo is already a gauge, starting violet and ending in a gold dot. Unrolled flat, it becomes the brand stripe of five steps, one per grade point.

**Competitor test.** A generic GPA calculator site has no result slip and no arc. Another Nigerian CGPA app could borrow a slip, but not this arc, which is AcadeGrade's mark, and not the live slip that recomputes as you edit. The idea belongs to AcadeGrade.

**The one live thing (home hero).** The hero slip is a working result slip. Five sample courses (real Nigerian course codes) each have grade keys A–F.
- Change a grade and the GPA, CGPA and degree class at the slip's foot recompute instantly with the real engine (`lib/cgpa/academicRules.ts`), and the arc meter's dot moves along the stripe.
- **Save this semester** carries the slip into sign-up through the existing calculator handoff.
- On a phone the grade keys are thumb-sized. Without JavaScript the slip is a static, correctly computed example.
- This replaces the current hero photo and typewriter, and it answers "what is this?" in five seconds.

## 3. Subject inventory (where every page finds its material)

1. The result slip and its columns (course code, title, units, CA /30, exam /70, total, grade, point).
2. The 5-point scale bands and the five classes with their thresholds (4.50, 3.50, 2.40, 1.50, 1.00).
3. The logo arc: violet to gold, ending in a dot; the AcadeMind arc with circuit lines.
4. Course codes as a language: GST 111, MTH 101, CSC 201, EEE 301; general studies everyone shares.
5. Levels and sessions: 100L to 500L, "2025/2026", first and second semester, direct entry 200L/300L, spill-over.
6. Carry-overs: the F that comes back; the examiner's red mark.
7. The departmental notice board, where results and timetables are pinned.
8. The timetable: lectures, reading, exams; reminders 10 minutes before.
9. The transcript and the share link with a PIN.
10. The campus: gates, faculty buildings, lecture theatres, libraries (University of Nigeria, Nsukka is in Enugu State, where AcadeGrade is made).
11. Phones on mobile data, "NEPA took light", offline reminders: the reason the site must be light.
12. AcadeMind: the assistant that reads the record.

## 4. Colour: paper and two inks from the logo

**Model.** The page is a desk; the slips are paper; the ink is the logo's indigo; the one accent is the logo's gold. The logo's violet appears only in the arc device, AcadeMind, and one field colour. The arc unrolled gives the **brand stripe**: five flat steps, one per grade point.

| Role | Token | Light ("day desk") | Dark ("night desk") | Use |
|---|---|---|---|---|
| Ground | `--pg-ground` | `#E7E5EE` | `#0E0C22` | Page background (the desk) |
| Ground step | `--pg-ground-2` | `#DCD9E6` | `#17143A` | One tone step for alternate sections |
| Paper | `--pg-paper` | `#FBFAF7` | `#F4F2EC` | Slips, cards, sheets, the object itself (stays light in dark mode: it is paper) |
| Paper row | `--pg-paper-2` | `#F1EFE9` | `#E9E6DE` | Alternate rows and fields on paper |
| Ink | `--pg-ink` | `#18153D` | `#18153D` on paper; `#EEECF7` on ground | All text on paper, primary button fill |
| Soft ink | `--pg-ink-soft` | `#4B4868` | `#4B4868` on paper; `#A9A6C4` on ground | Secondary notes only, never running text |
| Violet (logo start) | `--pg-violet` | `#5B52F2` | `#8F88FF` | Arc meter start, AcadeMind field, focus ring on dark |
| Gold (logo end, the accent) | `--pg-gold` | `#F2A922` | `#F2A922` | The one accent: First Class, the meter dot, the highlighted total, hover stripe. A fill only, never text on paper |
| Examiner red | `--pg-mark` | `#C23A22` | `#FF7A61` on ground | F grades and carry-overs only |
| Stripe 1 to 5 | `--pg-step-1` to `--pg-step-5` | `#5B52F2` `#8B67DD` `#C27BAA` `#E58F68` `#F2A922` | same | The brand stripe (E=1 to A=5); never blended into a gradient |

**Rules:**

- **Proportions:** ground about 60%, paper 30%, ink as text, gold under 3% (the action highlight, the meter dot, First Class).
- **Contrast** (all pass WCAG AA): ink on paper about 16:1, soft ink on paper about 8.6:1, violet on paper about 5.6:1, ink on gold about 9:1. White on violet about 5.8:1.
- **No gradients:** the logo file itself is the one exception, as a brand asset. Next to it, the stripe is drawn as flat steps.
- **Photographs:** one treatment, greyscale with a slight indigo cast (CSS `filter: grayscale(1) contrast(1.05)` over an indigo-tinted backing, or pre-processed), so they sit with the ink.
- **Dark mode:** the "night desk". The ground turns deep indigo; slips stay paper-coloured, like real paper on a dark desk. It follows the system setting, with a manual switch in the footer.

**Hand-off to the student app later:** the same roles can replace today's violet/indigo tokens in the student pages and Android app in a later phase. Nothing here depends on that happening first.

## 5. Type: one family

- **Face:** Hanken Grotesk (Google Fonts, loaded with `next/font/google`, self-hosted, `display: swap`), weights 400 and 500 only. Medium-weight statements, regular text, no bold.
- **Figures:** tabular (`font-variant-numeric: tabular-nums`) for every number: GPAs, scores, units, dates.
- **Retired on public pages:** Bricolage Grotesque, DM Sans and Geist Mono stop being used on public pages. Mono stays only inside real code blocks (none planned).
- **Five steps** (no sixth, ever; page plans map every size onto these):

| Step | Token | Value | Use |
|---|---|---|---|
| Small | `--pg-small` | `clamp(0.875rem, 0.85rem + 0.1vw, 0.9375rem)` (14–15px) | Notes, captions, table meta, legal footers |
| Body | `--pg-body` | `clamp(1.0625rem, 1rem + 0.25vw, 1.1875rem)` (17–19px) | Running text, slip rows, controls |
| Lead | `--pg-lead` | `clamp(1.25rem, 1.1rem + 0.7vw, 1.625rem)` (20–26px) | Supporting sentence, statements, slip totals |
| Head | `--pg-head` | `clamp(2rem, 1.3rem + 3.2vw, 4rem)` (32–64px) | Section headings |
| Display | `--pg-display` | `clamp(2.5rem, 1rem + 5.4vw, 6rem)` (40–96px) | The h1 on the first screen, the giant CGPA figure, the giant word |

- **Settings:**
  - Display and head: weight 500, tracking -0.04em, leading 0.95. Body: weight 400, leading 1.5, tracking -0.005em.
  - Measure 45–70 characters. Left-aligned; centring is allowed only on the slip, where a printed slip centres its header.
- **Copy limits:** headlines are two lines or fewer at every width (about 32 characters is safe), always in sentence case.

## 6. Imagery

**Order of preference:**

1. **The product's own interface**, cropped large. Real screens rebuilt in HTML from the real components (preferred: crisp, light, translatable), or current screenshots exported at 2x and compressed. Always with realistic sample data, never the owner's real profile.
2. **Real campus photographs** from open collections, credited in the footer. They show the students' world, never presented as AcadeGrade's own users or rooms.
3. **Drawings in code** of the subject's things: the slip, the arc meter, the grade keys, the stripe, a notice-board pin.
4. **No stock "smiling student with phone" photos.** The three current hero composites (`Smiling Student…png`, `heroimage2.png`, `heroimage3.png`) are retired.

**First picture set** (download with `node ~/.claude/skills/design-taste-frontend/scripts/assets.mjs --get <ref>`, which records source and licence; then optimise to AVIF/WebP under 200 KB each):

| Picture | Source | Licence | Planned use |
|---|---|---|---|
| University Gate, University of Nigeria, Nsukka | Wikimedia Commons, by Favouridowu | CC BY-SA 4.0 | Home hero photograph (frame 1 of the slow crossfade); footer stamp |
| Faculty of Arts building, UNN Nsukka | Wikimedia Commons (`openverse:b3c160f7-…`) | check on download | Hero crossfade frame 2; About |
| FUT Minna lecture hall | Wikimedia Commons, by Baleegraphy | CC BY-SA 4.0 | Showcase section (full-bleed); timetable page |
| IBBU Lapai lecture hall | Wikimedia Commons | check on download | FAQ tall photograph |
| (search more) Nigerian university library, notice board, convocation | `assets.mjs` queries listed in each page plan | CC0/BY/BY-SA only | Feature pages, support, 404 |

- **Credits:** each credit goes in the footer ("Photographs: …") and in `docs/public-redesign/credits.md` when downloaded. Share-alike means altered versions (for example the indigo tint) are shared under the same licence; state that in the credit line.
- **Video:** one honest muted loop is wanted, such as a real screen recording of the app turning a slip into rows (made by the owner on a phone, 6–10 seconds, no personal data). It is the strongest picture the site can have, so plan it for the scanner section and the scanner page.

## 7. Voice and copy rules

- **Tone:** plain, warm and sure of itself; written to a student, using "you". Nigerian/British spelling (programme, colour, organise). Sentence case everywhere.
- **Say what it is:** "Your GPA, CGPA and degree class, worked out from your result slip." Do not use "unlock", "supercharge", "journey", "seamless", "AI-powered", or "revolutionise".
- **AcadeMind:** call it "AcadeMind" and say what it does ("AcadeMind reads your record and writes a plain analysis"). The timetable builder is "Build with AcadeMind"; never call it AI, smart or machine learning.
- **Unofficial, said positively:** "Your own record. Your university's transcript stays the official one."
- **Finished product, no development traces:** no "beta", "coming soon", "under construction", "illustrative", developer names, or placeholders on public pages. Example data appears as a named example student, for example a slip headed "Example · 300L Computer Science · 2025/2026 First Semester", which reads as a product demo.
- **Numbers:** every sample number must add up. Each page plan gives its exact sample data, checked against the engine.

## 8. Proof policy (owner decision, 17 Nov 2026)

The owner wants to see testimonial and user-count sections designed. Those layouts are planned. Publishing invented quotes or numbers to real students would mislead them and breaks Google Play and consumer-protection rules, so:

- **Testimonials:** an admin-managed list (`public_testimonials`: quote, first name, level, department, university, consent date, status). The section shows in production only when at least three entries are approved. Each page plan writes sample quotes, clearly marked SAMPLE in the plan. They render only in an admin preview (`?preview=proof` for signed-in admins, or on Vercel preview deployments), so the owner can see the design and collect real ones to match.
- **User count:** a real number from `admin_metrics/latest` (registered students, universities represented), shown only above an admin-set threshold (suggested 100). Below it, the slot shows a real non-numeric fact instead ("Built for the 5-point scale used across Nigerian universities").
- **No invented logos, ratings or press, ever.**

## 9. Built to grow (grading scales)

Today only the Nigerian university 5-point CGPA (with PI) exists. The site says "Nigerian universities" and never hard-codes the scale into layouts:

- The grading scale is data, not layout (`lib/public/scales.ts` lists live scales; one entry today). The home "Scale" section, the calculator, the tools and the FAQ read from it.
- With one live scale, no switcher is shown, just the line "Nigerian university 5-point scale, with PI".
- When a second scale goes live (for example 4-point for polytechnics), a scale switcher appears automatically. A `/grading-scales/[scale]` page family is reserved in the site map, and each scale adds a bar group in the home "Scale" section.
- Future scales are never mentioned before they exist (no "coming soon").

## 10. Tools and skills used for this plan and the build

- **tasteskill** (art direction, house rules, `inspect.mjs`/`lint.mjs` gate at 1440/768/390, `assets.mjs` for credited photographs). Every page must reach 0 FAIL before it ships.
- **Impeccable** (`PRODUCT.md` written; `critique`, `audit`, `polish` and the `detect` checker per page; the new `DESIGN.md` replaces the old one when Phase A ships).
- **frontend-design** (component craft) and **superpowers** (`writing-plans` for the implementation plan, test-driven development, verification before completion).
- **shadcn MCP:** used only as a reference registry for accessible behaviour when a native element is not enough (for example a university combobox on register). The site prefers native `details`, `dialog` and `popover` and restyles anything taken from the registry to these tokens; no wholesale shadcn install.
- **Adobe MCP:** vectorise the two logo PNGs into SVG (`image_vectorize`) so they are crisp and tiny; crop and resize the campus photographs; make launch social graphics in Adobe Express from the same stationery.
- **Playwright / Chrome DevTools MCP:** screenshots, Lighthouse and performance traces on the built pages.
