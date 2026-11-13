import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Timestamp } from 'firebase-admin/firestore';
import { rewardTestDb } from './reward-test-db';

const state = vi.hoisted(() => ({ db: null as any }));
vi.mock('@/lib/firebase/admin', () => ({ get adminDb() { return state.db; } }));
import { DEFAULT_COIN_POLICY, defaultUsagePolicy, inspectUsagePolicy, parseCompleteUsagePolicy, parseUsagePolicy, readUsagePolicy } from '@/lib/usage/policy';
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

  it('keeps saved daily limits from an existing config/usage document that has no coins map', async () => {
    const custom = { insights: 9, forecast: 4, whatif: 0, ocr: 50 };
    storage.docs.set('config/usage', { dailyLimits: custom });
    expect(readUsagePolicy({ dailyLimits: custom })).toEqual({ dailyLimits: custom, coins: DEFAULT_COIN_POLICY });
    expect((await getUsageSummary('u')).features.map(f => f.freeDailyLimit)).toEqual([9, 4, 0, 50]);
    expect(await resolveFeatureWindows('ocr')).toEqual([{ name: 'fifteen_minutes', limit: 5, windowMs: 900000 }, { name: 'daily', limit: 50, windowMs: 86400000 }]);
  });

  it('keeps every valid stored field, ignores unknown keys and only defaults invalid fields', async () => {
    const stored = { dailyLimits: { insights: 0, forecast: 'x', whatif: 7, ocr: 1001, coins: 4 }, legacyFlag: true };
    storage.docs.set('config/usage', stored);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    // An explicit pause (0) must survive a sibling field becoming invalid.
    expect((await getUsageSummary('u')).features.map(f => f.freeDailyLimit)).toEqual([0, 8, 7, 20]);
    expect(inspectUsagePolicy(stored)).toEqual({
      policy: { dailyLimits: { insights: 0, forecast: 8, whatif: 7, ocr: 20 }, coins: DEFAULT_COIN_POLICY },
      source: 'partial', fallbacks: ['dailyLimits.forecast', 'dailyLimits.ocr', 'coins'],
    });
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('config/usage'), { fields: ['dailyLimits.forecast', 'dailyLimits.ocr'] });
    expect(JSON.stringify(warn.mock.calls)).not.toContain('1001');
  });

  it('labels the policy source for absent, complete and wholly invalid documents', () => {
    expect(inspectUsagePolicy(undefined)).toEqual({ policy: defaultUsagePolicy(), source: 'default', fallbacks: [] });
    expect(inspectUsagePolicy(defaultUsagePolicy())).toEqual({ policy: defaultUsagePolicy(), source: 'stored', fallbacks: [] });
    expect(inspectUsagePolicy({ ...defaultUsagePolicy(), note: 'ignored' }).source).toBe('stored');
    expect(inspectUsagePolicy('corrupt')).toMatchObject({ policy: defaultUsagePolicy(), source: 'invalid' });
    expect(inspectUsagePolicy({ dailyLimits: { insights: -1 } })).toMatchObject({ policy: defaultUsagePolicy(), source: 'invalid' });
    const partialCoins = inspectUsagePolicy({ ...defaultUsagePolicy(), coins: { ...DEFAULT_COIN_POLICY, enabled: 'yes', features: { ...DEFAULT_COIN_POLICY.features, ocr: { enabled: true, price: 99, dailyUseCap: 5 } } } });
    expect(partialCoins).toMatchObject({ source: 'partial', fallbacks: ['coins.enabled', 'coins.features.ocr.price'] });
  });

  it('defaults coins off with the agreed prices and caps', () => {
    expect(defaultUsagePolicy().coins).toEqual({
      enabled: false, coinsPerAd: 2, dailyEarnCap: 10, balanceCap: 30,
      features: {
        insights: { enabled: true, price: 2, dailyUseCap: 2 }, forecast: { enabled: true, price: 1, dailyUseCap: 5 },
        whatif: { enabled: true, price: 1, dailyUseCap: 10 }, ocr: { enabled: true, price: 3, dailyUseCap: 5 },
      },
    });
    expect(readUsagePolicy(undefined)).toEqual(defaultUsagePolicy());
  });

  it('merges a partial or partly invalid stored coins map per key without discarding daily limits', () => {
    const dailyLimits = { insights: 1, forecast: 2, whatif: 3, ocr: 4 };
    const policy = readUsagePolicy({ dailyLimits, coins: { enabled: true, coinsPerAd: 11, balanceCap: 50, features: { forecast: { price: 4 }, ocr: { enabled: false, price: 0, dailyUseCap: 51 }, coins: {} } } });
    expect(policy).toEqual({ dailyLimits, coins: {
      ...DEFAULT_COIN_POLICY, enabled: true, balanceCap: 50,
      features: { ...DEFAULT_COIN_POLICY.features, forecast: { enabled: true, price: 4, dailyUseCap: 5 }, ocr: { enabled: false, price: 3, dailyUseCap: 5 } },
    } });
    expect(readUsagePolicy({ dailyLimits: { insights: -1 }, coins: { enabled: 'yes', dailyEarnCap: 0 } })).toEqual({
      dailyLimits: defaultUsagePolicy().dailyLimits, coins: { ...DEFAULT_COIN_POLICY, dailyEarnCap: 0 },
    });
  });

  it('validates coin writes strictly while allowing the coins map to be omitted', () => {
    const coins = { ...DEFAULT_COIN_POLICY, enabled: true, coinsPerAd: 10, dailyEarnCap: 100, balanceCap: 500, features: { ...DEFAULT_COIN_POLICY.features, whatif: { enabled: false, price: 20, dailyUseCap: 50 } } };
    expect(parseUsagePolicy({ ...defaultUsagePolicy(), coins })).toEqual({ dailyLimits: defaultUsagePolicy().dailyLimits, coins });
    expect(parseUsagePolicy({ dailyLimits: defaultUsagePolicy().dailyLimits })).toEqual({ dailyLimits: defaultUsagePolicy().dailyLimits });
    const feature = (change: object) => ({ ...coins, features: { ...coins.features, ocr: { ...coins.features.ocr, ...change } } });
    for (const bad of [
      { ...coins, enabled: 'true' }, { ...coins, coinsPerAd: 0 }, { ...coins, coinsPerAd: 11 }, { ...coins, coinsPerAd: 1.5 },
      { ...coins, dailyEarnCap: -1 }, { ...coins, dailyEarnCap: 101 }, { ...coins, balanceCap: 0 }, { ...coins, balanceCap: 501 },
      { ...coins, extra: true }, { enabled: true }, feature({ price: 0 }), feature({ price: 21 }), feature({ dailyUseCap: -1 }),
      feature({ dailyUseCap: 51 }), feature({ enabled: 1 }), feature({ extra: 1 }),
      { ...coins, features: { ocr: coins.features.ocr } }, { ...coins, features: { ...coins.features, coins: coins.features.ocr } },
    ]) expect(() => parseUsagePolicy({ ...defaultUsagePolicy(), coins: bad })).toThrow();
    expect(() => parseCompleteUsagePolicy({ dailyLimits: defaultUsagePolicy().dailyLimits })).toThrow();
    expect(parseCompleteUsagePolicy(defaultUsagePolicy())).toEqual(defaultUsagePolicy());
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
    // A non-forced cache-miss request is still served during the regeneration cooldown,
    // so the cooldown is reported on its own and does not zero availableNow.
    expect((await getUsageSummary('u')).features[0]).toMatchObject({ freeRemaining: 3, availableNow: 2, cooldownUntil: NOW + 43199000, retryAfterSeconds: 0 });
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
