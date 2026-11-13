# Android rewarded Written Analysis refresh

## Operator setup (no deploy performed)

In AdMob, configure the Android rewarded ad unit's server-side verification
callback URL to exactly:

`https://acadegrade.vercel.app/api/ads/rewards/ssv`

This is the repository's default deployed web origin. If the production site
uses a custom domain, use that site's origin with the identical
`/api/ads/rewards/ssv` path. Do not add query parameters or an auth token.
The endpoint accepts Google's signed GET callbacks, not client reward events.
Ensure the callback is publicly reachable (including any deployment protection).

Set the live AdMob reward amount to **1** and reward item to exactly
**Insights refresh** (case sensitive). In the Android ads admin settings enable
both `enabled` and `rewardedEnabled`, configure the Android rewarded unit, and
turn off `testMode` for live delivery. Missing/invalid config fails closed.
The switches are checked transactionally at creation, callback grant, lease
acquisition, and success commit. Disabling them mid-callback rejects that grant;
disabling them mid-generation rejects its save/consumption and releases the
credit. Status, pending cancellation, and failure release remain available while
disabled, so previously earned credit is recoverable if re-enabled before expiry.

With `testMode: true`, sessions use Google's Android rewarded test unit
`ca-app-pub-3940256099942544/5224354917`. Signed test callbacks may report
`reward_amount=10&reward_item=coins`; this still grants only **one** refresh.
There is no client callback or unsigned test grant endpoint. An AdMob verify-tool
callback with neither `user_id` nor `custom_data` returns signed validation-only
success and never creates an entitlement. Partially supplied session binding is
rejected.

Demo units belong to Google, so do not assume they deliver callbacks to your
account's configured URL. Use them for safe native-rendering tests. For the full
reward path, verify the deployed callback with AdMob's SSV tool, register a test
device in AdMob, then use your own unit from a release/test APK. Confirm Test Ad
labelling before interacting. Keep ordinary users' delivery off during this
check; see the detailed rollout guide in `docs/android-ads-and-release-operations.md`.

### Diagnosing a phone stuck at “Check ad reward status”

That label means the app has a saved session, not an earned entitlement. The
Android client now explicitly reports pending versus confirmed/ready status,
and warns that demo completion does not prove SSV confirmation. Only signed
SSV can change pending to earned, including in test mode. No client event,
timer, status request, or daily-summary read grants credit.

Reward HTTP operations have a 10-second deadline covering authentication,
fetch and body parsing, with abort and no-store caching. Ad preparation and
load have separate 45-second watchdogs; display/close has a 180-second watchdog.
Post-close confirmation stops after 15 checks or a 30-second polling window
(an in-flight status check can add up to 10 seconds). The app stops spinning
and keeps an unconfirmed session recoverable rather than claiming it earned a
refresh. Analysis waiting is bounded at 120 seconds; the server may still
finish after the UI deadline, so check the saved session before retrying.

If confirmation never arrives, inspect the deployed callback logs and the
server-owned session through authorized operator tools. Confirm the API origin,
public callback reachability, unit ID, exact reward item/amount, session binding,
signature verification and enabled switches. This repository change does not
verify production configuration or perform a live ad/callback test. Cancel a
pending session only if abandoning it: a later callback cannot reward a cancelled
session. Earned/processing sessions cannot be cancelled out of their credit.

