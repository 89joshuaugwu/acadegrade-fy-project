# AcadeGrade Navigation Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace generic public and student navigation with responsive AcadeGrade navigation that remains usable from 320px through desktop widths.

**Architecture:** `Navbar` owns the public desktop capsule and compact mobile hamburger menu. Public pages never render a persistent bottom dock. `BottomTabBar`, `MobileDrawer`, and `StudentShell` divide authenticated mobile primary navigation, account utilities, and desktop workspace navigation without duplicating destinations. Shared route metadata remains the single source of labels and hrefs.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS, Motion, Lucide, Vitest, Testing Library, Playwright browser checks.

**Spec:** `upgrade/02-design-direction.md`, `upgrade/04-route-screen-specs.md`, and the approved navigation direction in the project conversation.

## Global Constraints

- Preserve the existing public URLs and the four student URLs: `/dashboard`, `/results`, `/insights`, and `/transcript`.
- Do not change Firebase, API, Firestore, or mobile-app contracts.
- Keep all interactive targets at least 44px high and support keyboard focus, Escape dismissal, focus return, and reduced motion.
- The public mobile menu and authenticated student dock must include safe-area padding and must not cover page controls.
- At 320px there must be no horizontal document overflow.
- Do not copy the Framer component; adapt its restrained glow and capsule silhouette to AcadeGrade’s violet/gold academic identity.

---

### Task 1: Stabilize the academic proof stack

**Files:**
- Modify: `components/marketing/AcademicProof.tsx`
- Test: `tests/unit/marketing-home.test.tsx`

**Interfaces:**
- Consumes: the existing four ordered proof stages.
- Produces: a controlled desktop scroll deck with four visible 64px stair-step headers and a compact final height; mobile remains normal document flow.

- [x] **Step 1: Write a failing test asserting an ordered four-stage desktop deck.**
- [x] **Step 2: Run the focused unit test and confirm the existing native sticky stack collapses.**
- [x] **Step 3: Apply controlled stage progression and 64px desktop offsets without adding mobile sticky behavior.**
- [x] **Step 4: Verify unit and browser stack positions.**

### Task 2: Build the public capsule and mobile hamburger menu

**Files:**
- Create: `components/layout/PublicMobileMenu.tsx`
- Modify: `components/layout/Navbar.tsx`
- Modify: `app/globals.css`
- Test: `tests/unit/public-navigation.test.tsx`

**Interfaces:**
- Consumes: public route links and `useAuth()` state.
- Produces: a mobile hamburger inside `Navbar` and `PublicMobileMenu({ user, loading })`; the menu exposes Features, How it works, About, Calculator, theme, and account actions without a persistent bottom bar.

- [x] **Step 1: Write failing tests for the floating desktop capsule and compact mobile hamburger menu.**
- [x] **Step 2: Run the tests and confirm the new capsule/menu assertions fail.**
- [x] **Step 3: Implement the capsule header, animated restrained border, hamburger, and compact accessible menu.**
- [x] **Step 4: Verify unit tests and 390px/1440px browser geometry.**

### Task 3: Refine authenticated mobile navigation

**Files:**
- Modify: `components/layout/BottomTabBar.tsx`
- Modify: `components/layout/MobileDrawer.tsx`
- Modify: `components/layout/StudentShell.tsx`
- Test: `tests/unit/mobile-drawer-navigation.test.tsx`
- Test: `tests/unit/student-shell.test.tsx`

**Interfaces:**
- Consumes: `studentNavigation`, route activity, notification count, profile, and theme state.
- Produces: a floating four-item primary dock plus an account-only drawer containing profile, notifications, settings, theme, and sign-out.

- [x] **Step 1: Write failing tests that reject duplicated primary links, Quick Calculator, and About in the account drawer.**
- [x] **Step 2: Run the tests and confirm they fail against the existing drawer.**
- [x] **Step 3: Implement the floating dock and account-only drawer with safe-area clearance.**
- [x] **Step 4: Verify active route ownership and notification state in the focused shell tests.**

### Task 4: Rebrand the student desktop workspace rail

**Files:**
- Modify: `components/layout/StudentShell.tsx`
- Test: `tests/unit/student-shell.test.tsx`

**Interfaces:**
- Consumes: shared student navigation, profile, route metadata, notifications, and theme state.
- Produces: an inset 240px academic rail and adjusted main-content offset without changing page routes.

- [x] **Step 1: Write failing tests for the inset rail and adjusted main-content offset.**
- [x] **Step 2: Run tests and verify failure against the edge-to-edge sidebar.**
- [x] **Step 3: Implement the rounded rail, restrained active glow, utility footer, and content offset.**
- [x] **Step 4: Run focused tests and typecheck; authenticated browser checks remain part of the cross-route pass.**

### Task 5: Cross-route acceptance pass

**Files:**
- Modify only files with reproduced route-specific navigation defects.
- Test: relevant files under `tests/unit/`.

**Interfaces:**
- Consumes: completed shared navigation shells.
- Produces: consistent public and student route behavior without data-layer changes.

- [ ] **Step 1: Test Home, About, Calculator, Login, Register, Dashboard, Results, Insights, Transcript, Notifications, and Settings at representative widths.**
- [ ] **Step 2: Record any reproducible shell defect with a failing focused test.**
- [ ] **Step 3: Apply only the smallest route-specific corrections required.**
- [ ] **Step 4: Run the full affected test suite and browser geometry audit.**
