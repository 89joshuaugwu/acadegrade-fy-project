# Feature allowances and coin policy

`config/usage` stores:

```ts
{
  dailyLimits: { insights, forecast, whatif, ocr },          // integers 0..1000
  coins: {
    enabled: boolean,                                        // master switch, default false
    coinsPerAd: number,                                      // 1..10, default 2
    dailyEarnCap: number,                                    // 0..100 per UTC day, default 10
    balanceCap: number,                                      // 1..500, default 30
    features: { [id]: { enabled, price, dailyUseCap } },     // price 1..20, dailyUseCap 0..50
  },
}
```

Default coin prices: ocr 3 coins (5 uses/day), insights 2 (2/day), forecast 1
(5/day), whatif 1 (10/day); every feature is enabled but the master switch is
off. Zero daily allowance pauses free provider requests.

## Reads are per field; writes are strict

`inspectUsagePolicy` (and `readUsagePolicy`, its `.policy`) never throws away
a valid stored field: unknown keys are ignored, each valid stored value is
kept, and only missing or invalid fields use their default. An admin pause
(`insights: 0`) therefore survives a sibling becoming invalid, and documents
saved before coins existed keep their daily limits (the whole `coins` map
then reports as the single fallback `coins`). It returns
`{ policy, source: 'stored' | 'default' | 'partial' | 'invalid', fallbacks }`.
`lib/usage/server.ts` logs a sanitised warning (field paths only, once per
process per field set) when a stored document has missing/invalid fields;
storage errors still propagate rather than silently defaulting.

Admin writes (`PUT /api/admin/usage`) are strict: unknown keys are rejected and
`coins`, when present, must be complete. Omitting `coins` keeps the stored
coin settings. `GET` and `PUT` both return `{ policy, source, fallbacks }`.

Default free windows (all fixed, not midnight resets):

| Feature | Existing endpoint key | Burst | Daily |
| --- | --- | --- | --- |
| insights | ai_insights | hourly: 2/hour | 3/24h |
| forecast | ai_forecast | hourly: 2/hour | 8/24h |
| whatif | ai_whatif | five_minutes: 3/5min | 20/24h |
| ocr | results_extract | fifteen_minutes: 5/15min | 20/24h |

`resolveFeatureWindows` changes only the daily ceiling. Admin changes apply
immediately to future requests against existing counts; they do not reset
windows or balances.

## `GET /api/ai/usage`

Requires a verified user; private and no-store. Returns:

```ts
{
  features: Array<{
    id: 'insights' | 'forecast' | 'whatif' | 'ocr';
    label: string;
    freeDailyLimit: number; freeRemaining: number; freeResetAt: number | null;
    availableNow: number; retryAfterSeconds: number;
    cooldownUntil: number | null;            // Written Analysis forced-regeneration cooldown only
    coin: null | { enabled: boolean; price: number; usesToday: number; dailyUseCap: number };
  }>;
  checkedAt: number;
  writtenRewards: { earnedToday; usedToday; earnRemaining; resetAtUTC };   // legacy, unchanged
  coins: null | { enabled; balance; balanceCap; coinsPerAd; earnedToday; dailyEarnCap; earnRemaining; resetAtUTC };
}
```

Timestamps are epoch milliseconds. `availableNow` is the minimum of the burst
and daily windows. The 12-hour Written Analysis cooldown applies only to forced
regeneration of a saved analysis, so it is reported in `cooldownUntil` and no
longer zeroes `availableNow` or raises `retryAfterSeconds`.

`coins`/`coin` are `null` while the coin master switch is off. `coins.enabled`
means earning is possible now (master switch AND the Android rewarded switch in
`config/mobileAds`); `coin.enabled` means that feature can be paid with coins.
`earnRemaining = max(0, min(dailyEarnCap - earnedToday, balanceCap - balance))`.
Holds older than five minutes are reported as refunded. Reads never create,
sweep or increment anything; they are snapshots, not reservations.

### Age and AI consent (2026-11-13)

`GET /api/ai/usage` also returns
`age: { status: 'adult' | 'minor' | 'unknown', aiAllowed: boolean, aiConsent: boolean | null }`.
When `aiAllowed` is false, `coins.enabled` and every `features[].coin.enabled`
are `false` (balances are still reported). The rules are in `lib/user/age.ts`;
the full contract is in `docs/server-compliance-contracts.md`.
