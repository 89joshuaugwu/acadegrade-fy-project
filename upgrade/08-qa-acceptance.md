# QA, Acceptance, and Release Evidence

This is a future implementation checklist. No item is marked passed by creating this document. A successful build alone does not verify the UX.

## Verification Setup

Current package scripts provide build/dev/start and an outdated `next lint` entry. Wave 1 should establish:

| Command | Intended script/meaning |
|---|---|
| `npm.cmd run typecheck` | `tsc --noEmit` |
| `npm.cmd run lint` | ESLint CLI with Next-compatible flat config |
| `npm.cmd run test:unit` | Vitest run for meaningful domain/UI behavior tests |
| `npm.cmd run test:e2e` | Playwright route/interaction tests |
| `npm.cmd run test:a11y` | Playwright spec using axe for automated checks plus manual keyboard evidence |
| `npm.cmd run build` | Existing Next webpack production build |

These new scripts do not exist yet. Pin compatible test-tool versions during implementation and record them in the lockfile. Avoid unrelated dependency upgrades. Test dependencies can include Vitest, jsdom, Testing Library, Playwright, and axe-core integration; they are verification tools, not a replacement runtime UI library.

Mock public HTTP endpoints and data adapters for deterministic UI tests; use an isolated Firebase emulator/test project for auth/finalization/authorization integration tests. Never run fixtures against production user accounts. Do not put an admin secret or token into browser-accessible test code. If credential-dependent tests cannot run, report that explicitly and do not mark their gate passed.

## Deterministic Fixture Set

Create `tests/fixtures/academic.ts`, `accounts.ts`, and `admin.ts` during implementation. Fix time to a named test date so screenshots do not change daily.

| Fixture | Required content | Expected distinction |
|---|---|---|
| New student | Complete profile, no semesters | Helpful empty state; no failed/zero record |
| Incomplete Google account | Authenticated, no finalized profile | Setup route, never dashboard |
| Active student | At least 4 completed semesters, 1 incomplete | Credit-weighted metrics; period and completeness labels |
| Mixed score modes | CA/exam, total-only, letter-only, zero score, AR, missing | All modes retain meaning across editor/read-only/transcript |
| Long content | 65-character name, long institution/department/course title | No overlap or hidden primary action at 320px |
| Legacy data | No updatedAt on some courses; missing createdAt/profile optional fields | Honest recent fallback and unavailable metadata |
| Boundary values | 0, 1, 1.5, 2.4, 3.5, 4.5, max, 4.495 and just-below thresholds | Shared classification/rounding policy; no gap→Fail |
| Error mix | One successful section, one failed section, stale AI cache | Partial recovery, not entire empty page |
| Admin list | 63 users, 57 catalogue courses, multiple filters, same-timestamp ties | Cursor continuity, no duplicates/omissions, complete filter scope |
| Analytics missing | No real PI pairs; fewer than 2 historical points | Unavailable/point display; no invented trend |
| API monitor cap | 5,000 capped events and server error | Scope disclosure and retained stale data |
| Shared transcript | Valid, expired, revoked, no photo, multi-page | Correct private/public/print variants |

## Domain Cases with Exact Expected Outcomes

- Scores 26 CA + 28 exam, units 2: total 54, grade C under current default scale, grade point 3, continuous PI 2.7. Transcript PI must not display weighted grade points `6` in that column.
- Total-only 74 with missing CA/exam: 74 displayed, A under current default, no invented split, PI 3.7 if domain calculation uses total/100×5.
- Letter-only B: B and grade point 4 retained; no `0/100`; PI explicitly estimated under current estimator.
- Zero CA + zero exam: real total 0, not blank. Both null: no entered score, not automatic F in UI.
- Semester 1: 12 credits at GPA 4; semester 2: 18 credits at GPA 3. Cumulative CGPA = 3.40, not 3.50.
- User updates an older semester course today: timestamp-based Recent updates must include it ahead of an older edit in a higher-level semester.
- Academic-session entry `2022/9999` rejected; `2022/2023` accepted within other configured rules.
- Theme switch while CA draft is `2` must keep that draft and focused field; no remount or route change.

## Journey Gates

