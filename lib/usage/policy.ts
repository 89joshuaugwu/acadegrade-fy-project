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

const dailyLimit = z.number().int().min(0).max(MAX_FREE_DAILY_LIMIT);
const policySchema = z.object({ dailyLimits: z.object({ insights: dailyLimit, forecast: dailyLimit, whatif: dailyLimit, ocr: dailyLimit }).strict() }).strict();
export type UsagePolicy = z.infer<typeof policySchema>;

export function defaultUsagePolicy(): UsagePolicy {
  return { dailyLimits: { insights: 3, forecast: 8, whatif: 20, ocr: 20 } };
}

/** Strict for writes. Stored invalid/missing config is handled separately. */
export function parseUsagePolicy(value: unknown): UsagePolicy {
  return policySchema.parse(value);
}

export function readUsagePolicy(value: unknown): UsagePolicy {
  const result = policySchema.safeParse(value);
  return result.success ? result.data : defaultUsagePolicy();
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
}

export interface UsageSummary { features: FeatureUsage[]; checkedAt: number }
