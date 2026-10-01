import { NextRequest } from 'next/server';
import { generateKeyPairSync, sign } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { rewardTestDb } from './reward-test-db';

const state = vi.hoisted(() => ({ db: null as any, auth: vi.fn(), generate: vi.fn(), limiter: vi.fn() }));
vi.mock('@/lib/firebase/admin', () => ({ adminDb: {
  collection: (name: string) => state.db.collection(name),
  runTransaction: (work: any) => state.db.runTransaction(work),
} }));
vi.mock('@/lib/api/auth', () => ({ getVerifiedApiUser: state.auth }));
vi.mock('@/lib/ai/manager', () => ({ generateDeepInsightJSONWithMetadata: state.generate, getAiConfigRevision: async () => 1 }));
vi.mock('@/lib/api/logger', () => ({ apiTimer: () => () => 0, logApiCall: vi.fn() }));
vi.mock('@/lib/api/rate-limit', () => ({ checkRateLimit: state.limiter, rateLimitResponse: () => new Response('{}', { status: 429 }) }));

import { GET, POST, DELETE } from '@/app/api/ads/rewards/session/route';
import { GET as ssv } from '@/app/api/ads/rewards/ssv/route';
import { POST as insights } from '@/app/api/ai/insights/route';
import { rewards } from '@/lib/ads/reward';

