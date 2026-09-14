# Foundations and Shells Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish a complete light/dark/system design system and accessible shared UI before migrating routes.

**Architecture:** Improve existing primitives in place; separate typed domain presentation from data hooks; keep stable route shells. Add only the missing canonical primitives and a development preview.

**Tech Stack:** Existing Next 16/React 19/Tailwind 4/Motion/next-themes stack; compatible test tooling added as development dependencies.

**Spec:** [Design system](../03-design-system-spec.md), [Motion/accessibility](../05-motion-responsive-accessibility.md), [UX contract](../06-ux-contract.md).

## Global Constraints

This plan is for a future implementation session. If named skills are unavailable, use the task instructions directly; they contain the required workflow. Keep the current repository cleanly attributable, preserve unrelated edits, and do not deploy or mutate production data. Reconcile the proposed token changes with `.cursorrules`/`DESIGN.md` during implementation, not by applying conflicting systems simultaneously. No component-library replacement.

---

## Task F1 — Establish baseline and meaningful verification

Files: inspect `package.json`, `package-lock.json`, `tsconfig.json`, `next.config.ts`; create `eslint.config.mjs`, `vitest.config.ts`, `playwright.config.ts`, `tests/setup.ts`, `tests/fixtures/{academic,accounts,admin}.ts`; update package scripts.

- [ ] Record git status and current build/typecheck results before source changes. Record existing warnings as baseline, not automatically accepted forever.
- [ ] Add compatible pinned testing/lint development packages and the scripts specified in `08`. Preserve the existing webpack build choice. Configure lint with Next's ESLint package and document any baseline exclusions precisely.
- [ ] Create deterministic fixtures with the exact numeric cases in `08`; no live credentials. Establish a Firebase emulator/test-project boundary for later account integration checks.
- [ ] Add one meaningful regression test for known course-mode or classification behavior, initially capturing the current failure. Do not “fix” the fixture to match the defect.
- [ ] Run `npm.cmd run typecheck`, `npm.cmd run lint`, and the new test runner. Expected: runners execute; known baseline failure is documented separately until Task S1 resolves it.

## Task F2 — Theme tokens and choice

Files: modify `app/globals.css`, `app/layout.tsx`, `.cursorrules`; create `components/ui/ThemeControl.tsx`, `tests/unit/theme-contrast.test.ts`.

- [ ] Inventory currently referenced color variables, including grade/class/dim tokens. Map every one to `03`; do not leave accidental dark inheritance in light mode.
- [ ] Implement one value definition per theme and variable-referencing Tailwind aliases. Add accent foreground, control-border, chart, radius, shadow, spacing, and layer tokens.
- [ ] Use system default for new users while preserving existing stored preference; add mounted-stable choice control and correct `color-scheme`.
- [ ] Add contrast tests for actual normal-text/accent-button/control pairs and browser checks for theme switching with a dirty input/open dialog.
- [ ] Run `npm.cmd run test:unit -- tests/unit/theme-contrast.test.ts`. Expected: all declared accessible foreground/background pairs meet their criteria; decorative borders are excluded with explicit reasoning.

## Task F3 — Actions, fields, selection, and tabs

Files: modify `components/ui/{Button,Input,Select,Switch,Toggle,Badge,Card,index}.tsx` where corresponding files exist (`index.ts` is the barrel); create `LinkButton.tsx`, `IconButton.tsx`, `Textarea.tsx`, `FormField.tsx`, `Tabs.tsx`, `SegmentedControl.tsx`, `components/forms/FormSection.tsx`.

- [ ] Add interaction tests `tests/unit/controls.test.tsx` for button/link semantics, disabled switch, accessible errors, and tab keyboard navigation.
- [ ] Implement explicit button types, correct accent foreground, stable pending geometry, and 48px targets. Remove universal scale/glow defaults.
- [ ] Improve Input and add textarea/field composition. Preserve forwarded refs and react-hook-form compatibility. Password reveal remains singular and labeled.
- [ ] Implement Tabs and SegmentedControl with the semantics and ownership in `03`. Leave compatibility adapters for existing consumers until migrated.
- [ ] Upgrade Select desktop keyboard/ARIA/long-option behavior. Its mobile sheet presentation follows Task F4; do not create a separate option state machine.
- [ ] Run `npm.cmd run test:unit -- tests/unit/controls.test.tsx`. Expected: keyboard selection and errors work without pointer use or duplicate interactive elements.

