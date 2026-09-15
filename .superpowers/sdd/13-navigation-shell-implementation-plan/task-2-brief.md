### Task 2: Build the public capsule and mobile dock

Repository: `C:/Users/joshu/Projects/Acadegrade/acadegrade-web` on the user-authorized main working tree.

Own only these production files:
- Create `components/layout/PublicMobileDock.tsx`.
- Modify `components/layout/Navbar.tsx`.
- Modify `app/globals.css` only for public navigation styling and motion.

The failing contract is already in `tests/unit/public-navigation.test.tsx`; do not modify tests unless an assertion is impossible for a concrete accessibility reason, and report that instead.

Requirements:
- Desktop public navigation is an inset, floating, rounded capsule with class `public-nav-capsule` inside a `public-nav-shell` header.
- Preserve Logo, Features, How it works, About, Calculator, ThemeControl, auth-aware Dashboard or Sign in/Get started.
- Add a mobile-only navigation landmark named `Public mobile dock`, with Home, Features, Calculator links and a Menu button.
- Menu opens an accessible compact modal named `More from AcadeGrade`, class `public-mobile-menu`, above the dock. It contains a navigation landmark named `Public mobile menu`, with How it works and About AcadeGrade plus ThemeControl and auth actions.
- Use safe-area offsets and 44px minimum targets. Avoid horizontal overflow at 320px.
- Add restrained violet/gold capsule-border motion and disable it under `prefers-reduced-motion: reduce`.
- Do not change APIs, Firebase, public URLs, or any student/admin files.

Run: `npm.cmd run test:unit -- tests/unit/public-navigation.test.tsx`
Run: `npm.cmd run typecheck`

Write a full report to `.superpowers/sdd/13-navigation-shell-implementation-plan/task-2-report.md`. Return only status, changed paths, test summary, and concerns. Do not spawn subagents and do not commit.