const pair = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
const pem = pair.publicKey.export({ type: 'spki', format: 'pem' }).toString();
const config = { version: 1, enabled: true, rewardedEnabled: true, testMode: true, rewardedUnitId: '', bannerUnitId: '', placements: { dashboard: false, results: false } };
const data = { strengths: ['new'], concerns: [], recommendations: [], degreeOutlook: 'new analysis' };
const old = { ...data, degreeOutlook: 'saved analysis' };
let store: ReturnType<typeof rewardTestDb>;
const request = (path: string, method = 'GET', body?: unknown) => new NextRequest(`https://example.com${path}`, { method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
async function ready() {
  const s = await rewards.createSession('alice', 'android');
  await rewards.grant({ adUnit: '5224354917', customData: s.sessionId, userId: 'alice', rewardAmount: 10, rewardItem: 'coins', timestamp: Date.now(), transactionId: s.sessionId });
  return s;
}
function insight(sessionId?: string) { return insights(request('/api/ai/insights', 'POST', { semesterData: [], forceRegenerate: true, ...(sessionId ? { rewardSessionId: sessionId } : {}) })); }
describe('reward backend route integration', () => {
  afterEach(() => { vi.unstubAllGlobals(); });
  beforeEach(() => {
    store = rewardTestDb(); state.db = store.db;
    store.docs.set('config/mobileAds', { ...config });
    store.docs.set('analytics/alice', { lastInsight: { timestamp: new Date(), data: old } });
    state.auth.mockReset().mockResolvedValue({ uid: 'alice' });
    state.generate.mockReset().mockResolvedValue({ data, provenance: { providerId: 'gemini' } });
    state.limiter.mockReset().mockResolvedValue({ allowed: true, remaining: 1 });
  });
  it('authenticates session creation/status/cancellation and never trusts a client grant payload', async () => {
    state.auth.mockResolvedValue(null);
    expect((await POST(request('/api/ads/rewards/session', 'POST', { platform: 'android' }))).status).toBe(401);
    expect((await GET(request('/api/ads/rewards/session?sessionId=x'))).status).toBe(401);
    expect((await DELETE(request('/api/ads/rewards/session?sessionId=x', 'DELETE'))).status).toBe(401);
    state.auth.mockResolvedValue({ uid: 'alice' });
    const response = await POST(request('/api/ads/rewards/session', 'POST', { platform: 'android', earned: true, uid: 'bob' }));
    expect(response.status).toBe(200);
    const s = await response.json();
    expect(s).toMatchObject({ userId: 'alice', unitId: 'ca-app-pub-3940256099942544/5224354917', expiresAt: expect.any(Number) });
    expect(await (await GET(request(`/api/ads/rewards/session?sessionId=${s.sessionId}`))).json()).toMatchObject({ status: 'pending' });
    expect(await (await DELETE(request(`/api/ads/rewards/session?sessionId=${s.sessionId}`, 'DELETE'))).json()).toMatchObject({ status: 'expired' });
  });
  it('uses the real ECDSA verifier for the SSV route and allows signed validation-only', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ keys: [{ keyId: 123, pem }] }))));
    const s = await rewards.createSession('alice', 'android');
    const query = `ad_unit=5224354917&custom_data=${s.sessionId}&reward_amount=10&reward_item=coins&timestamp=${Date.now()}&transaction_id=route-tx&user_id=alice`;
    const url = (raw: string) => `/api/ads/rewards/ssv?${raw}&signature=${sign('sha256', Buffer.from(raw), pair.privateKey).toString('base64url')}&key_id=123`;
    expect(await (await ssv(request(url(query)))).json()).toMatchObject({ verified: true, granted: true });
    expect(await (await ssv(request(url(query)))).json()).toMatchObject({ duplicate: true, granted: false });
    expect((await ssv(request(url(query).replace('reward_amount=10', 'reward_amount=1')))).status).toBe(400);
    const validation = `ad_unit=5224354917&reward_amount=10&reward_item=coins&timestamp=${Date.now()}&transaction_id=verify-tool`;
    expect(await (await ssv(request(url(validation)))).json()).toMatchObject({ verified: true, validationOnly: true, granted: false });
    vi.unstubAllGlobals();
  });
  it('keeps the existing cooldown for ordinary requests and rejects pending/spoofed credits', async () => {
    expect((await insight()).status).toBe(429);
    const pending = await rewards.createSession('alice', 'android');
    expect((await insight(pending.sessionId)).status).toBe(409);
    expect((await insight('fake-client-reward')).status).toBe(400);
    expect(state.generate).not.toHaveBeenCalled();
  });
  it('bypasses cooldown and ordinary quota only for a verified reward and consumes once', async () => {
    const s = await ready();
    state.limiter.mockResolvedValue({ allowed: false, remaining: 0 });
    const result = await insight(s.sessionId);
    expect(result.status).toBe(200); expect(await result.json()).toEqual(data);
    expect((await rewards.status('alice', s.sessionId)).status).toBe('consumed');
    expect(store.docs.get('analytics/alice').lastInsight.data).toEqual(data);
    expect((await insight(s.sessionId)).status).toBe(409);
    expect(state.generate).toHaveBeenCalledTimes(1);
    expect(state.limiter).not.toHaveBeenCalled();
  });
  it('does not return cache HIT for a reward even without forceRegenerate', async () => {
    const s = await ready();
    store.docs.set('analytics/alice', { lastInsight: { timestamp: new Date(), data: old, inputSignature: JSON.stringify({ semesterData: [], configRevision: 1, promptRevision: 'You are an expert academic advisor at a top Nigerian University.' }) } });
    const response = await insights(request('/api/ai/insights', 'POST', { semesterData: [], rewardSessionId: s.sessionId }));
    expect(response.headers.get('X-AI-Cache')).toBe('MISS');
    expect(await response.json()).toEqual(data);
    expect((await rewards.status('alice', s.sessionId)).status).toBe('consumed');
  });
  it('releases the credit on provider failure/stale fallback and allows retry', async () => {
    const s = await ready(); state.generate.mockRejectedValueOnce(new Error('provider down'));
    const failed = await insight(s.sessionId);
    expect(await failed.json()).toMatchObject({ stale: true, degreeOutlook: 'saved analysis' });
    expect((await rewards.status('alice', s.sessionId)).status).toBe('earned');
    expect((await insight(s.sessionId)).status).toBe(200);
    expect((await rewards.status('alice', s.sessionId)).status).toBe('consumed');
  });
  it('returns authorization errors rather than stale success and honors disabled config', async () => {
    const s = await ready(); store.docs.set('config/mobileAds', { ...config, rewardedEnabled: false });
    expect((await insight(s.sessionId)).status).toBe(403);
    expect((await rewards.status('alice', s.sessionId)).status).toBe('earned');
    expect(state.generate).not.toHaveBeenCalled();
  });
  it('rejects a second concurrent generation against the same earned credit', async () => {
    const s = await ready(); let resolve!: (value: any) => void;
    state.generate.mockImplementationOnce(() => new Promise(r => { resolve = r; }));
    const first = insight(s.sessionId);
    await vi.waitFor(() => expect(state.generate).toHaveBeenCalledTimes(1));
    expect((await insight(s.sessionId)).status).toBe(409);
    resolve({ data, provenance: { providerId: 'gemini' } });
    expect((await first).status).toBe(200);
    expect(state.generate).toHaveBeenCalledTimes(1);
  });
  it('rolls back entitlement consumption when saving the generated insight fails', async () => {
    const s = await ready();
    store.failNextWrite('analytics/alice');
    const response = await insight(s.sessionId);
    expect(await response.json()).toMatchObject({ stale: true, degreeOutlook: 'saved analysis' });
    expect((await rewards.status('alice', s.sessionId)).status).toBe('earned');
    expect(store.docs.get('analytics/alice').lastInsight.data).toEqual(old);
    expect((await insight(s.sessionId)).status).toBe(200);
    expect((await rewards.status('alice', s.sessionId)).status).toBe('consumed');
  });
  it('releases entitlement on provider quota failure even when no fallback exists', async () => {
    const s = await ready(); store.docs.delete('analytics/alice');
    state.generate.mockRejectedValueOnce(new Error('provider 429'));
    expect((await insight(s.sessionId)).status).toBe(429);
    expect((await rewards.status('alice', s.sessionId)).status).toBe('earned');
  });
  it('retains ordinary cache hits without invoking the provider or limiter', async () => {
    store.docs.set('analytics/alice', { lastInsight: { timestamp: new Date(), data: old, inputSignature: JSON.stringify({ semesterData: [], configRevision: 1, promptRevision: 'You are an expert academic advisor at a top Nigerian University.' }) } });
    const response = await insights(request('/api/ai/insights', 'POST', { semesterData: [] }));
    expect(response.headers.get('X-AI-Cache')).toBe('HIT');
    expect(await response.json()).toEqual(old);
    expect(state.generate).not.toHaveBeenCalled();
    expect(state.limiter).not.toHaveBeenCalled();
  });
  it('retains ordinary generation limits and remaining-quota headers', async () => {
    store.docs.delete('analytics/alice');
    state.limiter.mockResolvedValueOnce({ allowed: false, remaining: 0 });
    expect((await insight()).status).toBe(429);
    expect(state.generate).not.toHaveBeenCalled();
    const response = await insight();
    expect(response.status).toBe(200);
    expect(response.headers.get('X-RateLimit-Remaining')).toBe('1');
    expect(response.headers.get('X-AI-Reward')).toBeNull();
    expect(state.limiter).toHaveBeenLastCalledWith('alice', 'ai_insights', [
      { name: 'hourly', limit: 2, windowMs: 3600000 },
      { name: 'daily', limit: 3, windowMs: 86400000 },
    ]);
  });
  it('preserves earned credit if the operator disables delivery during generation', async () => {
    const s = await ready();
    state.generate.mockImplementationOnce(async () => {
      store.docs.set('config/mobileAds', { ...config, rewardedEnabled: false });
      return { data, provenance: { providerId: 'gemini' } };
    });
    expect((await insight(s.sessionId)).status).toBe(403);
    expect((await rewards.status('alice', s.sessionId)).status).toBe('earned');
    expect(store.docs.get('analytics/alice').lastInsight.data).toEqual(old);
  });
});
