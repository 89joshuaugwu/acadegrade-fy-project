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

## Decision 2026-11-13: coin wallet for rewarded extras

The owner replaced per-feature rewarded extras with one server-owned **coin wallet**. It supersedes "separate feature credits" for rewarded extras only; free allowances stay per feature, exactly as before. One verified Android rewarded ad (Google SSV) earns coins into a single balance; each AI feature has its own coin price and daily coin-use cap. Coins are charged only when the free path would refuse (burst/daily window, or the Written Analysis forced-regeneration cooldown), never for cache hits or local calculations. Coins are not money: no purchase, no transfer, no cash value, and clients never write balances.

- Defaults: coins off; 2 coins per ad; earn cap 10 per UTC day; balance cap 30. Prices/daily coin uses: scanning 3/5, Written Analysis 2/2, Forecast 1/5, What-if 1/10. All admin-editable in `/admin/usage`, validated strictly on write and merged per field on read.
- Earning also requires the Android rewarded switch in Ads (enabled, rewarded on, valid unit or test mode). Spending does not.
- Spend is reserve (hold) → provider → commit (with the persisted result where the route saves one) → or refund. Holds older than five minutes refund on the next wallet transaction. Request ids make retries idempotent.
- The legacy Written Analysis refresh (installed APKs, `rewardSessionId`, 2 per UTC day) is unchanged and independent of coins.
- Storage: `_coin_wallets`, append-only `_coin_ledger`, `_coin_requests`; Firestore rules deny all client access.
- Stage 3 status (web backend): implemented and unit-tested with fake Firestore; default off. Not deployed, not device-tested, and no live AdMob callback has been verified. Coin earning/spending UI needs a new Android build.

Related fixes in the same change: stored policy reads now fall back per field (an admin pause can no longer be silently undone by an invalid sibling field), the admin API reports the policy source and fallbacks, and the usage summary reports the Written Analysis regeneration cooldown separately instead of zeroing `availableNow`.

## Delivery stages

1. Repair the existing rewarded flow and expose honest server-owned Written Analysis balance/verification status. Add a credit-style indicator without inventing client balances.
2. Introduce validated admin-managed feature allowance policy and authenticated read-only usage summaries. Preserve current defaults and old clients; no client writes to counters.
3. ~~Feature-bound scanner/Forecast/What-if reward redemption~~ superseded on 2026-11-13 by the coin wallet above: implemented on the web backend for all four features with failure/replay/concurrency/refund tests and explicit opt-in (default off). Android coin UI remains a separate build.
4. Apply the same usage-summary contract to web and Android. Use one coin/credit icon family and explicit feature labels; color supplements text, not replaces it.

## Android sponsor promotions

Independent Android house-promotion controls, default off, reuse validated existing web house campaigns and optional legacy fallback. Select Dashboard/Results placements separately. Keep schedules, weights, and local per-campaign caps. Count a local impression only when the promotion is actually visible. Use explicit HTTPS link taps; no scripts, pop-ups, or ad overlay on forms. Failures hide optional promotions and never block grades.

## Release checks

Optional metadata refreshes every six hours while active and on the next launch/resume after expiry. Manual Settings check always bypasses metadata cache and may reopen a dismissed optional notice for that explicit check only. Persistent dismissal remains. Required notices revalidate on resume so a kill switch can take effect. No exact background alarm or closed-app execution is promised.

## Acceptance and external work

Automated tests cover legacy client compatibility, counter immutability on summary reads, correct feature/reset labels, reward replay and failure recovery, six-hour expiry, optional dismissal and mandatory recovery. APK/device testing, deployed callback validation, AdMob approval/consent and live serving remain separate operator tasks. Development uses test ads; never create real test traffic to earn revenue.
