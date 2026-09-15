# Task 2: Public capsule and mobile dock report

## Status

Implemented the public navigation capsule, mobile dock, compact modal menu, and the requested base overflow correction. No commit was created.

## Production changes

- `components/layout/Navbar.tsx`
  - Reworked the public header into a `public-nav-shell` containing a floating `public-nav-capsule`.
  - Preserved the desktop Logo, Features, How it works, About, Calculator, ThemeControl, and auth-aware Dashboard or Sign in/Get started controls.
  - Replaced the prior mobile header trigger and sheet with `PublicMobileDock`.
- `components/layout/PublicMobileDock.tsx`
  - Added the mobile-only `Public mobile dock` landmark with Home, Features, Calculator, and Menu targets.
  - Added the shared accessible modal named `More from AcadeGrade`, with a `Public mobile menu` landmark, secondary links, ThemeControl, and auth-aware actions.
  - Uses the existing shared `Modal` primitive for focus trapping, Escape/backdrop dismissal, inert background, scroll lock, and focus restoration.
- `app/globals.css`
  - Added capsule border motion using existing violet and gold tokens; the animation is disabled for `prefers-reduced-motion: reduce`.
  - Added safe-area-aware dock/menu spacing, 48px minimum mobile targets, and responsive full-width ThemeControl behavior to prevent narrow-width overflow.
  - Changed only the base horizontal overflow behavior from `overflow-x: hidden` to `overflow-x: clip`. Per supplied browser evidence, this prevents horizontal paint overflow without creating the containing block that prematurely ended AcademicProof sticky positioning.

## Test adjustment

Updated `tests/unit/public-navigation.test.tsx` only because its global `getByRole('link', { name: 'Features' })` query became ambiguous once both valid responsive navigation systems existed in the DOM. The query is now scoped with `within()` to the named desktop navigation or mobile dock landmark. Hiding either responsive link from assistive technologies to satisfy the original global query would be an accessibility regression.

## Verification

- `npm.cmd run test:unit -- tests/unit/public-navigation.test.tsx` — passed: 1 file, 5 tests.
- `npm.cmd run typecheck` — passed.
- `git diff --check -- app/globals.css components/layout/Navbar.tsx tests/unit/public-navigation.test.tsx` — passed; Git emitted only existing LF-to-CRLF advisory warnings.

## Concerns

- The working tree contained unrelated, pre-existing modified and untracked files; they were not changed by this task.
- No separate live-browser pass was run in this task. The base overflow change is based on the user-provided browser evidence; targeted unit and type checks are green.

## Fix round 1 evidence

### Root cause

The dock markup already had Tailwind's `lg:hidden`, but `.public-mobile-dock` later declared `display: grid` in `app/globals.css`. Both declarations have equal selector specificity, so the later custom declaration won in the desktop cascade and left the dock visible at `>= 1024px`.

### Correction

- Moved the grid display ownership to the dock markup: `className="public-mobile-dock grid lg:hidden"`.
- Removed `display: grid` from `.public-mobile-dock`; the custom rule now supplies only dock geometry and visual styling.
- Added a focused regression test that requires `grid` and `lg:hidden` on the dock and verifies that `.public-mobile-dock` has no custom `display` declaration.

### Verification

- `npm.cmd run test:unit -- tests/unit/public-navigation.test.tsx` - passed: 1 file, 6 tests.
- `npm.cmd run typecheck` - passed.

## Architecture ruling: remove public mobile dock

### Changed files

- `components/layout/Navbar.tsx`
  - Added the compact `lg:hidden` hamburger button inside the existing floating public capsule.
  - The button opens the mobile modal and reports its expanded state.
- `components/layout/PublicMobileMenu.tsx`
  - Replaced the former dock component with a compact modal-only mobile menu titled `Navigate AcadeGrade`.
  - The menu contains Features, How it works, About AcadeGrade, Calculator, ThemeControl, and the auth-aware Dashboard or Sign in/Get started action set.
- `components/layout/PublicMobileDock.tsx`
  - Removed.
- `app/globals.css`
  - Removed all public dock selectors, positioning, safe-area offset, and dock-target styles.
  - Retained the desktop capsule and mobile modal-link styling only; no public bottom body padding was added.

### Verification

- Read the updated `tests/unit/public-navigation.test.tsx` without modifying it.
- `npm.cmd run test:unit -- tests/unit/public-navigation.test.tsx` - passed: 1 file, 5 tests.
- `npm.cmd run typecheck` - passed.
- Scoped source check found no `PublicMobileDock` or `public-mobile-dock` references in `components/layout` or `app/globals.css`.
