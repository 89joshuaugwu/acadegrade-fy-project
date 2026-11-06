import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Timestamp } from 'firebase-admin/firestore';
import { rewardTestDb } from './reward-test-db';

const state = vi.hoisted(() => ({ db: null as any }));
vi.mock('@/lib/firebase/admin', () => ({ get adminDb() { return state.db; } }));
import { defaultUsagePolicy, parseUsagePolicy } from '@/lib/usage/policy';
import { getUsageSummary, resolveFeatureWindows } from '@/lib/usage/server';
import { checkRateLimit } from '@/lib/api/rate-limit';

const NOW = 1_800_000_000_000;
let storage: ReturnType<typeof rewardTestDb>;
beforeEach(() => {
  storage = rewardTestDb(); state.db = storage.db;
  vi.spyOn(Date, 'now').mockReturnValue(NOW);
});

describe('feature allowances', () => {
  it('retains free defaults and burst policies when config is absent or invalid', async () => {
    expect(await resolveFeatureWindows('insights')).toEqual([{ name: 'hourly', limit: 2, windowMs: 3600000 }, { name: 'daily', limit: 3, windowMs: 86400000 }]);
    expect(await resolveFeatureWindows('forecast')).toEqual([{ name: 'hourly', limit: 2, windowMs: 3600000 }, { name: 'daily', limit: 8, windowMs: 86400000 }]);
    expect(await resolveFeatureWindows('whatif')).toEqual([{ name: 'five_minutes', limit: 3, windowMs: 300000 }, { name: 'daily', limit: 20, windowMs: 86400000 }]);
    expect(await resolveFeatureWindows('ocr')).toEqual([{ name: 'fifteen_minutes', limit: 5, windowMs: 900000 }, { name: 'daily', limit: 20, windowMs: 86400000 }]);
    storage.docs.set('config/usage', { dailyLimits: { insights: -1, forecast: '50', whatif: 1.5, ocr: 1001 } });
    expect((await getUsageSummary('u')).features.map(f => f.freeDailyLimit)).toEqual([3, 8, 20, 20]);
  });

  it.each([-1, 1.2, '3', null, 1001, Infinity])('rejects invalid daily allowance %s', value => {
    expect(() => parseUsagePolicy({ dailyLimits: { ...defaultUsagePolicy().dailyLimits, insights: value } })).toThrow();
  });

  it('rejects incomplete or extra settings and accepts zero as an explicit pause', () => {
    expect(() => parseUsagePolicy({ dailyLimits: { insights: 2 } })).toThrow();
    expect(() => parseUsagePolicy({ ...defaultUsagePolicy(), rewardsEnabled: true })).toThrow();
    expect(() => parseUsagePolicy({ dailyLimits: { ...defaultUsagePolicy().dailyLimits, coins: 2 } })).toThrow();
    expect(parseUsagePolicy({ dailyLimits: { insights: 0, forecast: 1000, whatif: 20, ocr: 20 } }).dailyLimits.insights).toBe(0);
  });

  it('resolves configured daily limits into the actual limiter without changing burst windows', async () => {
    storage.docs.set('config/usage', { dailyLimits: { insights: 9, forecast: 1, whatif: 20, ocr: 20 } });
    const windows = await resolveFeatureWindows('forecast');
    expect((await checkRateLimit('u', 'ai_forecast', windows)).allowed).toBe(true);
    expect(await checkRateLimit('u', 'ai_forecast', windows)).toMatchObject({ allowed: false, window: 'daily', retryAfterSeconds: 86400 });
    const insights = await resolveFeatureWindows('insights');
    await checkRateLimit('u', 'ai_insights', insights);
    await checkRateLimit('u', 'ai_insights', insights);
    expect(await checkRateLimit('u', 'ai_insights', insights)).toMatchObject({ allowed: false, window: 'hourly' });
  });

  it('reads existing sanitized document IDs and reports the longest blocking window without writes', async () => {
    storage.docs.set('_api_rate_limits/u_x_ai_forecast_hourly', { count: 2, windowStartedAt: Timestamp.fromMillis(NOW - 1000) });
    storage.docs.set('_api_rate_limits/u_x_ai_forecast_daily', { count: 8, windowStartedAt: Timestamp.fromMillis(NOW - 2000) });
    const before = [...storage.docs.entries()];
    const summary = await getUsageSummary('u.x');
    expect(summary.checkedAt).toBe(NOW);
    expect(summary.features.find(f => f.id === 'forecast')).toEqual({ id: 'forecast', label: 'Forecast', freeDailyLimit: 8, freeRemaining: 0, freeResetAt: NOW + 86398000, availableNow: 0, retryAfterSeconds: 86398, cooldownUntil: null });
    expect([...storage.docs.entries()]).toEqual(before);
  });

  it('separates daily remaining from immediate burst availability and expires fixed windows at the boundary', async () => {
    storage.docs.set('_api_rate_limits/u_results_extract_fifteen_minutes', { count: 5, windowStartedAt: Timestamp.fromMillis(NOW - 899000) });
    storage.docs.set('_api_rate_limits/u_results_extract_daily', { count: 7, windowStartedAt: Timestamp.fromMillis(NOW - 5000) });
    expect((await getUsageSummary('u')).features[3]).toMatchObject({ freeRemaining: 13, availableNow: 0, retryAfterSeconds: 1 });
    vi.spyOn(Date, 'now').mockReturnValue(NOW + 1000);
    expect((await getUsageSummary('u')).features[3]).toMatchObject({ freeRemaining: 13, availableNow: 5, retryAfterSeconds: 0 });
    vi.spyOn(Date, 'now').mockReturnValue(NOW + 86395000);
    expect((await getUsageSummary('u')).features[3]).toMatchObject({ freeRemaining: 20, freeResetAt: null, availableNow: 5 });
  });

  it.each([new Date(NOW - 1000), Timestamp.fromMillis(NOW - 1000), new Date(NOW - 1000).toISOString()])('uses saved Written Analysis timestamps for the 12-hour cooldown (%s)', async timestamp => {
    storage.docs.set('analytics/u', { lastInsight: { data: { strengths: [] }, timestamp } });
    expect((await getUsageSummary('u')).features[0]).toMatchObject({ freeRemaining: 3, availableNow: 0, cooldownUntil: NOW + 43199000, retryAfterSeconds: 43199 });
    vi.spyOn(Date, 'now').mockReturnValue(NOW + 43199000);
    expect((await getUsageSummary('u')).features[0]).toMatchObject({ availableNow: 2, cooldownUntil: null, retryAfterSeconds: 0 });
  });

  it('does not claim a cooldown for an absent saved insight or invalid timestamp', async () => {
    storage.docs.set('analytics/u', { lastInsight: { timestamp: new Date(NOW), data: null } });
    expect((await getUsageSummary('u')).features[0].cooldownUntil).toBeNull();
    storage.docs.set('analytics/u', { lastInsight: { timestamp: 'bad-date', data: {} } });
    expect((await getUsageSummary('u')).features[0].cooldownUntil).toBeNull();
  });
});