| ID | Journey | Completion evidence |
|---|---|---|
| J01 | Visitor → calculator → auth CTA → registration | No lost draft without explanation; working destinations |
| J02 | Email registration, OTP error/resend, finalization | Single setup, valid profile, user-facing errors |
| J03 | Google registration interrupted/resumed | No phase jump; correct provider email; profile guard |
| J04 | From Scratch and complete-history branches | Correct phase count/navigation; placeholders incomplete |
| J05 | Login, safe return path, expired session, sign-out failure | No open redirect or mistaken success |
| J06 | Create semester, input scores, fail save, retry | Correct data, retained draft, correct destination |
| J07 | Read/edit total-only, grade-only, AR records | No fabricated zero/F/CA/exam |
| J08 | OCR/code import → preview → apply → save | No silent overwrite; errors and duplicate resolution |
| J09 | Dashboard recent row → semester → parent → Results nav | Parent is Results; Results tab remains root destination |
| J10 | Insights tabs + metric + what-if + browser history | State preserved, correct URL, no extra AI requests |
| J11 | Transcript preview/PDF/print/share/revoke | Data parity, expiry, accessible overlays |
| J12 | Notifications/permission/clear error | Semantic actions, explicit permission request, state rollback |
| J13 | Settings save/theme/password/delete flows | Section dirty state; provider-aware security; retained failures |
| J14 | Admin login/account switch/403 | Protected content never renders before current-user verification |
| J15 | Users filtering/paging/disable failure | Honest scope, no hidden partial dataset, safe mutations |
| J16 | Catalogue create/edit/delete | Validated fields, state continuity, correct dept mapping |
| J17 | Analytics/monitor real and missing data | No random PI; cap/freshness/empty distinction |
| J18 | Every admin settings section | Valid save/discard/error, no unrelated setting overwrite |

## Visual Capture Matrix

Primary reference screens: Home, registration Academic details, Dashboard, semester editor with keyboard-sized viewport, Insights Forecast and What-if, Transcript, Settings, Admin Users, Admin Settings, API Monitor.

Capture each at 390×844 and 1440×1000, in light and dark. Add 320×740 for registration/recent rows, 768×1024 for shells/tables, 1024×768 for breakpoint behavior, 1920×1080 for max-width, and a short 390×420 viewport for dialog/form keyboard approximation. Also test actual phone keyboards when available; a shortened desktop viewport alone is not proof of IME behavior.

For each capture record route, fixture, theme, viewport, state, and filename. Disable nondeterministic dates/data and wait for fonts. Keep intentional motion in interaction recordings; disable it for static image diffs.

## Manual Interaction Checks

- Tab through every route; visible focus never disappears under sticky headers/bottom nav.
- Open each modal/sheet/drawer from keyboard; test Tab loop, Shift+Tab, Escape, close, backdrop, focus return, and nested combobox.
- On touch, test downward swipe on course/import/share sheets and scrolling their content upward/downward without accidental dismissal.
- Select options using arrows and Enter, then filter to no results and clear. Try long labels and 200% zoom.
- Check full input/error visibility on registration's last field, CA/exam, semester session, and admin textareas with keyboard open.
- Toggle theme with a dialog open and dirty form active. Nothing loses state.
- Exercise reduced motion; no spring, shake, marquee, pulse, smooth auto-scroll, or repeated count-up remains.
- Read a chart without hover using its summary/data table.
- Print a transcript spanning at least 3 A4 pages; no clipped columns, duplicated controls, or lost scores.

## Automated Accessibility Scope

Run axe on ready, empty, error, and open-dialog states of representative routes. Automated passes cannot prove keyboard ergonomics, correct announcements, reading order, contrast on every graph/gradient, or screen-reader usability. Add NVDA/VoiceOver smoke evidence where available.

Fail release on serious/critical violations in changed flows, inaccessible primary actions, unlabeled fields, modal focus escape, clipped form controls, or contrast failure for essential text. Record less severe remaining defects with a bounded fix plan; do not mark a blanket “WCAG certified” result.

## Performance and Build

Capture baseline and after measurements with the same device/network profile. Check public hero LCP, font/image shift, chart JS cost, large admin dataset interactions, and route navigation. Avoid preloading every chart or 3D background on authentication pages.

Run typecheck, lint, relevant tests, then production build. Record exit codes and meaningful warnings. The existing OCR/pdf-parse warning must be evaluated on the current build; do not copy a prior claim that it is harmless without checking whether it changed.

## Evidence and Completion Report

Write implementation evidence under `upgrade/verification/` during the future build: commands/results, journey checklist, screenshot index, accessibility findings, bundle/performance comparison, and known limitations. Files in that folder are future outputs, not present test evidence.

A package completes when its ledger entries have references to evidence. The release candidate completes when all P0/P1 items in the migration scope are verified, primary journeys pass, both themes are visually reviewed, no fake controls/data remain, and production deployment/data migrations have their own authorization.
