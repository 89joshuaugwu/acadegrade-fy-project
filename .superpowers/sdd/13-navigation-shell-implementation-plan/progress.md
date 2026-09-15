# SDD ledger — plan: upgrade/13-navigation-shell-implementation-plan.md

Preflight: current main-branch execution is explicitly authorized by the user.

| Tasks | Shared interface/file | Finding |
| --- | --- | --- |
| 1 → 2 | `AcademicProof` precedes navigation shell work | No shared production files. |
| 2 → 3 | Public and student mobile docks share visual behavior, not source state | Keep separate components; both consume shared tokens and safe-area rules. |
| 3 → 4 | `StudentShell.tsx` is shared | Task 3 establishes mobile structure; Task 4 changes desktop-only classes and preserves mobile markup. |
| 2 → 5 | `Navbar` is consumed by all listed public routes | Cross-route pass verifies one shared implementation instead of route copies. |
| 3/4 → 5 | Student shell wraps all authenticated routes | Route pass must not alter Firebase or page data contracts. |

Task 1: red confirmed — `marketing-home.test.tsx` failed because stages 02–04 used 48px sticky increments.
Task 1: implementation applied — sticky offsets are now 96px, 160px, 224px, and 288px.
Task 1: browser investigation found `body { overflow-x: hidden }` establishes the sticky containing block and shifts all stops upward; correction assigned to Task 2 because it owns `app/globals.css`.
Audit ruling: reported missing `#features` and `#how-it-works` targets are false positives — both exist in `AcademicProof.tsx` and `ProductStory.tsx` respectively.
Audit finding accepted for later: public active route state needs verification after Task 2.
Audit finding accepted: student primary navigation duplication is removed by Task 3.
Audit finding deferred: transcript custom overlay accessibility belongs to the transcript-page rebrand after shared navigation, not this shell task.
## User ruling: public mobile navigation

- Rejected the persistent public mobile bottom dock.
- Public mobile navigation must be a hamburger button within the floating top header.
- The hamburger opens a compact accessible menu; no public bottom bar or dock-induced page padding may remain.
- The authenticated student bottom dock remains a separate design and is not affected by this ruling.

Task 1 superseding verification: native sticky cards were replaced by a controlled desktop scroll deck because the fourth card could overtake stages two and three. Focused tests pass 8/8. Browser geometry at stage four confirms card tops at 117px, 181px, 245px, and 309px, preserving the complete 64px sequence while the deck contracts to its final height.

Task 2 complete: public bottom dock deleted; mobile hamburger menu is housed in the top capsule and opens beneath it. A primary CTA remains visible while authentication resolves.
Tasks 3/4 complete: authenticated student mobile dock is floating and safe-area-aware, the student drawer is account-only, and the desktop rail is inset with the matching content offset.
Latest Task 1 browser verification: final stage card tops are 97px, 161px, 225px, and 289px. The section contracts to 150vh and ends at 717px in a 900px viewport, leaving 97px after the deck instead of the previous oversized ledger void.
