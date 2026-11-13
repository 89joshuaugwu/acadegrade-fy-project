import { z } from 'zod';
import type { RateLimitWindow } from '@/lib/api/rate-limit';

export const FEATURE_IDS = ['insights', 'forecast', 'whatif', 'ocr'] as const;
export type UsageFeatureId = typeof FEATURE_IDS[number];
export const MAX_FREE_DAILY_LIMIT = 1000;
export const DAY_MS = 24 * 60 * 60 * 1000;

export const USAGE_FEATURES = {
  insights: { label: 'Written Analysis', endpoint: 'ai_insights', defaultDaily: 3, burst: { name: 'hourly', limit: 2, windowMs: 3600000 }, burstHelp: '2 per hour' },
  forecast: { label: 'Forecast', endpoint: 'ai_forecast', defaultDaily: 8, burst: { name: 'hourly', limit: 2, windowMs: 3600000 }, burstHelp: '2 per hour' },
  whatif: { label: 'What-if guidance', endpoint: 'ai_whatif', defaultDaily: 20, burst: { name: 'five_minutes', limit: 3, windowMs: 300000 }, burstHelp: '3 per 5 minutes' },
  ocr: { label: 'Result scanning', endpoint: 'results_extract', defaultDaily: 20, burst: { name: 'fifteen_minutes', limit: 5, windowMs: 900000 }, burstHelp: '5 per 15 minutes' },
} as const;

/** Inclusive integer ranges for admin-managed coin settings. */
export const COIN_LIMITS = {
  coinsPerAd: { min: 1, max: 10 },
  dailyEarnCap: { min: 0, max: 100 },
  balanceCap: { min: 1, max: 500 },
  price: { min: 1, max: 20 },
  dailyUseCap: { min: 0, max: 50 },
} as const;

const dailyLimit = z.number().int().min(0).max(MAX_FREE_DAILY_LIMIT);
const ranged = (key: keyof typeof COIN_LIMITS) => z.number().int().min(COIN_LIMITS[key].min).max(COIN_LIMITS[key].max);
const dailyLimitsSchema = z.object({ insights: dailyLimit, forecast: dailyLimit, whatif: dailyLimit, ocr: dailyLimit }).strict();
const coinFeatureSchema = z.object({ enabled: z.boolean(), price: ranged('price'), dailyUseCap: ranged('dailyUseCap') }).strict();
const coinSchema = z.object({
  enabled: z.boolean(),
  coinsPerAd: ranged('coinsPerAd'),
  dailyEarnCap: ranged('dailyEarnCap'),
  balanceCap: ranged('balanceCap'),
  features: z.object({ insights: coinFeatureSchema, forecast: coinFeatureSchema, whatif: coinFeatureSchema, ocr: coinFeatureSchema }).strict(),
}).strict();
const policySchema = z.object({ dailyLimits: dailyLimitsSchema, coins: coinSchema }).strict();
const policyWriteSchema = z.object({ dailyLimits: dailyLimitsSchema, coins: coinSchema.optional() }).strict();
export type UsagePolicy = z.infer<typeof policySchema>;
export type UsagePolicyWrite = z.infer<typeof policyWriteSchema>;
export type CoinPolicy = z.infer<typeof coinSchema>;
export type CoinFeaturePolicy = z.infer<typeof coinFeatureSchema>;

/** Coins stay off until an operator enables them after device testing. */
export const DEFAULT_COIN_POLICY: Readonly<CoinPolicy> = Object.freeze({
  enabled: false,
  coinsPerAd: 2,
  dailyEarnCap: 10,
  balanceCap: 30,
  features: Object.freeze({
    insights: Object.freeze({ enabled: true, price: 2, dailyUseCap: 2 }),
    forecast: Object.freeze({ enabled: true, price: 1, dailyUseCap: 5 }),
    whatif: Object.freeze({ enabled: true, price: 1, dailyUseCap: 10 }),
    ocr: Object.freeze({ enabled: true, price: 3, dailyUseCap: 5 }),
  }),
});

const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const DEFAULT_DAILY_LIMITS = { insights: 3, forecast: 8, whatif: 20, ocr: 20 } as const;

/** Where the effective policy came from. `fallbacks` lists field paths that
 * use defaults (`coins` alone means the coin settings were never saved). */
export type UsagePolicySource = 'stored' | 'default' | 'partial' | 'invalid';
export interface UsagePolicyInspection { policy: UsagePolicy; source: UsagePolicySource; fallbacks: string[] }

/** Lenient, per-field read of stored config: unknown keys are ignored, each
 * valid stored field is kept, and only missing/invalid fields use defaults.
 * An explicit pause (0) therefore survives a sibling field becoming invalid. */
