# Shared Academic Catalog Design

## Goal and scope

An admin curates university, department, and academic-programme suggestions used by web and Android registration. Students can still finish registration using a missing name. Existing profile strings remain valid. iOS is out of scope.

## Storage and compatibility

Store the bounded catalog entry list and revision in `config/academicCatalog`, updated transactionally through Firebase Admin. Store suggestions separately in a server-only collection. Each entry has a stable ID, kind (`university`, `department`, `programme`), display name, active/archived status, and source. A reviewed suggestion becomes an entry or is rejected/merged. Do not change existing `users` profile field types or require catalog IDs in registration. Materialize the currently bundled defaults when the catalog document is absent; include Computer Engineering. Archive instead of hard-deleting entries referenced by users. Keep versioned public catalog output small and cacheable.

## API and security

`GET /api/academic-catalog` returns active names by kind and a revision; it never returns student data or suggestions. Admin list/mutate/review routes use the existing `requireAdmin` guard. Authenticated users may submit a bounded suggestion after registration. Normalize for duplicate detection, enforce length limits, rate-limit submissions, and never auto-publish user input. Firestore client rules deny direct writes to catalog and suggestions; server routes use Admin SDK.

## Web and Android behavior

Both registrations load the managed catalog as authoritative when valid, showing only current active options. If the request fails, use bundled defaults; free text remains possible. Android keeps `PickerField` for all three fields. A custom value is saved to the profile immediately, with a distinct optional action to suggest it for all users after authentication. Older saved names remain displayed even if an entry is renamed or archived. Web profile settings preserve existing free-text editing.

## Admin experience

One Academic catalog page has University, Department, and Programme tabs, search, add/edit/archive, and a suggestions queue. The edit form warns that changing a catalog name does not rewrite existing student profiles. Approve either creates an active entry or links to an existing duplicate. Reject records a reason. Server validation is authoritative.

## Failure and verification

Registration cannot be blocked by catalog latency or outage. Malformed public payloads are ignored in favor of bundled defaults. Duplicate or concurrent approvals cannot create the same normalized active entry. Tests cover merge/order, custom names, auth and validation, approval/archive, old profiles, and offline fallback on web and Android. No cross-platform behavioral change is claimed until both clients and server pass tests.
