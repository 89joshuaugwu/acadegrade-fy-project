# Implementation Handoff for Another AI

Copy the prompt below into the implementation session. Give the agent access to the web repository and this folder. The package is self-contained; optional skill integrations do not replace these written requirements.

## Copy-Ready Prompt

```text
Implement the AcadeGrade web UI/UX upgrade described in acadegrade-web/upgrade.

Start by reading upgrade/README.md, then 01 through 11, and the relevant
implementation plan under upgrade/plans. Inspect the current repository and
git status. The documents are proposals backed by a source audit, not proof
that runtime behavior has been tested or that backend extensions already exist.

The visual direction is Academic Observatory: one AcadeGrade identity with
expressive public pages, a calm student workspace, and a neutral dense admin
console. Preserve the logo, Bricolage/DM Sans/Geist Mono families, academic
terminology, and useful spring interactions. Follow exact token, spacing,
layout, and component decisions. Do not improvise a generic dashboard theme.

Work in waves:
1. Canonical tokens/themes/components/shells and verification harness.
2. Public, authentication, and utility routes.
3. Student routes and academic display correctness.
4. Admin routes and explicitly specified backend dependencies.
5. Cross-theme, responsive, accessibility, motion, print, and build verification.

Before migrating many routes, implement and capture the component gallery,
then one Dashboard, one Academic details phase, and one Admin Users reference
surface in both themes at 390px and 1440px. Compare them against the geometry
and behavior in the spec. Fix shared defects before propagating them.

Preserve all current authentication/finalization/OTP/profile guards and mobile
Firestore compatibility. Do not create accounts or mutate production data for
testing. Do not restore the old direct client registration writes.

Use existing primitives and improve them centrally. No shadcn/Radix/component
library, second toast system, route-local modal, fake data, nonfunctional CTA,
or arbitrary hardcoded color in route code. Use Next Link for navigation and
semantic buttons/forms/tables. Do not nest a button inside a link.

Every migrated screen must have a useful loading, empty, error, forbidden,
pending, and success behavior where relevant. Confirm keyboard focus, 48px
hit areas, mobile keyboard visibility, reduced motion, dark/light/system,
long content, and realistic data. Screenshot only the happy path is not enough.

Read 10-data-and-integration-contracts.md before building admin pagination,
search, analytics, course modes, recent results, or transcript UI. Do not claim
an unavailable backend feature works using a mock. Clearly label scope and
missing data. Remove randomized PI from production analytics. Never display
unknown scores as zero/F, and preserve total-only/grade-only/AR records.

Keep URL tabs/filters and deterministic parent navigation. Insights tab switches
preserve scenario drafts. Results navigation always goes to the result list,
while a recent-course link opens its exact semester/course. Theme changes do
not remount forms. Canonical sheets support sensible swipe and close behavior.

Implement small reviewable packages. Write meaningful regression tests for data
and interaction risks; avoid tests that merely assert class strings. Follow
the task checkboxes, update the migration ledger with actual evidence, and
report exactly which checks ran. If credentials or backend migrations block
a capability, finish independent work and mark that capability unverified.

Do not deploy, alter production data, buy services, or modify the mobile app
without separate authorization. Preserve unrelated user edits. Never read or
print environment secrets into reports. Use .env.local.example for variable
names when necessary.

When handing back a package, report the resulting behavior, affected screens,
validation, screenshots, and remaining limitations. Do not call the app 10/10
or ready solely because TypeScript/build passes.
```

## If the Agent Has a Small Context Window

Do not paste the entire repository at once. Use this sequence per package:

1. Read README and the package plan.
2. Read `03`, `05`, `06`, the specific route section in `04`, and relevant `10` contracts.
3. Inspect only the source paths listed by the task plus their direct dependencies.
4. Implement one task; verify; record evidence in `07` and a short session note.
5. Before ending, record completed task ids, changed paths, tests/results, next task, and unresolved decisions in `upgrade/verification/session-notes.md`.

Resume from the note, not from a fresh redesign. Keep canonical component ownership stable. New facts from the current code override outdated audit observations, but the agent must document that correction rather than silently ignoring a requirement.

## Minimum Delivery Format

For each wave provide: route/component list, screenshots in both themes, test command outcomes, known limits, and ledger update. For backend extensions add request/response examples, authorization validation, index requirements, and migration plan. For a purely visual task do not invent backend changes.

## Common Failure Patterns to Reject During Review

- Every section becomes another rounded glowing card.
- Light mode keeps dark-only dim fills or unreadable white text on pale primary buttons.
- Admin looks like a red version of the student dashboard.
- Numbers count up from zero during every tab/theme/filter change.
- Search/pagination acts only on fetched rows but claims to cover everyone.
- Registration phases change because an auth listener redirected prematurely.
- Recent grades lose their left/middle/right alignment on phone widths.
- An input, sheet footer, or close control sits behind the keyboard.
- Forecast confidence bands, PI data, adoption claims, or testimonials are fabricated.
- A share QR or button is present even though its destination does not exist.
- “Verified” is written in the ledger without a real test or capture.
