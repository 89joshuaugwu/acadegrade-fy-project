# Tasks 3 and 4 report: authenticated student navigation shell

## Status

Complete. The authenticated student navigation shell now uses the approved floating mobile/tablet dock, an account-only student drawer, and an inset desktop workspace rail. Public navigation and `app/globals.css` were not changed.

## Changed paths

- `components/layout/BottomTabBar.tsx`
  - Converted the student tab bar into a bordered, elevated floating dock with `inset-x-3` and the shared dialog radius.
  - Added safe-area-aware bottom positioning and retained four equal primary destinations.
  - Preserved route-aware `aria-current`, onboarding IDs, insight-stale indicator, and reduced-motion active states.
  - Kept every tab target at a minimum of 44px and added an explicit keyboard focus treatment.
- `components/layout/MobileDrawer.tsx`
  - Removed duplicated student Dashboard, Results, Insights, and Transcript links.
  - Removed Quick calculator and About AcadeGrade from the signed-in student drawer.
  - Preserved the student profile, Settings, Notifications with unread badge, theme control, and sign-out behavior.
  - Left the admin drawer branch and `adminNavigation` unchanged.
- `components/layout/StudentShell.tsx`
  - Reworked the desktop sidebar into an inset 240px rail using `inset-y-4 left-4 rounded-[var(--radius-dialog)]`.
  - Updated the desktop main-content offset to `lg:ml-[calc(var(--student-rail-width)+2rem)]`.
  - Increased mobile/tablet bottom clearance to keep controls above the floating dock and device safe area.
- `.superpowers/sdd/13-navigation-shell-implementation-plan/task-3-4-report.md`
  - Added this implementation and verification report.

## Test evidence

### Focused unit contracts

Command:

```text
npm.cmd run test:unit -- tests/unit/student-shell.test.tsx tests/unit/mobile-drawer-navigation.test.tsx
```

Result: passed with 2 test files and 3 tests; exit code 0.

The same command was run before implementation and failed with the expected three contract failures: duplicated student drawer navigation, missing inset desktop rail classes, and missing floating dock classes.

### TypeScript

Command:

```text
npm.cmd run typecheck
```

Result: `tsc --noEmit` passed; exit code 0.

### Diff validation

Command:

```text
git diff --check -- components/layout/BottomTabBar.tsx components/layout/MobileDrawer.tsx components/layout/StudentShell.tsx
```

Result: passed; exit code 0. Git emitted only the repository's LF-to-CRLF working-copy notices.

## Concerns

- No functional blockers were found.
- This task intentionally did not alter the public mobile navigation. The public rejection of a bottom bar therefore does not affect the approved signed-in student dock.
- Browser-level authenticated viewport inspection was outside the brief; responsive behavior is implemented through the existing `lg` boundary and covered by the focused shell contracts.