export function inspectUsagePolicy(value: unknown): UsagePolicyInspection {
  const fallbacks: string[] = [];
  let used = 0;
  const field = <T>(path: string, schema: z.ZodType<T>, raw: unknown, fallback: T): T => {
    const result = schema.safeParse(raw);
    if (result.success) { used += 1; return result.data; }
    fallbacks.push(path);
    return fallback;
  };
  const stored = record(value);
  const limits = record(stored.dailyLimits);
  const dailyLimits = Object.fromEntries(FEATURE_IDS.map(id => [id, field(`dailyLimits.${id}`, dailyLimit, limits[id], DEFAULT_DAILY_LIMITS[id])])) as UsagePolicy['dailyLimits'];
  const defaults = DEFAULT_COIN_POLICY;
  const coinsMissing = stored.coins === undefined;
  if (coinsMissing) fallbacks.push('coins');
  const coinValue = record(stored.coins);
  const coinField = <T>(path: string, schema: z.ZodType<T>, raw: unknown, fallback: T) => coinsMissing ? fallback : field(`coins.${path}`, schema, raw, fallback);
  const features = record(coinValue.features);
  const coins: CoinPolicy = {
    enabled: coinField('enabled', z.boolean(), coinValue.enabled, defaults.enabled),
    coinsPerAd: coinField('coinsPerAd', ranged('coinsPerAd'), coinValue.coinsPerAd, defaults.coinsPerAd),
    dailyEarnCap: coinField('dailyEarnCap', ranged('dailyEarnCap'), coinValue.dailyEarnCap, defaults.dailyEarnCap),
    balanceCap: coinField('balanceCap', ranged('balanceCap'), coinValue.balanceCap, defaults.balanceCap),
    features: Object.fromEntries(FEATURE_IDS.map(id => {
      const entry = record(features[id]);
      const fallback = defaults.features[id];
      return [id, {
        enabled: coinField(`features.${id}.enabled`, z.boolean(), entry.enabled, fallback.enabled),
        price: coinField(`features.${id}.price`, ranged('price'), entry.price, fallback.price),
        dailyUseCap: coinField(`features.${id}.dailyUseCap`, ranged('dailyUseCap'), entry.dailyUseCap, fallback.dailyUseCap),
      }];
    })) as CoinPolicy['features'],
  };
  const policy = { dailyLimits, coins };
  if (value === undefined || value === null) return { policy, source: 'default', fallbacks: [] };
  return { policy, source: !fallbacks.length ? 'stored' : used ? 'partial' : 'invalid', fallbacks };
}

export function defaultUsagePolicy(): UsagePolicy {
  return inspectUsagePolicy(undefined).policy;
}

/** Strict for writes. `coins` may be omitted (the stored coin settings are
 * then kept); when present, every key must be supplied and valid. */
export function parseUsagePolicy(value: unknown): UsagePolicyWrite {
  return policyWriteSchema.parse(value);
}

/** Strict, complete policy as returned by the admin API. */
export function parseCompleteUsagePolicy(value: unknown): UsagePolicy {
  return policySchema.parse(value);
}

/** Effective policy for enforcement; see inspectUsagePolicy. */
export function readUsagePolicy(value: unknown): UsagePolicy {
  return inspectUsagePolicy(value).policy;
}

export function featureWindows(id: UsageFeatureId, policy: UsagePolicy): RateLimitWindow[] {
  return [{ ...USAGE_FEATURES[id].burst }, { name: 'daily', limit: policy.dailyLimits[id], windowMs: DAY_MS }];
}

export interface FeatureUsage {
  id: UsageFeatureId;
  label: string;
  freeDailyLimit: number;
  freeRemaining: number;
  freeResetAt: number | null;
  availableNow: number;
  retryAfterSeconds: number;
  cooldownUntil: number | null;
  /** Null when coins are switched off. Not a balance; see CoinSummary. */
  coin?: FeatureCoinSummary | null;
}

/** Per-feature coin price and coin-funded uses for the current UTC day. */
export interface FeatureCoinSummary {
  /** Coins master switch and this feature's coin switch are both on. */
  enabled: boolean;
  price: number;
  usesToday: number;
  dailyUseCap: number;
}

/** Server-owned wallet snapshot. Coins are not money and are never client-written. */
export interface CoinSummary {
  /** Earning is possible: coins master switch AND the Android rewarded ads switch are on. */
  enabled: boolean;
  balance: number;
  balanceCap: number;
  coinsPerAd: number;
  earnedToday: number;
  dailyEarnCap: number;
  earnRemaining: number;
  /** Unix milliseconds for the next UTC midnight. */
  resetAtUTC: number;
}

export interface UsageSummary { features: FeatureUsage[]; checkedAt: number }
