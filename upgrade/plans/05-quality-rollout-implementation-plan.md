# Quality and Rollout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce a reviewable release candidate with evidence that the upgraded routes are correct, accessible, responsive, and consistent.

**Architecture:** Shared fixtures and browser coverage validate cross-route behavior; visual baselines and explicit backend gates prevent a cosmetic-only completion claim.

**Tech Stack:** Established application stack and Wave 1 verification tools.

**Spec:** [QA matrix](../08-qa-acceptance.md), [Migration ledger](../07-migration-ledger.md), all route/component specs.

## Global Constraints

This plan prepares a release candidate; it does not authorize production deployment, credential changes, production data migrations, or purchase of services. Verify actual results and report blocked/unrun checks. Use the tasks directly if the named skills are unavailable.

---

## Task Q1 — Complete route boundaries and metadata

Files: create/update `app/not-found.tsx`, `app/error.tsx`, appropriate group error/loading files, public metadata layouts, `lib/ui/route-meta.ts`; inspect `app/robots.ts`, `app/sitemap.ts`, public manifests and `next.config.ts`.

- [ ] Inventory every route against `04` and `11`; no forgotten utility/admin/error page.
- [ ] Add correct titles, headings, loading/retry/denied/missing states and safe navigation. Private/auth/admin routes are not advertised as public crawl destinations.
- [ ] Check share metadata privacy and duplicate layout ownership. Preserve actual public URLs.
- [ ] Resolve offline/PWA messaging against `ServiceWorkerKill`, service worker config and browser behavior. Do not restore caching/sync without an explicit implementation scope.

## Task Q2 — Interaction/accessibility/visual sweep

Files: create `tests/e2e/accessibility.spec.ts`, `tests/e2e/visual.spec.ts`; update `upgrade/verification/` evidence during implementation.

- [ ] Run J01–J18 with ready/empty/error/long-content fixtures. Record pass/fail/unrun, not just a global assertion.
- [ ] Capture the full light/dark viewport matrix from `08`; inspect reference surfaces and regressions against their accepted package captures.
- [ ] Test keyboard, focus, modal stack, tabs, real touch swipe, reduced motion, 200% zoom, 320px reflow, and phone keyboard visibility.
- [ ] Run `npm.cmd run test:a11y`; fix serious/critical and task-blocking failures. Document manual assistive-technology coverage and limitations.
- [ ] Verify three-page A4 transcript print and PDF/share semantic parity. Check actual image/QR/download destinations.

## Task Q3 — Performance and consistency cleanup

Files: affected source and barrels; `DESIGN.md` if present, `.cursorrules`, older public/student upgrade docs, `README.md`.

- [ ] Compare public load and dashboard/admin interaction performance against baseline with the same profile. Record measured results, not predicted scores.
- [ ] Inspect chart/Three.js/animation imports and split heavy optional code where justified; retain useful product visuals.
- [ ] Scan for page-local dialogs, raw colors, dead links, unlabelled icon actions, native browser prompts used for in-app workflows, `Math.random()` in data visualizations, and current `next lint` usage.
- [ ] Delete only obsolete code/assets whose consumers have been migrated and checked. Do not delete old brand assets merely because their names look duplicated.
- [ ] Reconcile design documentation and code-rule palette so the next agent follows one token/motion contract. Mark older upgrade notes superseded; do not silently erase useful product history.
- [ ] Verify all imports, route destinations and generated asset paths after cleanup.

## Task Q4 — Final release-candidate evidence

- [ ] Run `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd run test:unit`, `npm.cmd run test:e2e`, `npm.cmd run test:a11y`, and `npm.cmd run build` after the last relevant edits.
- [ ] Inspect complete command outcomes; report warnings and failures without hiding them behind a passing TypeScript result.
- [ ] Review git diff for accidental secrets, mobile-project edits, auth regressions and out-of-scope data mutations.
- [ ] Update `07` statuses and create `upgrade/verification/release-review.md`: scope, screenshots, journeys, test results, accessibility/performance outcomes, indexes/migrations, remaining limitations and recovery notes.
- [ ] Present the release candidate and any concrete deployment/data-migration step requiring authorization. If a required integration gate is unrun or failing, say exactly what remains; do not label it production-ready.

Completion means the requested experience is implemented and verified in the agreed scope, with any genuinely separate deployment action ready for review.
