# Android House Bridge Implementation Plan

Approved spec: user handoff in this session. Work in the shared checkout; no commits, deployment, iOS, generic API client edits, full suite or typechecks.

Architecture: independent config/mobileHouseAds switches share validated existing website creatives. Public DTO excludes admin metadata. Android selection preserves schedule, weight, local caps, then falls back to legacy. Existing web master switch does not govern Android delivery.

- [ ] Test-first config validation and public sanitization in lib/ads/house.ts and tests/unit/house-ads.test.ts. Verify with focused Vitest.
- [ ] Test-first authenticated GET/PUT /api/admin/ads/house and read-only /api/ads/house, using config/mobileHouseAds and read-only config/settings. Verify auth, malformed config, storage failures, independent writes.
- [ ] Test-first MobileHouseAdsEditor with existing Card/Switch/Button/tokens, independent dirty/save/error state; integrate only admin ads Android tab. Verify focused editor and existing page tests.
- [ ] Test-first mobile lib/ads/house.ts selection/caps, lib/api/house.ts bounded public fetch, components/ads/HousePromotion.tsx visibility/focus/foreground and HTTPS links. Add only overview-screen integrations. Verify focused Node tests.

Review focus: malicious payloads, hidden/offscreen cap consumption, concurrent claims, legacy opt-out, draft edits during pending save, network/storage/image failures. Adaptation: Android placement mapping consumes existing dashboard campaigns without changing web placement IDs; namespace local delivery IDs to avoid campaign/legacy collisions.

## Handoff

All four tasks implemented test-first. Focused web verification: 9 files / 43 tests passed. Focused mobile verification: 5 files / 24 tests passed. Scoped mobile ESLint passed; scoped web ESLint had no errors (existing admin loader effect warnings). 21st review: 2 files, zero findings. 21st search could not run without design context; did not initialize unrelated project files. Reused existing project primitives and tokens.

Final review: self-review only; coordinator owns final cross-agent review. Rulings: Android master and placement switches are independent of web switches; source campaigns must still be active house campaigns. Public delivery IDs use campaign:/legacy: namespaces without mutating stored IDs. Visibility requires focus, foreground, image readiness and at least half the card intersecting the native ScrollView viewport; rechecked before local cap persistence. Use Expo Router's installed useIsFocused and ScrollView.getNativeScrollRef for current runtime compatibility.

No commits, deployment, full suite, typechecks, generic API-client edits, iOS edits, or operations-doc changes by this worker. Device/emulator and production Firestore smoke tests remain for integration validation. Node focused tests emit the existing typeless-package warning. Files stable for coordinator review.
