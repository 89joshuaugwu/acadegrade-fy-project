# Advertising Control Plane Plan

## Goal

Add restrained, admin-managed web advertising that defaults off, preserves legacy banners, and never interrupts essential student work.

## Tasks

1. Define validated additive ads config and legacy banner adapter.
2. Add global kill switch, placements, campaigns, schedules, weights, frequency caps, and house-ad delivery mode.
3. Add admin-only read/write boundaries and a dedicated responsive `/admin/ads` workspace.
4. Implement deterministic eligibility/selection and a reusable zero-layout `AdPlacement` fallback.
5. Add at most one low-risk web placement initially; authentication, registration, save, confirmation, and error states stay ad-free.
6. Leave rewarded/third-party switches disabled until policy, consent, SDK, quota, and mobile work are approved.
7. Test invalid configuration, disabled state, schedule boundaries, selection, cap, accessibility, and legacy compatibility.

## Mobile Safety

No mobile API response gains required ad fields. No mobile source or build is changed. A future mobile ads release uses a versioned endpoint and separate consent/reward design.
