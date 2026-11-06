# Admin and delivery readiness implementation plan

> **For agentic workers:** Use Superpowers test-driven-development and systematic-debugging. The user approved retaining the existing design and proceeding with fixes on 2026-11-06.

**Goal:** Make update/ad readiness observable and repair confirmed delivery defects without bypassing consent or changing live configuration.

**Architecture:** Preserve existing Next.js/React Native contracts and the AcadeGrade visual identity. The operator subsequently requested a six-hour optional update cache (superseding the original 24-hour cache); add an explicit forced check and explain installed/latest build eligibility. Separate provider account requirements from code status. No new libraries.

**Spec:** The user's 2026-11-06 approved incumbent-admin improvement approach, screenshots, and investigation recorded in the workspace `todo.md`.

## Constraints and rulings

- Work in the explicitly shared current workspace; preserve unrelated changes. No push, deployment, account mutations, APK build, or native iOS changes.
- Keep SDK-owned consent permission authoritative, backend reward verification intact, and native errors sanitized.
- Installed EAS build 14 versus published latest build 15 is eligible only after fresh configuration and absent dismissal; the previous build-3 cache can suppress it for 24 hours.
- Use existing tokens/components. No marketing-page styling rules or replacement component framework.
- Browser/device checks require available authentication/device; report limitations rather than claiming production readiness.

## Tasks

1. **Android ad readiness** — `acadegrade-mobile/lib/ads/`, banner/reward components and focused tests. Add failing tests for consent-gather failure with SDK permission true/false, coordinated initialization, and sanitized failures; implement shared consent readiness with safe fallback. Keep no-consent fail-closed.
2. **Web delivery** — `components/ads/` and focused tests. Reproduce supplied-provider config changes and below-fold impression consumption; derive current props correctly and record house impressions only on actual visibility. Preserve no-ad defaults and legacy caps.
3. **Admin shell and advertising** — `AdminShell`, admin ad editors, page and tests. Preserve incumbent appearance; fix tablet structure, shorten repetitive help, remove unusable house-mode switches, keep clear platform navigation, and separate draft/saved/configured from serving verified. No live ad requests in previews.
4. **Android release observability** — release cache/host, a focused update-check component on Settings and tests. Test cached build 3 versus fresh build 15 on installed 14; manual check bypasses cache and dismissal for that explicit check only; automatic checks keep dismissal semantics. Bound request failure, avoid stale/concurrent results, show installed version/build and meaningful check status. Do not clear student data.
5. **Admin release safety** — release page and tests. Correct mandatory preview/confirmation when minimum supported build is nonzero, add build-eligibility simulator and saved/draft feedback, preserve upload and explicit-download behaviour.
6. **Verification and handoff** — run focused tests after RED/GREEN, both typechecks, full web/mobile suites, targeted lint, independent diff review, and bounded browser/device checks where possible. Update `todo.md` after verified tasks; document console setup and new-APK/deployment requirements separately.

## Review focus

- Consent update rejected but previous SDK permission valid versus invalid.
- Multiple ad consumers and unmounts must not duplicate or reuse stale readiness.
- Nonvisible creatives must not consume frequency allowance.
- Manual update requests must bypass only configuration cache, not remove permanent dismissal records or leak a mandatory lock on failure.
- Minimum-supported-build enforcement and preview must agree; later edits must survive an in-flight save.

## Progress ledger

- PAUSED again by explicit user request on 2026-11-06. All current agents stopped/closed; implementation and final independent review halted. Preserve working tree; no commits/deployments/APK builds. Resume by checking current diffs and review checkpoint, then remaining stage-3 feature rewards and final operational/device verification. Main final summary and root todo record the test evidence.
- Interrupted reviewer checkpoint: isolated checks reproduced delayed six-hour refresh scheduling, automatic-check/manual-check interference, and a reward watchdog leaving parent analysis loading active. These require coordinator triage and regression fixes on resume; passing suites do not establish readiness for rollout.

- Investigation complete: public build-15 configuration verified; installed-phone build not directly observed; EAS latest successful build is 14. Existing release cache retains optional metadata for 24 hours.
- Implementation started; task completion requires current tests, not historical results.
- Ruling: six-hour foreground timer plus cache-aware launch/resume checks replace 24-hour optional checks at the operator's request. Exact closed-app Android scheduling is not promised; the cost is that an inactive app sees metadata on its next launch/resume.
- Tasks 1–5 code implemented. Settings manual check, ad privacy options, group navigation, safe release preview/minimum enforcement and in-flight save preservation have focused regression coverage.
- Scope extension approved: separate feature-credit stages 1–2 and Android house-promotion bridge; see `../specs/2026-11-06-feature-credits-design.md` and `2026-11-06-android-house-bridge.md`. Rewarded scanner/Forecast/What-if paths remain explicitly pending, not falsely enabled.
- Verification checkpoint: full Android suite 112 passed; full web suite 94 files, 427 passed plus 1 expected failure. Both typechecks and targeted web lint pass; Impeccable reports no findings on changed core UI targets. Independent review remains in progress. No deployment/commit/APK build/live settings mutations.
