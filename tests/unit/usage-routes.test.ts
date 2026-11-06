import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { rewardTestDb } from './reward-test-db';

const state = vi.hoisted(() => ({ db: null as any, verify: vi.fn(), dailySummary: vi.fn() }));
vi.mock('@/lib/firebase/admin', () => ({ get adminDb() { return state.db; }, adminAuth: { verifyIdToken: state.verify } }));
vi.mock('@/lib/ads/reward', () => ({ rewards: { dailySummary: state.dailySummary } }));
import { GET as usage } from '@/app/api/ai/usage/route';
import { GET, PUT } from '@/app/api/admin/usage/route';

let storage: ReturnType<typeof rewardTestDb>;
const policy = { dailyLimits: { insights: 3, forecast: 8, whatif: 20, ocr: 20 } };
const writtenRewards = { earnedToday: 2, usedToday: 1, earnRemaining: 0, resetAtUTC: 1800057600000 };
function request(body?: unknown, token = 'valid') {
  return new NextRequest('https://app.test/api/admin/usage', { method: body === undefined ? 'GET' : 'PUT', headers: token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : {}, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
}
beforeEach(() => {
  storage = rewardTestDb(); state.db = storage.db;
  storage.docs.set('config/admins', { emails: ['admin@test.example'] });
  state.verify.mockResolvedValue({ uid: 'u', email: 'admin@test.example' });
  state.dailySummary.mockResolvedValue(writtenRewards);
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
    expect(body.features[0]).toEqual({ id: 'insights', label: 'Written Analysis', freeDailyLimit: 3, freeRemaining: 3, freeResetAt: null, availableNow: 2, retryAfterSeconds: 0, cooldownUntil: null });
    expect(body.checkedAt).toEqual(expect.any(Number));
    expect(body.writtenRewards).toEqual(writtenRewards);
    expect(state.dailySummary).toHaveBeenCalledWith('u');
    expect([...storage.docs.entries()]).toEqual(before);
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
  it('defaults absent/invalid config and saves only validated daily policy', async () => {
    expect(await (await GET(request())).json()).toEqual(policy);
    storage.docs.set('config/usage', { dailyLimits: { insights: -1 } });
    expect(await (await GET(request())).json()).toEqual(policy);
    const saved = { dailyLimits: { insights: 0, forecast: 1000, whatif: 1, ocr: 2 } };
    expect(await (await PUT(request(saved))).json()).toEqual(saved);
    expect(storage.docs.get('config/usage')).toEqual(saved);
    expect(state.verify).toHaveBeenCalledWith('valid', true);
  });
  it.each([{ dailyLimits: { ...policy.dailyLimits, ocr: 1001 } }, { dailyLimits: { ...policy.dailyLimits, forecast: '9' } }, { ...policy, rewardEnabled: true }, { dailyLimits: {} }])('rejects invalid or unsupported writes without changing the saved policy', async body => {
    storage.docs.set('config/usage', policy);
    const response = await PUT(request(body));
    expect(response.status).toBe(400);
    expect(storage.docs.get('config/usage')).toEqual(policy);
  });
  it('returns 400 for malformed JSON and 500 for a failed save', async () => {
    const malformed = new NextRequest('https://app.test/api/admin/usage', { method: 'PUT', headers: { Authorization: 'Bearer valid' }, body: '{' });
    expect((await PUT(malformed)).status).toBe(400);
    state.db = { collection: () => ({ doc: (id: string) => ({ get: async () => ({ data: () => id === 'admins' ? { emails: ['admin@test.example'] } : undefined }), set: async () => { throw new Error('offline'); } }) }) };
    expect((await PUT(request(policy))).status).toBe(500);
  });
});
