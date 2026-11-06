# Feature credits and Android promotions

The operator selected separate feature credits on 2026-11-06, preserving existing free limits. This extends the delivery-readiness work; it is not permission to deploy or change live account settings.

## Intent

Make free AI allowances and verified rewarded extras understandable, cover provider costs without blocking core academic records, and deliver sponsor campaigns to Android users as well as web users.

## Approaches

- One shared coin wallet: simple balance, but hides unequal provider costs and lets one tool spend another tool's allowance. Not selected.
- Separate feature credits: selected by the operator. Written Analysis, Forecast, What-if guidance and result scanning each show their own remaining allowance and rewarded extras. A credit is one eligible provider request, not money, transferable currency or a guaranteed successful provider response.
- Keep invisible rate limits: lowest implementation cost, but fails the operator's transparency goal.

## Safety and compatibility

- Preserve current free policies: Written Analysis 2/hour, 3 per 24-hour window plus its 12-hour regeneration cooldown; Forecast 2/hour and 8/24 hours; What-if AI guidance 3/5 minutes and 20/24 hours; scanning 5/15 minutes and 20/24 hours. Cached results and local calculations do not spend a credit. Existing normal-limit windows are fixed windows, not necessarily midnight resets; the UI must show actual reset times.
- Existing verified Written Analysis rewards remain at most two earned/used per UTC day. Other rewarded features must default off until their full server-consumption paths are implemented and tested.
- The server owns all balances. A completed native video callback alone cannot mint a credit. Google signature, user/session/feature/unit binding, replay prevention and atomic one-use consumption remain mandatory.
- Provider failure restores an acquired rewarded entitlement. A spinner must end with a clear pending/error/earned result. Never silently convert missing verification into success.
- Admin settings must distinguish configured, implemented and enabled. Do not expose active switches for unsupported reward paths.
- Transcript generation/sharing remains unchanged in this phase; a new monthly cap is deferred rather than imposed without a defined sharing policy.
- No paid credits, purchases, cross-feature conversion, or iOS implementation in this phase.

## Delivery stages

1. Repair the existing rewarded flow and expose honest server-owned Written Analysis balance/verification status. Add a credit-style indicator without inventing client balances.
2. Introduce validated admin-managed feature allowance policy and authenticated read-only usage summaries. Preserve current defaults and old clients; no client writes to counters.
3. Add feature-bound scanner/Forecast/What-if reward redemption one route at a time with failure/replay/concurrency tests and explicit opt-in. Until done, mark these as pending, not active.
4. Apply the same usage-summary contract to web and Android. Use one coin/credit icon family and explicit feature labels; color supplements text, not replaces it.

## Android sponsor promotions

Independent Android house-promotion controls, default off, reuse validated existing web house campaigns and optional legacy fallback. Select Dashboard/Results placements separately. Keep schedules, weights, and local per-campaign caps. Count a local impression only when the promotion is actually visible. Use explicit HTTPS link taps; no scripts, pop-ups, or ad overlay on forms. Failures hide optional promotions and never block grades.

## Release checks

Optional metadata refreshes every six hours while active and on the next launch/resume after expiry. Manual Settings check always bypasses metadata cache and may reopen a dismissed optional notice for that explicit check only. Persistent dismissal remains. Required notices revalidate on resume so a kill switch can take effect. No exact background alarm or closed-app execution is promised.

## Acceptance and external work

Automated tests cover legacy client compatibility, counter immutability on summary reads, correct feature/reset labels, reward replay and failure recovery, six-hour expiry, optional dismissal and mandatory recovery. APK/device testing, deployed callback validation, AdMob approval/consent and live serving remain separate operator tasks. Development uses test ads; never create real test traffic to earn revenue.
