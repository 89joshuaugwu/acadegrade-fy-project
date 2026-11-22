# Catalogue Assign Implementation Plan

> Executed inline (native) by the building agent. No commits (owner rule §1.3).

**Goal:** Assign free-typed academic names to catalogue entries, fix matching profiles, alias-aware pickers, undo.
**Architecture:** Pure alias/search modules shared by routes, script and pickers; admin routes use chunked Firestore transactions recorded in `_academic_catalog_assignments`.
**Tech Stack:** Next.js 16 route handlers, firebase-admin, Vitest; Expo RN, node:test.
**Spec:** `docs/superpowers/specs/2026-11-22-catalogue-assign-design.md`

## Global Constraints
- Additive API only (§1.5); old APK `selectAcademicCatalog` must accept responses with `aliases`.
- `academic-data.ts` and `academic-search.ts` byte-identical across repos (sha256 check).
- Every admin mutation: `requireAdmin` + `writeAdminAudit`, action `academic-catalog.<verb>`.
- No emails in typed-names responses; display names "First L." only.
- Max 20 aliases/entry, alias 2–80 chars; max 1000 students per assign; scan cap 5000 users; cache 60 s.

## Review Focus
1. Student changed their field between scan and write: chunk transaction re-checks and skips (test: assign skips changed profile).
2. Undo after the student edited again: their new value is kept (test: undo keeps edited profile).
3. Alias that already belongs to another entry: 400, nothing written (test).
4. Department-only legacy `dept` profiles match department typed names (test).
5. Old APK payload with `aliases` and entry `aliases`: parse unchanged (Android test).

### Task 1: Pure alias + search modules
- Create `lib/academic-catalog/aliases.ts`: `cleanAlias(s): string`, `addAlias(entries, entryId, alias): { entries, added: boolean, reason?: 'same-as-name'|'exists'|'cap' }` (throws on cross-entry conflict), `removeAlias(entries, entryId, alias)`, `seedAliases(snapshot, seeds)`, `catalogNameSet(entries, kind)`.
- Create `lib/utils/academic-search.ts` (copy to Android `lib/data/academic-search.ts`): `searchAcademicNames(names, query, aliases?, max?)`.
- Modify `academic-data.ts` (both): append `ACADEMIC_ALIASES`.
- Tests: `tests/unit/academic-catalog-aliases.test.ts`, `tests/unit/academic-search.test.ts` (ESUT, ESUT Agbani, UNILAG, Unilorin, bsc), Android `tests/academic-catalog.test.mjs` additions.

### Task 2: Public catalogue + client merge
- `publicCatalog` adds `aliases`; `mergeCatalogWithDefaults` returns `aliases`; Android `selectAcademicCatalog` returns `aliases` (bundled param may carry them).
- Tests: existing model/client tests + new cases; Android old-shape tolerance.

### Task 3: Pickers
- Web `SuggestField` prop `aliases?`; `matchSuggestions` delegates to `searchAcademicNames`. Register step passes `catalog.aliases?.universities` etc.
- Android `PickerField` prop `aliases?`; register + ProfileDetailsCard pass them.

### Task 4: Assign + undo routes
- `lib/academic-catalog/assign-server.ts` (scan, apply, undo), routes `assign/route.ts`, `assign/undo/route.ts`.
- Tests `tests/unit/admin-academic-assign-route.test.ts` with `queryTestDb` (+ `select` support added to the double).

### Task 5: Typed names + suggestions display names
- `typed-names/route.ts` GET/POST; suggestions GET adds `suggestedBy`; users page opens `?uid=`.
- Tests `tests/unit/admin-academic-typed-names-route.test.ts`, extend suggestions route test.

### Task 6: Admin UI
- Assign dialog (custom searchable picker, split option, Checkbox), Undo notice, typed-names Panel.
- Test: extend `tests/unit/admin-academic-catalog-page.test.tsx`.

### Task 7: Rules + script
- Rules deny-all `_academic_catalog_assignments`, explicit `config/academicCatalog`; test in `tests/unit/firestore-user-rules.test.ts`.
- Script `--aliases` path using `seedAliases`.

### Task 8: Verify
- Touched tests both repos, one typecheck each, sha256 of shared files.
