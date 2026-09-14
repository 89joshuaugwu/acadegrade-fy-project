# Public and Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a distinctive public product story and a coherent, dependable account journey.

**Architecture:** Server-render useful public content, isolate interactive demonstrations, share one AuthShell, and retain the current registration controller/finalizer while extracting presentation.

**Tech Stack:** Existing Next/React/Tailwind/Motion/Firebase/RHF/Zod stack plus Wave 1 tests.

**Spec:** [Route specs](../04-route-screen-specs.md), [UX contract](../06-ux-contract.md), [Data contracts](../10-data-and-integration-contracts.md).

## Global Constraints

Wave 1 primitives are prerequisites. No new branding, invented testimonials, offline promises, automatic code copy, direct client registration finalization, or production test accounts. If skills are unavailable, follow these tasks directly. Backend authentication changes require regression evidence, not just updated styles.

---

## Task P1 — Lock account behavior before presentation extraction

Files: inspect `app/(public)/{login,register,forgot-password}/page.tsx`, `lib/auth/{profile,registration-ticket}.ts`, `lib/academic/timeline.ts`, `app/api/auth/register/finalize/route.ts`; create `tests/integration/registration.test.ts`, `tests/e2e/registration.spec.ts`.

- [ ] Record the actual form schema, provider branches, draft key, API payloads and return codes. Reconcile any drift from the audit.
- [ ] Add emulator/integration coverage for setup completion, invalid/expired ticket, disabled signups, repeated finalization, and missing profile guard.
- [ ] Add UI journeys for Google interruption/resume, From Scratch, academic history, field errors, expired ticket after entry, and safe draft reload.
- [ ] Run `npm.cmd run test:unit -- tests/integration/registration.test.ts` with isolated service dependencies and `npm.cmd run test:e2e -- tests/e2e/registration.spec.ts`. If emulator credentials/setup are absent, record the unrun integration gate; mock-only UI passes are not account-integrity proof.

## Task P2 — Shared auth shell and registration phases

Files: create `components/auth/AuthShell.tsx` and `components/auth/registration/{AccountStep,AcademicStep,RecordModeStep,PastSemestersStep,RegistrationProgress}.tsx`; modify current auth pages and `components/ui/ReactiveAuthBackground.tsx` only if still used.

- [ ] Build the 44/56 desktop composition, compact phone header, shared logo/Google button, and stable form/error area.
- [ ] Extract phase presentation while retaining one controller; do not scatter redirect effects among steps.
- [ ] Replace datalists with canonical Select; preserve supported custom academic values; use three-column duration grid on phone and stable validated session/level state.
- [ ] Apply directional phase motion and actual branch step count. Focus phase title/first invalid field and preserve safe drafts.
- [ ] Replace timed completion redirect with a clear action after confirmed finalization. Keep provider email and password capability explicit.
- [ ] Capture registration Academic details at 320px/390px/1440px in both themes, including keyboard-sized viewport and open long institution list.
- [ ] Re-run `npm.cmd run test:e2e -- tests/e2e/registration.spec.ts`. Expected: no step jump, clipped option, lost draft, or inaccessible error.

## Task P3 — Login and password recovery

Files: current login/forgot-password pages; create `tests/e2e/auth-recovery.spec.ts` and route-specific metadata wrappers as needed.

- [ ] Apply AuthShell and canonical fields with one password reveal, proper submit behavior and pending labels.
- [ ] Handle invalid credentials, provider cancellation, missing profile, offline/verification errors, resend cooldown, and new-password validation.
- [ ] Preserve safe redirect/return path and backend error policy. Do not expose raw errors or secrets in toasts.
- [ ] Run `npm.cmd run test:e2e -- tests/e2e/auth-recovery.spec.ts`. Expected: success and all failure states have an understandable next action and retained safe input.

## Task P4 — Home and About

Files: modify `app/(public)/page.tsx`, `app/(public)/about/page.tsx`, relevant metadata; create `components/marketing/{HomeHero,AcademicProof,ProductStory,HomeFAQ}.tsx`.

- [ ] Implement exact section order and geometry from `04`, using existing logo and deterministic academic example.
- [ ] Retain existing actual product/creator facts; revise claims only to match source-supported capabilities. Remove implied university endorsement and unverified offline promises.
- [ ] Prefer static SVG/CSS for the proof artifact, with a small interactive semester selector if it improves understanding. Keep public copy server-renderable where practical.
- [ ] Connect navbar hash links across pages; show real app availability and FAQ answers.
- [ ] Capture Home and About in both themes, wide and phone; verify CTAs, config failure and menu keyboard behavior with `tests/e2e/public-pages.spec.ts`.

## Task P5 — Calculator and code utility

Files: modify `app/(public)/calculator/page.tsx`, `app/(public)/copy-code/page.tsx`, layouts; create `components/calculator/CalculatorWorkspace.tsx`, `tests/e2e/calculator.spec.ts`.

- [ ] Use canonical controls and the editor/result layout, visible valid/invalid/empty values, and mode-specific PI explanation.
- [ ] Preserve a scenario when entering auth only through a deliberate safe draft contract. If unavailable, add an honest leave/copy explanation instead of silent loss.
- [ ] Normalize copy-code theme and valid/invalid/missing/clipboard-failure states without logging/retaining the code.
- [ ] Run `npm.cmd run test:e2e -- tests/e2e/calculator.spec.ts`. Expected: usable keyboard flow, correct result calculation, no fake blank-row F, clear reset/leave behavior.

## Task P6 — Shared transcript and download/system routes

Files: modify `app/(public)/share/[shareId]/page.tsx`, both share layout locations, `app/app/download/ios/page.tsx`, `components/ui/MobileAppDownload.tsx`, `app/{offline,maintenance}/page.tsx`; reuse the transcript model from student Task S5 when available.

- [ ] Resolve share metadata ownership by inspecting the actual route tree; consolidate only redundant code, preserving URL and privacy behavior.
- [ ] Implement ready/404/410/revoked/network recipient states; bind actions to actual share data and expiry.
- [ ] Apply theme-aware app availability using existing configuration. Missing URL means Coming soon and no active QR.
- [ ] Add branded offline/maintenance/error states with meaningful destinations and honest capabilities.
- [ ] Run `npm.cmd run test:e2e -- tests/e2e/public-pages.spec.ts` with share/download/system fixtures.
- [ ] Run typecheck, lint, and build; record route captures and P entries in `07`.

Next: complete student transcript parity before calling public shared documents verified.
