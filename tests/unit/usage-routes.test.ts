import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { rewardTestDb } from './reward-test-db';

const state = vi.hoisted(() => ({ db: null as any, verify: vi.fn(), dailySummary: vi.fn(), coinSummary: vi.fn() }));
vi.mock('@/lib/firebase/admin', () => ({ get adminDb() { return state.db; }, adminAuth: { verifyIdToken: state.verify } }));
vi.mock('@/lib/ads/reward', () => ({ rewards: { dailySummary: state.dailySummary }, coins: { summary: state.coinSummary } }));
import { GET as usage } from '@/app/api/ai/usage/route';
import { GET, PUT } from '@/app/api/admin/usage/route';
import { DEFAULT_COIN_POLICY, defaultUsagePolicy } from '@/lib/usage/policy';

let storage: ReturnType<typeof rewardTestDb>;
const policy = { dailyLimits: { insights: 3, forecast: 8, whatif: 20, ocr: 20 } };
const fullPolicy = defaultUsagePolicy();
const coinSnapshot = {
  coins: { enabled: true, balance: 5, balanceCap: 30, coinsPerAd: 2, earnedToday: 4, dailyEarnCap: 10, earnRemaining: 6, resetAtUTC: 1800057600000 },
  features: { insights: { enabled: true, price: 2, usesToday: 1, dailyUseCap: 2 }, forecast: { enabled: true, price: 1, usesToday: 0, dailyUseCap: 5 }, whatif: { enabled: false, price: 1, usesToday: 0, dailyUseCap: 10 }, ocr: { enabled: true, price: 3, usesToday: 0, dailyUseCap: 5 } },
};
const writtenRewards = { earnedToday: 2, usedToday: 1, earnRemaining: 0, resetAtUTC: 1800057600000 };
function request(body?: unknown, token = 'valid') {
  return new NextRequest('https://app.test/api/admin/usage', { method: body === undefined ? 'GET' : 'PUT', headers: token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : {}, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
}
beforeEach(() => {
  storage = rewardTestDb(); state.db = storage.db;
  // AI routes require a consenting adult (lib/user/age.ts).
  storage.docs.set('users/u', { ageStatus: 'adult', consents: { ai: { granted: true } } });
  storage.docs.set('config/admins', { emails: ['admin@test.example'] });
  state.verify.mockResolvedValue({ uid: 'u', email: 'admin@test.example' });
  state.dailySummary.mockResolvedValue(writtenRewards);
  state.coinSummary.mockResolvedValue(coinSnapshot);
});

describe('authenticated usage reads', () => {
  it('rejects missing and invalid tokens without any reward or allowance read', async () => {
    expect((await usage(request(undefined, ''))).status).toBe(401);
    state.verify.mockRejectedValue(new Error('invalid'));
    expect((await usage(request())).status).toBe(401);
    expect(state.dailySummary).not.toHaveBeenCalled();
  });
  it('returns the exact feature contract plus separate Written reward counters without mutating storage', async () => {
    const before = [...storage.docs.entries()];
    const response = await usage(request());
    expect(response.headers.get('Cache-Control')).toContain('no-store');
    const body = await response.json();
    expect(body.features).toHaveLength(4);
    expect(body.features[0]).toEqual({ id: 'insights', label: 'Written Analysis', freeDailyLimit: 3, freeRemaining: 3, freeResetAt: null, availableNow: 2, retryAfterSeconds: 0, cooldownUntil: null, coin: coinSnapshot.features.insights });
    expect(body.features.map((f: { coin: unknown }) => f.coin)).toEqual([coinSnapshot.features.insights, coinSnapshot.features.forecast, coinSnapshot.features.whatif, coinSnapshot.features.ocr]);
    expect(body.coins).toEqual(coinSnapshot.coins);
    expect(body.checkedAt).toEqual(expect.any(Number));
    expect(body.writtenRewards).toEqual(writtenRewards);
    expect(state.dailySummary).toHaveBeenCalledWith('u');
    expect(state.coinSummary).toHaveBeenCalledWith('u');
    expect([...storage.docs.entries()]).toEqual(before);
  });
  it('returns null coin fields when coins are switched off', async () => {
    state.coinSummary.mockResolvedValue({ coins: null, features: { insights: null, forecast: null, whatif: null, ocr: null } });
    const body = await (await usage(request())).json();
    expect(body.coins).toBeNull();
    expect(body.features.every((f: { coin: unknown }) => f.coin === null)).toBe(true);
  });
  it('fails honestly when coin summary storage fails', async () => {
    state.coinSummary.mockRejectedValue(new Error('storage offline'));
    expect((await usage(request())).status).toBe(500);
  });
  it('fails honestly when reward summary storage fails', async () => {
    state.dailySummary.mockRejectedValue(new Error('storage offline'));
    const response = await usage(request());
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'Unable to load usage.' });
  });
});

