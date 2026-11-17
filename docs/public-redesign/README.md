# AcadeGrade public website redesign

The plan for rebuilding every public (logged-out) page of `acadegrade-web`, from the landing page to sign-in. The student portal and admin pages are out of scope; they adopt the new colours and type in a later phase.

**Status:** plan only, written 17 November 2026. No code has changed yet.

## The idea in one line

The Nigerian semester result slip becomes the stationery every page is printed on, and AcadeGrade's own logo arc (violet at 0.00, gold at 5.00) becomes the meter that reads it. The home page opens on a live result slip: change a grade and watch your CGPA and class move.

## Read in this order

| File | What it decides |
|---|---|
| [`../../PRODUCT.md`](../../PRODUCT.md) | Product truth: users, purpose, capabilities, brand commitments, evidence |
| [`00-current-site-audit.md`](00-current-site-audit.md) | The "before": measured problems, every route, every claim, what must survive |
| [`01-brand-and-art-direction.md`](01-brand-and-art-direction.md) | The idea, colours from the logo, type, imagery, voice, proof policy, scales |
| [`02-design-system.md`](02-design-system.md) | Tokens, grid, stationery edges, every shared component, states, accessibility, performance, Definition of Done |
| [`03-motion-and-interaction.md`](03-motion-and-interaction.md) | Motion tokens, the signature move, entrances, feedback, reduced motion |
| [`04-site-map-navigation-seo.md`](04-site-map-navigation-seo.md) | Every route and its mode, shells, header/footer, calls to action, redirects, SEO |
| [`05-owner-decisions.md`](05-owner-decisions.md) | Every open question from all plans in one list, with recommendations and launch blockers |
| [`pages/`](pages/) | One plan per public page (below) |

## Page plans

| Page | Plan | Mode |
|---|---|---|
| Home `/` | [`pages/home.md`](pages/home.md) (the exemplar the others follow) | Persuade |
| Features `/features` | [`pages/features.md`](pages/features.md) | Persuade |
| Result scanner | [`pages/features-result-scanner.md`](pages/features-result-scanner.md) | Persuade |
| AcadeMind (`/features/ai-insights`) | [`pages/features-academind.md`](pages/features-academind.md) | Persuade |
| Timetable (new) | [`pages/features-timetable.md`](pages/features-timetable.md) | Persuade |
| Android app `/app` (new) | [`pages/android-app.md`](pages/android-app.md) | Persuade |
| iPhone `/app/download/ios` | [`pages/download-ios.md`](pages/download-ios.md) | System |
| Calculator | [`pages/calculator.md`](pages/calculator.md) | Operate |
| Free tools hub `/tools` (new) | [`pages/tools-hub.md`](pages/tools-hub.md) | Operate |
| Degree class checker | [`pages/tool-degree-class-checker.md`](pages/tool-degree-class-checker.md) | Operate |
| Required GPA | [`pages/tool-required-gpa.md`](pages/tool-required-gpa.md) | Operate |
| Carry-over impact | [`pages/tool-carry-over-impact.md`](pages/tool-carry-over-impact.md) | Operate |
| Weighted average | [`pages/tool-weighted-average.md`](pages/tool-weighted-average.md) | Operate |
| About | [`pages/about.md`](pages/about.md) | Read |
| Support | [`pages/support.md`](pages/support.md) | Read |
| Privacy notice | [`pages/legal-privacy.md`](pages/legal-privacy.md) | Read |
| Terms of use | [`pages/legal-terms.md`](pages/legal-terms.md) | Read |
| Delete your account | [`pages/account-deletion.md`](pages/account-deletion.md) | Read |
| Sign in | [`pages/login.md`](pages/login.md) | Operate |
| Create account | [`pages/register.md`](pages/register.md) | Operate |
| Reset password | [`pages/forgot-password.md`](pages/forgot-password.md) | Operate |
| Shared transcript | [`pages/share-transcript.md`](pages/share-transcript.md) | System |
| Shared course list `/c/[code]` | [`pages/share-course-code.md`](pages/share-course-code.md) | System |
| Maintenance | [`pages/maintenance.md`](pages/maintenance.md) | System |
| Offline | [`pages/offline.md`](pages/offline.md) | System |
| 404 | [`pages/not-found.md`](pages/not-found.md) | System |

Every page plan uses the same 13 headings: purpose, argument, first screen, copy deck, sections, imagery, motion, components, SEO, accessibility, carried/replaced/removed, acceptance checklist, owner items.

## Build roadmap

Each phase ships on its own and passes the gate in `02` §8 before the next starts. Old pages keep working until their replacement ships.

| Phase | Scope | Notes |
|---|---|---|
| **A · Foundation** | `public.css` tokens; Hanken Grotesk; `app/(public)/layout.tsx` with the new header, menu sheet, footer and cookie stub; logo SVGs (vectorised); image pipeline and credits registry; fix `next.config.ts` caching; drop the background PNGs, `three` and dead components | The site looks new around the old content right away |
| **B · Home** | The live slip, Scale, showcase slips, itinerary, sheets, proof (preview-gated), letter, FAQ, reply card | The biggest win; needs the campus photographs downloaded and credited |
| **C · Product pages** | Features, scanner, AcadeMind, timetable, Android app, iPhone page | Real interface fragments built from the student components |
| **D · Calculator and tools** | Calculator, tools hub, four tools, shared `scales.ts` | Tools become discoverable; strong SEO value |
| **E · Company and legal** | About, support, privacy, terms, account deletion | Legal content stays admin-driven |
| **F · Auth** | Sign in, create account, reset password | Restyle only; flows unchanged; heaviest testing |
| **G · System** | Shared transcript, shared course list, maintenance, offline, 404 | Minimal shell; must render when services are down |
| **H · Proof** | Admin screen for testimonials (approve, hide) and the count threshold; preview mode | Turns on automatically once real quotes and numbers exist |
| **Later** | Carry the palette and type into the student portal and Android app; `/grading-scales/[scale]` when a second scale goes live | Out of scope for this redesign |

Implementation follows the superpowers `writing-plans` → test-driven development → verification loop, one phase at a time, with the tasteskill and Impeccable gates on every page and both full test suites run once per phase.

## Things only the owner can provide

1. A short screen recording of scanning a result slip on your phone (6–10 seconds, no personal data).
2. A portrait for the founder letter (optional) and confirmation of its wording.
3. Real, consented student quotes when ready (the design shows sample quotes in an admin preview only).
4. The CountLine threshold (default 100 students).
5. The custom domain, once bought (canonical URLs and Open Graph use it).
