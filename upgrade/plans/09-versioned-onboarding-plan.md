# Versioned Onboarding Plan

## Goal

Replace fragile one-time spotlight scripts with a small accessible tour system that can be replayed and updated by version.

## Tasks

1. Create a shared tour definition/overlay with target discovery, missing-target skip, focus management, reduced motion, and responsive placement.
2. Introduce per-tour ids and versions while interpreting existing `tourCompleted` and `resultsTourCompleted` booleans as legacy completion.
3. Keep dashboard and results tours concise; add optional insights, transcript, and admin definitions after their target UI is stable.
4. Add a replay launcher in the relevant Help/Settings surface.
5. Completion writes are additive and failure never blocks navigation.
6. Test keyboard, Escape, Skip, Finish, replay, route changes, missing target, narrow viewport, and reduced motion.

## Acceptance

- No interval polling or forced click is required to progress.
- A tour never opens a menu or submits a form on the user’s behalf.
- Spotlight and tooltip stay in bounds at 320px and 200% zoom.
- Existing users do not unexpectedly repeat a legacy tour unless its version materially changes.