Verification follows [Google's SSV specification](https://developers.google.com/admob/android/ssv)
using [Google's rotating ECDSA public keys](https://www.gstatic.com/admob/reward/verifier-keys.json).
The exact encoded query before `&signature=` is verified without reordering or
re-encoding. Both numeric `ad_unit` suffixes and full configured unit IDs work.

## API contract

Session and Insights calls require the existing Firebase bearer token.

- `POST /api/ads/rewards/session`, JSON `{ "platform": "android" }`, returns
  `{ sessionId, unitId, userId, expiresAt }`. `expiresAt` is Unix milliseconds.
  Set SDK SSV `userId` to the returned `userId`, and `customData` to `sessionId`
  before showing the ad. Never treat the client earned callback as a grant.
- `GET /api/ads/rewards/session?sessionId=...` returns
  `{ status, expiresAt }`. Status is `pending`, `earned`, `processing`,
  `consumed`, or `expired`; pending lasts 30 minutes, earned credit 24 hours.
  Persist the session ID and poll to recover delayed callbacks or app restarts.
- `DELETE /api/ads/rewards/session?sessionId=...` returns the same status shape.
  It transactionally expires pending sessions only. It never cancels earned or
  processing credit. If SSV wins a cancellation race, preserve the returned
  earned session ID. Cancellation does not refund the session creation budget.
- `POST /api/ai/insights`: include the usual semester data and
  `rewardSessionId`. This requests fresh generation even without
  `forceRegenerate`. Only a verified, unexpired, UID-bound credit bypasses the
  ordinary 12-hour refresh cooldown and ordinary user quota.

### Read-only daily summary integration

`rewards.dailySummary(uid)` (class method in `lib/ads/reward/service.ts`) returns
`RewardDailySummary`, re-exported from `lib/ads/reward/index.ts`:

```ts
{ earnedToday: number; usedToday: number; earnRemaining: number; resetAtUTC: number }
```

`resetAtUTC` is Unix milliseconds at the next UTC midnight. Reads use the
existing `_reward_daily` document and do not create missing documents, require
ads to be enabled, mutate counters, or mint credits. Missing daily counts are
zero; `earnRemaining` is `max(0, 2 - earnedToday)`. `usedToday` counts successful
committed uses, not active processing leases. These are Written Analysis-only
counters, not a wallet or a balance of currently redeemable credits: earned
sessions can carry over from yesterday. A calling route must authenticate the
user and pass the verified UID. No summary HTTP endpoint is added here.

## Safety and limits

Daily reward budgets reset at UTC midnight: at most two grants and two reserved
or successful rewarded generations per user per day, independent of ordinary
Written Analysis limits. Session creation is limited to six per fixed hour and
twelve per UTC day. A pending session cannot earn after its expiry/cancellation.
Generation attempts, including failed retries, are independently limited to six
per fixed hour and twelve per UTC day. Hitting this ceiling preserves the earned
credit until expiry; restoring a failed credit never restores the attempt budget.

Generation acquires a five-minute, token-fenced lease. Concurrent use is rejected.
The new analytics result and entitlement consumption commit in one transaction,
only after provider success. Provider/storage failure or stale fallback releases
the lease. A crashed worker's lease becomes recoverable after five minutes;
late workers cannot save results or release a replacement lease.

`_reward_sessions`, `_reward_daily`, and `_reward_transactions` deny all client
reads/writes, including admins. All grant/use/limit writes use Firebase Admin
transactions. Duplicate signed transactions are idempotent for the same session;
cross-session transaction replay and second grants to one session are rejected.
Transaction tombstones intentionally have no TTL. Optional Firestore TTL cleanup
may target `_reward_sessions.ttlAt`; authorization does not depend on TTL deletion.
Do not enable TTL for transaction tombstones.

## Verification

`npm run test:unit -- tests/unit/reward-ssv.test.ts tests/unit/reward-service.test.ts tests/unit/reward-routes.test.ts`

These focused backend tests use real ECDSA signatures, the real config parser and
real reward/route logic with transactional in-memory Firestore storage. They are
not a deployed AdMob integration test or Firestore emulator test.

## Coin wallet (2026-11-13; default off)

One server-owned balance per user, earned from the same signed rewarded-ad
callback and spent per feature. Coins are not money: no purchase, transfer or
cash value; clients never write balances. The legacy Written Analysis refresh
above is unchanged and independent of coins.

Earning: `POST /api/ads/rewards/session` with `{ platform: 'android', reward: 'coins' }`
returns `{ sessionId, unitId, userId, expiresAt, reward: 'coins', coins }`.
403 when coins (`config/usage.coins.enabled`) or the Android rewarded switch is
off; 429 when today's earn cap is reached, the balance is full ("Your coin
balance is full"), or the session-creation ceiling (6/hour, max(12, ceil(cap/perAd)+10)/day)
is hit; 400 for an unknown `reward`. The SSV grant keeps the same signature,
UID/session binding, unit, reward item/amount, timestamp and replay checks, then
credits `min(session coins, coinsPerAd, dailyEarnCap - earnedToday, balanceCap - balance)`
(never below 0), writes an `earn` ledger entry and marks the session `credited`
with `coinsGranted`. One AdMob unit serves both flows: binding is the session
(`custom_data`), so the unit's reward item stays **Insights refresh** / amount 1.
`GET ?sessionId=` returns `{ status: 'pending'|'credited'|'expired', expiresAt, reward: 'coins', coinsGranted?, balance }`.

Spending (`lib/ads/reward/coins.ts`, `CoinWallet`): routes accept
`coinSpend: { requestId }` (JSON) or `X-Coin-Spend-Id` (scanner), 32–64
lowercase hex, generated per user action. Validation and cache come first and
the free path is tried first; a refused limiter check consumes nothing. Only a
refusal (burst/daily window or the Written Analysis forced-regeneration
cooldown) leads to `reserve` → provider → `commit` (persisting `analytics.lastInsight`
/ `analytics.forecast` in the same transaction) → or `refund` on any failure.
Holds expire after five minutes and are refunded by the next wallet
transaction. Errors: 400 malformed id, 402 `{ error: 'Not enough coins', balance, price }`,
403 coins/feature off, 409 request id used or in progress (a refunded id may be
retried), 429 feature `dailyUseCap`. Success adds `X-Coins-Spent` and
`X-Coin-Balance`; a free-path success with a coin id sends `X-Coins-Spent: 0`.
A charged provider failure returns 503 "...your coins were not spent", never
stale data. A free-path 429 adds `coinPrice` and `coinBalance` when coins can pay.

Storage (server-only; rules deny all client access):
`_coin_wallets/{sha256(uid)}` (balance, UTC-day counters, active holds),
`_coin_ledger/{id}` append-only `{ uidHash, type: 'earn'|'spend'|'refund', amount, feature?, sessionId?, requestId?, at, balanceAfter }`
(a hold writes `spend`; a failure writes `refund`), and
`_coin_requests/{sha256(uid + ':' + requestId)}` idempotency records with no TTL.

Tests: `tests/unit/coin-wallet.test.ts`, `tests/unit/coin-routes.test.ts`.

## Age, consent and maintenance gates (2026-11-13)

`POST /api/ads/rewards/session` returns 503 `{ code: 'MAINTENANCE' }` to
non-admins during maintenance. Coin sessions and legacy refresh sessions return
403 `{ code: 'AGE_RESTRICTED' | 'AGE_CONFIRMATION_REQUIRED' | 'AI_CONSENT_REQUIRED' }`
unless the user may use AI (`lib/user/age.ts`). Status and cancel (GET and
DELETE) and the SSV callback are not gated. Account deletion removes the
user's `_reward_sessions`, `_reward_transactions`, `_reward_daily` and coin
documents. See `docs/server-compliance-contracts.md`.