## Task F4 — Overlay core and sheet behavior

Files: modify `components/ui/Modal.tsx`, `components/layout/MobileDrawer.tsx`; create `components/ui/Sheet.tsx`, `tests/unit/overlay.test.tsx`, `tests/e2e/overlays.spec.ts`.

- [ ] Write tests for initial focus, Tab/Shift+Tab, disabled fields, Escape, background close, focus return, and `confirm.requireText` enforcement.
- [ ] Implement portal/layer ownership, one focus trap, inert background, nested-select ownership, and reference-counted body scroll locking.
- [ ] Add header/body/footer layout and available-viewport sizing. Build Sheet as a shared overlay presentation with scroll-aware drag handling.
- [ ] Add real-browser tests for handle drag, body scroll at/nonzero offset, keyboard-sized viewport, dirty dismissal, and theme changes while open.
- [ ] Run `npm.cmd run test:unit -- tests/unit/overlay.test.tsx` and `npm.cmd run test:e2e -- tests/e2e/overlays.spec.ts`. Expected: every supported close path works; scrolling/typing never unintentionally dismisses.

## Task F5 — Table, shared states, charts, and motion

Files: improve `Skeleton.tsx`, `components/shared/{EmptyState,SkeletonCard,PageTransition}.tsx`, `components/charts/{TrendChart,ForecastChart}.tsx`; create `components/ui/{DataTable,Pagination,Disclosure,InlineNotice}.tsx`, `components/shared/{ErrorState,PageHeader,RouteAnnouncer}.tsx`, `components/charts/ChartFrame.tsx`, `lib/ui/{motion,chart-theme,feedback,route-meta}.ts`.

- [ ] Implement semantic read-only tables with caption, sort, numeric alignment, disclosure, and empty/error/loading continuity. Do not implement an ARIA grid unless needed and fully supported.
- [ ] Centralize chart surfaces/legend/summary; keep data calculations unchanged until academic adapters are verified.
- [ ] Add feedback wrapper without replacing react-hot-toast. Use sanitized errors and stable operation ids.
- [ ] Implement route-entry motion and tab/sheet springs from `05`; no unsupported App Router exit tricks. Add reduced-motion CSS and hook coverage.
- [ ] Implement PageHeader and the requested downward content seam; verify at top, 16px, 48px, and reverse scroll. Avoid sticky-content duplication.

## Task F6 — Shell migration and authorization rendering

Files: modify `components/layout/{Navbar,PublicShell,StudentShell,AdminShell,BottomTabBar,NotificationDropdown}.tsx`, `app/(student)/layout.tsx`, `app/(admin)/layout.tsx`; create `tests/e2e/navigation.spec.ts`, `tests/e2e/admin-access.spec.ts`.

- [ ] Replace duplicate route navigation with a shared route map and correct active-parent handling. Preserve tour ids until tour migration.
- [ ] Add ThemeControl to every shell; apply exact widths/breakpoints from `02`; reserve bottom-nav space.
- [ ] Move notification-permission prompt behind an explicit action and retain permission status in settings flow.
- [ ] Key admin verification to current uid; reset approval during identity changes; distinguish denied/network errors. Test transition from admin login before protected children mount.
- [ ] Add route title/announcement and proper landmarks without duplicate h1s. Public/auth metadata remains server-owned where already available.
- [ ] Run `npm.cmd run test:e2e -- tests/e2e/navigation.spec.ts tests/e2e/admin-access.spec.ts`. Expected: parent result nav, account changes, drawers, safe return paths, and denied states behave correctly.

## Task F7 — Reference gallery and foundation checkpoint

Files: create `app/design-preview/page.tsx`, `components/design/ComponentGallery.tsx`, `tests/e2e/design-system.spec.ts`.

- [ ] Gate preview to development/test; production calls `notFound()` before rendering. Use fixture data only.
- [ ] Render full state matrix including long options, dense table, modal+select, validation, failure, and pending actions.
- [ ] Capture 390px/1440px light/dark and 320px form/table cases; inspect keyboard and reduced-motion behavior.
- [ ] Run `npm.cmd run typecheck`, `npm.cmd run lint`, relevant unit/e2e tests, then `npm.cmd run build`.
- [ ] Update F entries in `07` with actual evidence and a reviewable diff checkpoint. Do not migrate every route until the shared defects exposed here are resolved.

Next: [Public/auth plan](./02-public-auth-implementation-plan.md), followed by student/admin packages using the same primitives.
