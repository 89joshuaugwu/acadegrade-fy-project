# 05 · Decisions and items for the owner

Every open question from the 26 page plans in one list. Each item names the plan with the detail. A recommended answer is in **bold** where one exists. Items marked **Before launch** block release.

## A. Must fix before launch (found while planning)

1. **Before launch: no route for locked-out students.** When no contact email is set, a student who cannot sign in has nowhere to go, and the Play data-deletion page needs one. **Set the contact email in Admin → Settings → Public site**, or approve the public request form (`support.md`, `account-deletion.md`).
2. **Before launch: the Privacy notice is out of date.** Share links are now 1, 7 or 30 days. The notice also needs a retention row for support requests (180 days after closing), to list timetables and catalogue suggestions as data, and to name AcadeMind. **Publish a new version from Admin → Legal documents** and mirror it in `lib/legal/builtin.ts` (`legal-privacy.md`).
3. **Account deletion:**
   - confirm the extra deleted items (timetables, support requests, AI-answer reports, catalogue suggestions);
   - confirm whether phone reminders are cancelled on deletion;
   - note that the deletion job stops after a fixed amount of work with no follow-up, which puts the 21-day promise at risk; **add a follow-up cron job** (`account-deletion.md`).
4. **Bugs found in today's code:**
   - Register's "Expected graduation" ignores direct entry.
   - The shared transcript's "PI" column holds units × point, and "Total Credits Earned" counts failed units.
   - The network error on share pages says "Not Found".
   - The reset API accepts 6-character passwords while the page requires 8.
   - Sign in, register and forgot password have no page titles.
   - Maintenance and offline pages are indexable.
   - `manifest.json` says "AcadeGrade v2 · Premium Grade Calculator".
   - `/app/download/android` has no fallback if Firestore fails.

   **Fix all of them in the phase that touches each page.**

## B. Content to supply

5. **Screens and video:**
   - six Android screenshots on a test account loaded with the example student's data;
   - a 6–10 second screen recording of scanning a slip (no personal data).

   The Android page should not ship with placeholder screens.
6. **Founder letter (home):** confirm the wording and supply a portrait (optional). About may show "Run by Joshua Chimaobie Ugwu, Enugu State"; confirm.
7. **Example data:**
   - the example student "Chidera Okeke, CSC/2023/0147, 300L Computer Science";
   - the courses, venues and December 2026 exam dates in the timetable sample;
   - the AcadeMind written-analysis sample;
   - the 12 "small things" on the features page.
8. **Real student quotes** (consented) when ready, and the CountLine threshold (**100**).
9. **Logos:** approve vectorising both logos to SVG (the AcadeMind PNG is 562 KB today).
10. **Photographs:**
    - approve the archival 1962 photographs (UNN library reading room, Ibadan notice board) next to the modern campus photos;
    - confirm licences on download (IBBU Lapai especially);
    - a notice-board photo on the 404 page if a good one exists.

## C. Product decisions

11. **Calculator:**
    - add the optional "CGPA so far" (**yes**);
    - sharing without sign-in (**yes**: the link already holds the calculation);
    - units 1–6 versus the handoff's 1–12 (**align to 1–6**);
    - show a class when only one semester is entered (**yes, labelled "at this GPA"**).
12. **Required GPA:** round the needed average up (4.65225 → 4.66) (**yes**; a one-line change in `tool-math.ts`).
13. **Register:**
    - extend the 10-minute email-check window (**to 30 minutes**);
    - start the University field empty instead of "ESUT Agbani" (**empty**);
    - approve the direct-entry graduation fix (**yes**).
14. **Reset password:**
    - give the same answer for every email, so the page doesn't reveal which addresses have accounts (**yes**, a small server change);
    - add a "Start again" link, a show-password toggle, and clear "too many tries" and "no connection" messages (**yes**).
15. **Maintenance:** add a checked `?next=` return path at its three redirects (**yes**), plus the line "Your saved records are not affected".
16. **Course-code links:** remember the code when a visitor taps "Create a free account" (**yes**).
17. **Shared transcript:**
    - rename the columns to "Points" and "Total units" (**yes**);
    - embed Hanken Grotesk in the PDF (**yes**);
    - hide the student's name in link previews (**yes, always**).
18. **Android page:**
    - Google Play badge as the main button once listed (**yes**);
    - APK size entered in admin per release (**manual for now**);
    - switch coins on before launch? (your call; the pages hide coin content while off).
19. **Timetable switched off:** keep the feature page up, and give signed-in students "Open dashboard" (**yes**).
20. **iPhone page:** indexable (**yes**). Check the four Home Screen steps on your iOS version.
21. **Service worker:** stop generating `sw.js`, since every page load unregisters it anyway (**remove**; revisit with D1 offline mode later).
22. **About:** approve the new default wording, then re-save About in admin, because saved Firestore text overrides the defaults. State a reply time for support only if you can keep it.

## D. Wording to confirm

23. **AI consent:** should it name AcadeMind? (It is legal text; it stays word for word until you say otherwise.)
24. **Labels:**
    - "Below a Pass" as the display name for the Fail band;
    - "some schools add conditions for a First";
    - the spill-over definition;
    - "about two minutes" to install;
    - Android 7.0 as the minimum version;
    - "open the app at least once every two weeks" (timetable reminders).
25. **Consistency:**
    - "Help and support" on both web and Android;
    - "AcadeMind" as the support category name;
    - the order of the four tools on the hub.

## E. Notes for the build (no answer needed)

- The plans add these components to `02` §4.15: `ChoiceKeys`, `Stepper`, `StepStripe`, `CodeField`, `FilledSoFar`, `ChoiceRow`, `MinimalShell`, `RecordPaper`, `VisitorStub`, `AppLinks`.
- `AppLinks` replaces `MobileAppDownload` everywhere, including login and register (removes "iOS coming soon").
- New data modules:
  - `lib/public/example-student.ts`: one example student shared by every page;
  - `lib/public/usage-public.ts`: free daily allowances read live;
  - `lib/public/scales.ts`, `credits.ts`, `proof.ts`, `auth-copy.ts`, `home.ts`.
- New admin fields: `mobileAppLinks.androidSizeMb`, `mobileAppLinks.playUrl`.
- The sitemap gains `/tools`, `/app` and `/features/timetable`.
- Saving About in admin should refresh `/about` and the contact email straight away.