describe('admin usage policy', () => {
  it('requires a verified administrator for reads and writes', async () => {
    expect((await GET(request(undefined, ''))).status).toBe(401);
    expect((await PUT(request(policy, ''))).status).toBe(401);
    state.verify.mockRejectedValueOnce(new Error('expired'));
    expect((await GET(request())).status).toBe(401);
    state.verify.mockResolvedValue({ uid: 'student', email: 'student@test.example' });
    expect((await GET(request())).status).toBe(403);
    expect((await PUT(request(policy))).status).toBe(403);
    expect(storage.docs.has('config/usage')).toBe(false);
  });
  it('reports where the effective policy came from instead of silently showing defaults as saved', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(await (await GET(request())).json()).toEqual({ policy: fullPolicy, source: 'default', fallbacks: [] });
    storage.docs.set('config/usage', { dailyLimits: { insights: -1 } });
    expect(await (await GET(request())).json()).toMatchObject({ policy: fullPolicy, source: 'invalid', fallbacks: expect.arrayContaining(['dailyLimits.insights', 'dailyLimits.ocr']) });
    // A saved pause survives an unknown key and an invalid sibling.
    storage.docs.set('config/usage', { dailyLimits: { insights: 0, forecast: 'x', whatif: 20, ocr: 20 }, legacy: true });
    expect(await (await GET(request())).json()).toEqual({
      policy: { ...fullPolicy, dailyLimits: { insights: 0, forecast: 8, whatif: 20, ocr: 20 } }, source: 'partial', fallbacks: ['dailyLimits.forecast', 'coins'],
    });
    storage.docs.set('config/usage', fullPolicy);
    expect(await (await GET(request())).json()).toEqual({ policy: fullPolicy, source: 'stored', fallbacks: [] });
  });
  it('saves validated policy, keeping stored coin settings when a write omits them', async () => {
    const coins = { ...DEFAULT_COIN_POLICY, enabled: true, coinsPerAd: 3, features: { ...DEFAULT_COIN_POLICY.features, ocr: { enabled: false, price: 4, dailyUseCap: 1 } } };
    const withCoins = { dailyLimits: { insights: 0, forecast: 1000, whatif: 1, ocr: 2 }, coins };
    expect(await (await PUT(request(withCoins))).json()).toEqual({ policy: withCoins, source: 'stored', fallbacks: [] });
    expect(storage.docs.get('config/usage')).toEqual(withCoins);
    const dailyOnly = { dailyLimits: { insights: 5, forecast: 5, whatif: 5, ocr: 5 } };
    expect(await (await PUT(request(dailyOnly))).json()).toEqual({ policy: { ...dailyOnly, coins }, source: 'stored', fallbacks: [] });
    expect(storage.docs.get('config/usage')).toEqual({ ...dailyOnly, coins });
    expect(state.verify).toHaveBeenCalledWith('valid', true);
  });
  it.each([
    { dailyLimits: { ...policy.dailyLimits, ocr: 1001 } }, { dailyLimits: { ...policy.dailyLimits, forecast: '9' } }, { ...policy, rewardEnabled: true }, { dailyLimits: {} },
    { ...policy, coins: { ...DEFAULT_COIN_POLICY, balanceCap: 501 } }, { ...policy, coins: { enabled: true } },
    { ...policy, coins: { ...DEFAULT_COIN_POLICY, features: { ...DEFAULT_COIN_POLICY.features, whatif: { enabled: true, price: 0, dailyUseCap: 1 } } } },
  ])('rejects invalid or unsupported writes without changing the saved policy', async body => {
    storage.docs.set('config/usage', policy);
    const response = await PUT(request(body));
    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/invalid/i);
    expect(storage.docs.get('config/usage')).toEqual(policy);
  });
  it('returns 400 for malformed JSON and 500 for a failed save', async () => {
    const malformed = new NextRequest('https://app.test/api/admin/usage', { method: 'PUT', headers: { Authorization: 'Bearer valid' }, body: '{' });
    expect((await PUT(malformed)).status).toBe(400);
    state.db = { collection: () => ({ doc: (id: string) => ({ get: async () => ({ data: () => id === 'admins' ? { emails: ['admin@test.example'] } : undefined }), set: async () => { throw new Error('offline'); } }) }) };
    expect((await PUT(request(policy))).status).toBe(500);
  });
});
