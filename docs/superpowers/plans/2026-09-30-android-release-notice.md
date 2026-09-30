# Android Release Notice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin-managed optional or mandatory Android update notice for APK releases.

**Architecture:** Firebase Admin stores a validated release configuration exposed through a public read-only API. Android compares its native build code, refreshes on a 24-hour TTL, and renders an explicit Download CTA.

**Tech Stack:** Next.js routes, Firestore, Expo/React Native, AsyncStorage, native Android build metadata.

**Spec:** `docs/superpowers/specs/2026-09-30-android-release-notice-design.md`

## Global Constraints

- iOS is out of scope.
- Default is disabled; never enable mandatory updates during development.
- Only HTTPS download links; image does not open the link.
- A failed remote check must not newly block app use.

## Review Focus

- Old build with allowIgnore true: Close/outside/back dismisses per release.
- Old build with allowIgnore false: Close/outside/back cannot dismiss.
- Installed build equal to or above latest: no notice.
- Offline or malformed server response: no new mandatory lock.
- Bad/unreachable download link: safe error and admin kill switch path.

---

### Task 1: Version and release policy

**Files:** `lib/mobile-release/config.ts` and tests in web; `acadegrade-mobile/lib/release/policy.ts` and Node tests.

- [ ] Write failing tests for config validation and old/equal/newer build decisions.
- [ ] Implement minimal validators and comparison; verify focused tests.

### Task 2: Web API and admin controls

**Files:** `app/api/mobile-release/route.ts`, `app/api/admin/mobile-release/route.ts`, focused route tests, admin release page/component and tests.

- [ ] Test public read/default, admin authorization, disabled/enabled validation and save.
- [ ] Implement routes and admin form; verify focused tests and typecheck.

### Task 3: Android notice

**Files:** `acadegrade-mobile/lib/release/client.ts`, `components/release/UpdateNotice.tsx`, `app/_layout.tsx`, package/app configuration.

- [ ] Test 24-hour cache, per-build dismissal, optional/required behavior, and failed fetch.
- [ ] Install native version reader compatible with current Expo SDK and create a new Android development build.
- [ ] Mount notice after app ready; verify on emulator with optional and mandatory test configurations.

### Task 4: Verify and track

- [ ] Run web tests/typecheck and Android tests/typecheck/lint.
- [ ] Confirm no mandatory release is enabled in production and update `todo.md` only for verified work.
