# AcadeGrade Web Experience Upgrade

This folder is the implementation source of truth for upgrading the AcadeGrade web product. It is intentionally documentation-only: creating this package changed no route, component, style, dependency, data model, or runtime behavior.

The objective is not a cosmetic reskin. The upgrade should make the public site persuasive, the student product calm and motivating, and the admin console precise and operational—while making all three feel unmistakably like AcadeGrade in professional light and dark themes.

## Read This First

Use the documents in this order:

1. [Current-state audit](./01-current-state-audit.md) — evidence, strengths, risks, and route inventory.
2. [Design direction](./02-design-direction.md) — the proposed visual and product direction, with concrete layout decisions.
3. [Design-system specification](./03-design-system-spec.md) — tokens and canonical component contracts.
4. [Route and screen specifications](./04-route-screen-specs.md) — required experience for every route.
5. [Motion, responsive, and accessibility](./05-motion-responsive-accessibility.md) — cross-cutting behavior.
6. [UX interaction contract](./06-ux-contract.md) — navigation, forms, feedback, async, permissions, and destructive actions.
7. [Migration ledger](./07-migration-ledger.md) — exact source-to-target mapping and priority.
8. [QA and acceptance](./08-qa-acceptance.md) — release gates and test matrix.
9. [Data and integration contracts](./10-data-and-integration-contracts.md) — existing APIs, correctness fixes, backend dependencies, and deferred work.
10. [Source inventory](./11-source-inventory.md) — all 197 tracked files and easily missed features to preserve.
11. [AI handoff prompt](./09-ai-handoff-prompt.md) — copy-ready instructions for an implementation agent.
12. [Production expansion](./12-production-expansion-design.md) — email, ads, onboarding, SEO, provider architecture, and the mobile compatibility boundary.
13. Implementation plans — [Foundations](./plans/01-foundation-shells-implementation-plan.md), [Public/auth](./plans/02-public-auth-implementation-plan.md), [Student](./plans/03-student-product-implementation-plan.md), [Admin](./plans/04-admin-console-implementation-plan.md), [Quality/rollout](./plans/05-quality-rollout-implementation-plan.md), [Public/SEO/auth polish](./plans/06-public-seo-auth-polish-plan.md), [Email](./plans/07-email-rebrand-plan.md), [Advertising](./plans/08-advertising-control-plane-plan.md), and [Versioned onboarding](./plans/09-versioned-onboarding-plan.md).

When two documents appear to conflict, use this precedence:

1. Security, data integrity, and existing working business behavior.
2. `06-ux-contract.md` for behavior.
3. `03-design-system-spec.md` for component and token implementation.
4. `04-route-screen-specs.md` for route composition.
5. `02-design-direction.md` for aesthetic interpretation.
6. Existing `DESIGN.md` only where this package is silent.

## North Star

**AcadeGrade is an academic observatory, not a generic school portal.** It turns scattered semester results into a trustworthy degree ledger: what happened, where the student stands, and what to do next.

The signature visual is the **Degree Meridian**: a calibrated CGPA/PI trajectory that appears as an expressive proof point in public pages, a useful analytical device in student pages, and a restrained reference in admin pages. It replaces random glow and decorative gradients with a product-specific visual language.

## Non-Negotiables

- Preserve the repaired registration guarantees: profile-completion guard, server finalization, setup completion, OTP registration ticket, disabled-signup enforcement, Google identity support, draft persistence, and deterministic step progression.
- Never present generated, estimated, or sample data as real platform data. The current randomized admin PI scatter must be replaced or clearly labeled as unavailable—not restyled.
- Support `light`, `dark`, and `system` theme choices across public, student, admin, overlays, charts, print views, loading states, and error states.
- Meet WCAG 2.2 AA for contrast, keyboard use, focus, semantics, zoom, reduced motion, and status announcements.
- Use one canonical implementation for each primitive. No page-local modal, select, toast, table, upload field, skeleton, or segmented-control clone.
- Use semantic tokens in route code. Raw hex values belong only in the token layer, print-only transcript CSS, brand assets, or documented third-party marks.
- Keep state in the URL when it changes what an admin sees or what an insights link should reopen: tabs, query, filters, sort, page, date range, and expanded record where appropriate.
- Do not make every section a floating card. Use page structure, rules, tonal sections, tables, and whitespace deliberately.
- Motion must explain hierarchy or change. Continuous pulses, blanket blur transitions, universal count-up effects, and universal hover lifts are out.
- Desktop, tablet, mobile, keyboard-only, 200% zoom, slow network, empty data, partial failure, and permission-denied states are first-class requirements.
- Existing mobile-facing HTTP contracts are immutable during this web rollout. New server capabilities must be additive or versioned and must not require a mobile rebuild.

## Delivery Order

| Wave | Scope | Outcome |
|---|---|---|
| 1 | Foundations and shells | Themes, tokens, canonical primitives, route metadata, responsive student/admin shells |
| 2 | Public and authentication | Distinctive public story, coherent auth, authored registration selection, branded utility/system pages |
| 3 | Student product | Dashboard, results, insights, transcript, notifications, and settings aligned to one operating model |
| 4 | Admin console | High-density, trustworthy operations UI with real tables, safeguards, and truthful analytics |
| 5 | Quality and rollout | Accessibility, visual regression, performance, analytics, migration cleanup, staged release |

Do not redesign all pages in parallel before Wave 1 is stable. A screen is not migrated until it uses the canonical primitives and passes its state, theme, responsive, keyboard, and reduced-motion checks.

## Definition of “Superb”

The upgrade is complete when:

- A first-time visitor can understand the product, trust it, and choose a clear next action without reading a feature wall.
- A student can add, inspect, forecast, export, and share academic records with predictable navigation and feedback.
- An administrator can scan, filter, compare, and safely act on platform data without decorative noise or fabricated insight.
- Light and dark modes feel intentionally art-directed rather than inverted.
- Every route has a title, landmark structure, loading/empty/error/success behavior, and responsive composition.
- The UI feels specific to academic performance and AcadeGrade even when the logo is hidden.
