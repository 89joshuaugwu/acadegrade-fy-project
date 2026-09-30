# Shared Academic Catalog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin-curated universities, departments, and programmes appear in web and Android registration without losing free-text or offline registration.

**Architecture:** The web server owns catalog persistence and moderation. A small public endpoint supplies active names to both clients. The existing bundled lists remain offline defaults, and student profiles remain name strings.

**Tech Stack:** Next.js routes, Firebase Admin/Firestore, React, Expo/React Native, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-30-academic-catalog-design.md`

## Global Constraints

- Do not touch the iOS repository.
- Preserve existing profile field types and custom-name registration.
- Deny direct Firestore client writes to catalog and suggestions.
- Protect mutations with `requireAdmin`; user suggestions require authentication and rate limits.

## Review Focus

- Catalog request fails: registration uses bundled lists and still accepts custom names.
- Existing saved name is archived: profile display and edits retain it.
- Duplicate approval races: only one normalized entry is published.
- Malformed/oversized names: route rejects them without changing the catalog.
- Unauthenticated submission/admin mutation: no write occurs.

---

### Task 1: Catalog contract and defaults

**Files:** Create `lib/academic-catalog/model.ts`, `lib/academic-catalog/merge.ts`; modify `lib/utils/academic-data.ts`; test `tests/unit/academic-catalog.test.ts`, `tests/unit/academic-catalog-model.test.ts`.

**Interfaces:** `CatalogKind`, `CatalogEntry`, `PublicCatalog`; `mergeCatalogWithDefaults(remote, defaults)` returns active, deduplicated names by kind.

- [x] Write tests for active remote names, archived names, duplicates, missing payload, and Computer Engineering.
- [x] Run focused Vitest and observe the expected failures.
- [x] Implement the contract and merge; run focused Vitest to green.

### Task 2: Server storage and routes

**Files:** Create `app/api/academic-catalog/route.ts`, `app/api/academic-catalog/suggestions/route.ts`, `app/api/admin/academic-catalog/route.ts`, and focused route tests; modify `firestore.rules`.

**Interfaces:** Public GET returns `{revision, universities, departments, programmes}`. Suggestion POST accepts `{kind, name}`. Admin GET/POST/PATCH supports list, add/edit/archive, approve/reject.

- [ ] Complete route tests for anonymous public read, authenticated suggestion, admin authorization, validation, deduplication, concurrent approval, and archive. Initial public/admin route tests are passing.
- [ ] Observe expected failures for the remaining suggestion and moderation cases.
- [ ] Implement suggestion/review routes and rules; run focused tests to green.

### Task 3: Admin catalog page

**Files:** Create `app/(admin)/admin/academic-catalog/page.tsx` and focused UI tests; modify admin navigation component.

**Interfaces:** Three category tabs, search, add/edit/archive, suggestion queue, approve/reject, loading/error/empty states.

- [ ] Write UI tests for the main admin actions and states; observe failures.
- [ ] Implement page and navigation; verify tests at desktop and narrow widths.

### Task 4: Web registration integration

**Files:** Modify `app/(public)/register/page.tsx`; add focused registration tests.

- [ ] Test managed suggestions, offline fallback, and unchanged free-text submit; observe failures.
- [ ] Integrate read-only catalog fetch and merge; run focused tests to green.

### Task 5: Android integration

**Files:** Modify `acadegrade-mobile/lib/api/client.ts`, `app/(auth)/register.tsx`, and catalog cache/helper; add focused tests or an executable device-test checklist if no mobile test runner exists.

- [ ] Test the University, Department, and Programme pickers with managed names, custom input, saved old names, and offline fallback.
- [ ] Integrate catalog fetch and optional authenticated suggestion submission without blocking registration.
- [ ] Run Android typecheck/lint and registration on emulator/device.

### Task 6: Whole-flow verification and tracking

- [ ] Run web full unit suite, typecheck, lint, and targeted browser registration checks; run Android typecheck/lint/device checks.
- [ ] Update root `todo.md` only for verified completed items; list any unmet checks explicitly.
