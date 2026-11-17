# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

(The same product also ships as an Android app from the sibling `acadegrade-mobile` repo. This record covers the website, the student portal and the admin dashboard. The iOS app is paused.)

## Users

- **Primary:** Nigerian university undergraduates (100L to final year, including direct-entry and spill-over students) who want to know their GPA, CGPA, Performance Index (PI) and degree class without doing the arithmetic by hand, usually on a mid-range Android phone with costly mobile data.
- **Moments of use:** the day results are released (a result slip or portal page in hand), the evening after (what does this do to my class?), before registration (how many units, what can I still reach?), and through the semester (lectures, reading and exam timetable).
- **Secondary:** classmates who receive a shared course-code link, and anyone (parent, sponsor, scholarship officer) who opens a student's shared transcript link.
- **Operator:** the owner/admin, who runs the platform from the web admin dashboard (settings, AI providers, ads, announcements, support inbox, legal documents, Android release notices).

## Product Purpose

AcadeGrade turns a student's semester results into a clear, private academic record: per-semester GPA and PI, cumulative CGPA, projected degree class, carry-overs, and what each future semester needs. It then helps the student plan (targets, what-if, timetables with reminders) and share (transcript links with expiry and PIN). Success means a student trusts the numbers, comes back every semester, and plans with them.

## Positioning

- Built for the Nigerian university grading world (5-point scale, CA + exam scores, carry-overs, spill-over, direct entry, 100L–500L sessions), not a generic GPA calculator.
- Every number is traceable to the courses behind it; the record is the student's own, not an official transcript.
- AcadeMind is the assistant name for the smart features (written analysis, forecast, what-if guidance, result-slip reading, the timetable builder). The timetable builder is rule-based, not AI.
- Free to use on the web and on Android (direct APK; Google Play listing planned).

## Operating Context

- Result slips / portal result pages with: course code (e.g. CSC 201), course title, units, CA (out of 30), exam (out of 70), total, grade, grade point.
- Nigerian 5-point scale: A 70–100 = 5, B 60–69 = 4, C 50–59 = 3, D 45–49 = 2, E 40–44 = 1, F 0–39 = 0. Classes: First Class 4.50–5.00, Second Class Upper 3.50–4.49, Second Class Lower 2.40–3.49, Third Class 1.50–2.39, Pass 1.00–1.49. Institutions may adjust; the handbook is the authority.
- PI (Performance Index) is shown beside GPA; it is not standard across all schools.
- Students share course codes with classmates and use department lecture/exam timetables.
- Low-end Android phones, intermittent power and data; the Android app works offline for timetables and reminders.

## Capabilities and Constraints

- **Live today (web + Android):** semester records, GPA/PI/CGPA, degree class, carry-overs, weighted average score, credit-load warnings, expected-grade preview, milestones, semester recap, transcript PDF and share links (expiry 1/7/30 days, summary only, optional PIN), course-code sharing and links, paste-from-portal import, result-slip scanning, AcadeMind written analysis / forecast / what-if, timetable (fixed, reading, custom; "Build with AcadeMind"; validity; up to 3 reminders per event on Android), coins for extra AI uses (Android rewarded ads), support inbox, announcements, data saver, devices list and sign-out everywhere.
- **Grading scales:** only the Nigerian university 5-point CGPA (with PI) is supported today. Planned later: 4-point (polytechnics and some universities), WAEC/NECO, JAMB score, Law School classes. Public pages must say "Nigerian universities" now and be structured so new scales can be added as sections or pages later without a redesign.
- **Age:** under-18 students may use tracking; AI features, scanning and coins are off for them.
- **Free public tools:** CGPA calculator, degree class checker, required GPA, carry-over impact, weighted average.
- **Not offered:** iOS app (the website works on iPhone), official verification, payments or subscriptions for students.
- **Distribution:** web at acadegrade.vercel.app (custom domain planned), Android direct APK; a Play Store build variant exists.

## Brand Commitments

- Names: **AcadeGrade** (product) and **AcadeMind** (the assistant/smart-features name, shown in front of AI features).
- **Logos are binding:** the AcadeGrade mark (`public/logo.png`: a progress arc from violet to gold ending in a gold dot, around a mortarboard) and the AcadeMind mark (`public/acadegradeailogo.png`: the same arc with a mortarboard robot and circuit lines). Colours may change around them; the redesign palette should relate to the logos.
- Voice: plain, warm, confident; sentence case; Nigerian/British spelling (programme, colour); the site must feel like a finished, production product (no "beta", "coming soon", developer wording, or dev placeholders on public pages).

## Evidence on Hand

- Real product interface (web and Android screens) and the real calculation engine, which can run live on public pages.
- Real policies: privacy notice and terms (NDPA), retention periods, account deletion process.
- About 20 registered testers (10–15 active) as of November 2026; admin metrics compute real totals.
- **No published testimonials, press, partner logos or university endorsements exist.** The owner wants testimonial and user-count sections designed; they may only show real, consented quotes and real counts in production. Sample quotes are allowed in an admin-only preview.
- Real campus photographs exist in open collections (e.g. University of Nigeria, Nsukka on Wikimedia Commons, CC BY-SA, credit required). Current hero photos are stock/composite images and are being replaced.

## Product Principles

1. The numbers must be right and explainable; show the courses behind every figure.
2. The student's record is theirs: private by default, unofficial by design, shareable only on their terms.
3. Respect the student's phone and data: fast, light, works on low-end Android.
4. Help the next decision, not just the last result (targets, planning, timetables).
5. Grow by adding scales and features as sections, not by rebuilding.

## Accessibility & Inclusion

WCAG 2.2 AA; keyboard and screen-reader use; 44px+ touch targets; reduced-motion and data-saver respected; readable on small, dim screens outdoors; under-18 users protected from AI and ads targeting.
