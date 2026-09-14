# Upgrade baseline

Recorded on 14 September 2026 before visual foundation changes.

| Check | Result |
|---|---|
| `npm.cmd run typecheck` | Passed |
| `npm.cmd run build` | Passed; existing `pdf-parse` dynamic dependency warning in `/api/results/extract` |
| Legacy `npm.cmd run lint` | Broken because Next 16 treats `next lint` as a project path |
| New ESLint baseline | 263 findings before safety fixes: 136 errors, 127 warnings |
| Safety fixes | Corrected one conditional hook and missing combobox relationship |
| Current legacy debt | 261 warnings: primarily explicit `any`, unused declarations, legacy hook lifecycle patterns, and `<img>` usage |
| Unit baseline | 2 passed, 1 expected failure documenting the 4.495 degree-class boundary gap |

`npm.cmd run lint` reports blocking errors only during migration. `npm.cmd run lint:full` exposes the complete legacy warning inventory. New and materially changed files must not add warnings; warning rules will be restored to errors by migrated slice as debt is removed.
