# Feature allowances

`config/usage` stores `{ dailyLimits: { insights, forecast, whatif, ocr } }`.
All four values are required integers from 0 to 1000. Zero pauses free
provider requests. Admin writes reject unknown keys (including rewards).
Missing or invalid stored policy uses the entire unchanged default policy;
storage errors do not silently fall back. No deployment or live write is
needed for defaults to apply.

Default windows (all fixed, not midnight resets):

| Feature | Existing endpoint key | Burst | Daily |
| --- | --- | --- | --- |
| insights | ai_insights | hourly: 2/hour | 3/24h |
| forecast | ai_forecast | hourly: 2/hour | 8/24h |
| whatif | ai_whatif | five_minutes: 3/5min | 20/24h |
| ocr | results_extract | fifteen_minutes: 5/15min | 20/24h |

`resolveFeatureWindows` changes only the daily ceiling. Existing route cache,
cooldown and reward branches stay unchanged. Admin changes apply immediately
to future requests against existing counts; they do not reset windows.

`GET /api/admin/usage` and `PUT /api/admin/usage` require the existing strict
administrator verification. Both return the policy shape above.

`GET /api/ai/usage` requires a verified user and returns:

```ts
{
  features: Array<{
    id: 'insights' | 'forecast' | 'whatif' | 'ocr';
    label: string;
    freeDailyLimit: number;
    freeRemaining: number;
    freeResetAt: number | null;
    availableNow: number;
    retryAfterSeconds: number;
    cooldownUntil: number | null;
  }>;
  checkedAt: number;
  writtenRewards: {
    earnedToday: number;
    usedToday: number;
    earnRemaining: number;
    resetAtUTC: number;
  };
}
```

Timestamps are epoch milliseconds. Daily remaining excludes burst/cooldown;
availableNow is their minimum, or zero during Written Analysis cooldown.
Cooldown uses `analytics/{uid}.lastInsight.timestamp` and the existing 12-hour
refresh predicate only when saved insight data exists. Cached loads can still
be served without a provider request. Retry is the longest currently blocking
window/cooldown. No active daily window means `freeResetAt: null`. A zero
allowance is an admin pause, not a promise that waiting will enable requests.

Reads use the existing `_api_rate_limits` sanitized IDs and window-start
semantics, never the counter's stored `limit` field. They never increment,
create or expire documents. Summaries are informational snapshots, not
reservations; concurrent requests may consume quota after a read.

Written reward counters come directly from `rewards.dailySummary(uid)` and
are **not a spendable balance**. Never subtract earned/used to invent one.
Written rewards remain separate (max 2/day); the other reward paths are
pending and have no enable controls here. No transcript cap or currency is
introduced. Responses are private and no-store.
