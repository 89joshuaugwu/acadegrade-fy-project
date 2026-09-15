### Tasks 3 and 4: Authenticated student navigation shell

Repository: `C:/Users/joshu/Projects/Acadegrade/acadegrade-web` on the user-authorized main working tree.

Own only these production files:
- Modify `components/layout/BottomTabBar.tsx`.
- Modify `components/layout/MobileDrawer.tsx`.
- Modify `components/layout/StudentShell.tsx`.

The failing contracts are already in `tests/unit/mobile-drawer-navigation.test.tsx` and `tests/unit/student-shell.test.tsx`. Do not modify tests unless an assertion is impossible for a concrete accessibility reason, and report that instead.

Requirements:
- Preserve `studentNavigation`, all existing routes, active-route semantics, IDs consumed by the onboarding tour, notification badges, insight-stale indicator, and auth/sign-out behavior.
- Redesign `BottomTabBar` as a floating mobile/tablet dock: `fixed inset-x-3`, rounded with `rounded-[var(--radius-dialog)]`, bordered elevated surface, safe-area-aware bottom position, four equal primary destinations, and 44px minimum targets. Keep `aria-current` and reduced-motion behavior.
- Increase `StudentShell` mobile bottom content clearance so the dock never covers page controls.
- Make `MobileDrawer` account-only for students. Keep profile, Settings, Notifications, ThemeControl, and Sign out. Remove student primary navigation duplication, Quick calculator, and About AcadeGrade. Admin behavior must remain unchanged.
- Rebrand the student desktop aside as an inset 240px rail using `inset-y-4 left-4 rounded-[var(--radius-dialog)]`; retain the four primary destinations and bottom utilities. Main content uses `lg:ml-[calc(var(--student-rail-width)+2rem)]`.
- Keep responsive behavior unchanged below `lg` except for the improved dock/drawer; no data, Firebase, API, or admin navigation changes.

Run: `npm.cmd run test:unit -- tests/unit/student-shell.test.tsx tests/unit/mobile-drawer-navigation.test.tsx`
Run: `npm.cmd run typecheck`

Write a full report to `.superpowers/sdd/13-navigation-shell-implementation-plan/task-3-4-report.md`. Return only status, changed paths, test summary, and concerns. Do not spawn subagents and do not commit.
