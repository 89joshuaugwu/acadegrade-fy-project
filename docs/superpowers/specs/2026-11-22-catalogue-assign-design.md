# Academic catalogue: Assign, typed names and aliases (design)

Owner brief 22 Nov 2026 (auto-approved; every decision below is the builder's call).

## Why
13 students saved "ESUT Agbani" (the listed "Enugu State University of Science and Technology, Enugu") but only 2 suggested it. Admins need to point a free-typed name at an existing entry, fix every matching profile in one go, teach the pickers that alias, and undo a mistake.

## Facts found
- Profile fields on `users/{uid}`: `university`, `department` (legacy read-only fallback `dept`, R11: never written), `programme`. Neither Settings screen (web or Android) lets a student change `university`.
- Clients read the catalogue only through `GET /api/academic-catalog` (names arrays + `revision`). Shipped Android `selectAcademicCatalog` only reads `revision` and the three arrays, so extra response fields and extra entry fields are ignored by old APKs.
- `config/academicCatalog` and `_academic_catalog_suggestions` are server-only (default deny / deny-all).
- Inbox shape: `notifications/{uid}/items` `{ title, message, type, read, createdAt, actionUrl }` + RTDB `notif_counts/{uid}/unread` increment (support reply path).
- `_admin_audit` sanitiser caps arrays at 50 items.

## Approaches considered
1. **Assignment record + chunked transactions (chosen).** A claim transaction marks the suggestion, adds the alias and creates `_academic_catalog_assignments/{id}` (status `applying`). Profiles are then updated in chunked transactions (100 users) that also write the inbox item and append `changes.{uid}` to the record, so nothing changes without being recorded. The audit row carries the same changes map (maps are not capped by the sanitiser). Undo replays the record.
2. One giant batch then audit: simplest, but a crash mid-way leaves unrecorded changes and >50 changes truncate in the audit.
3. Client-driven per-user PATCHes: chatty, not atomic, not audited as one action.

## Design
- **Aliases** on entries: `aliases?: string[]`, cleaned text (trim, NFKC, single spaces), deduped by `normalizeCatalogName`, max 20 per entry, 2–80 chars, never equal to another same-kind entry's name or alias (conflict = 400). Pure helpers in `lib/academic-catalog/aliases.ts` (no runtime imports so the sync script can load it).
- **Public catalogue** gains `aliases: { universities: {name: string[]}, departments: {...}, programmes: {...} }` (additive). Web `mergeCatalogWithDefaults` and Android `selectAcademicCatalog` return `aliases` = remote ∪ bundled seeds for names in the final list.
- **Bundled seeds**: `ACADEMIC_ALIASES` appended to `academic-data.ts` (byte-identical in both repos); existing arrays unchanged.
- **Search**: one pure module `academic-search.ts` (byte-identical, web `lib/utils/`, Android `lib/data/`). Rank: exact alias, name prefix, alias prefix or query starting with an alias word ("ESUT Agbani" finds ESUT), compact contains (punctuation-insensitive, so "bsc" finds "(B.Sc.)"). Web `SuggestField` and Android `PickerField` take an optional `aliases` map.
- **Assign** `POST /api/admin/academic-catalog/assign` `{ suggestionId? | (kind, name), entryId, departmentEntryId?, updateAll (default true) }`. Programme split sets `programme` to the programme entry and `department` to the department entry only where the department is blank or already that name (never overwrites a different department). Matching is `normalizeCatalogName` on the field (`department` falls back to `dept`). Capped at 1000 students per action. Other pending suggestions for the same kind+name whose students were updated are marked `assigned` too. Each updated student gets one inbox item, actionUrl `/settings`. University copy: "We matched your university to {name}. If that's not right, contact us from Settings." (Settings cannot change university; department/programme copy is the owner's wording.)
- **Undo** `POST /api/admin/academic-catalog/assign/undo` `{ assignmentId }`: claims `applied -> undoing`, restores each profile only if it still holds the assigned value, deletes the inbox items it created (decrementing unread for unread ones), removes the alias if this action added it and it is still there, returns suggestions to `pending`, marks `undone`. Audited `academic-catalog.assign.undo`.
- **Typed names** `GET /api/admin/academic-catalog/typed-names`: Admin SDK scan of `users` (projection, 5000 doc cap, 60 s in-memory cache, invalidated by assign/undo/ignore), distinct values not matching catalogue names/aliases or ignored, counts only, 200 rows max. `?kind=&name=` returns up to 50 `{ uid, displayName }` on demand (no emails). `POST { action: 'ignore', kind, name }` writes an `ignored` doc into `_academic_catalog_suggestions` (no new collection; the pending queue only lists `pending`). "Add as new entry" reuses the catalogue `add` mutation.
- **Suggestions GET** adds `suggestedBy` ("Chidi O.") from the profile; the UI links to `/admin/users?uid=...`, which the users page now opens in the drawer.
- **Script**: `scripts/sync-academic-catalog.mjs --aliases` (dry run) / `--aliases --apply` pushes seeded aliases additively.
- **Rules**: new deny-all `_academic_catalog_assignments` + text-match test; explicit `config/academicCatalog` deny + test.

## Non-goals
No change to onboarding/signup flows beyond the picker search component, lib/cgpa, tools pages, push sends, FCM topic resync (the daily job catches up), or a university field in Settings.
