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
