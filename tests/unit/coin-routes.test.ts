import { NextRequest } from 'next/server';
import { createHash, generateKeyPairSync, sign } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { rewardTestDb } from './reward-test-db';

const state = vi.hoisted(() => ({ db: null as any, auth: vi.fn(), insight: vi.fn(), forecast: vi.fn(), fast: vi.fn(), extract: vi.fn(), limiter: vi.fn() }));
vi.mock('@/lib/firebase/admin', () => ({ adminDb: {
  collection: (name: string) => state.db.collection(name),
  runTransaction: (work: any) => state.db.runTransaction(work),
} }));
vi.mock('@/lib/api/auth', () => ({ getVerifiedApiUser: state.auth }));
vi.mock('@/lib/ai/manager', () => ({
  getAiConfigRevision: async () => 1,
  generateDeepInsightJSONWithMetadata: state.insight,
  generateForecastResponseWithMetadata: state.forecast,
  generateFastResponseWithMetadata: state.fast,
  generateMultimodalGeminiContentWithMetadata: state.extract,
}));
vi.mock('@/lib/api/logger', () => ({ apiTimer: () => () => 0, logApiCall: vi.fn() }));
vi.mock('@/lib/api/rate-limit', async () => ({ ...await vi.importActual<object>('@/lib/api/rate-limit'), checkRateLimit: state.limiter }));

import { DELETE, GET, POST } from '@/app/api/ads/rewards/session/route';
import { GET as ssv } from '@/app/api/ads/rewards/ssv/route';
import { POST as insights } from '@/app/api/ai/insights/route';
import { POST as forecast } from '@/app/api/ai/forecast/route';
import { POST as whatif } from '@/app/api/ai/whatif/route';
import { POST as ocr } from '@/app/api/results/extract/route';

const config = { version: 1, enabled: true, rewardedEnabled: true, testMode: true, rewardedUnitId: '', bannerUnitId: '', placements: { dashboard: false, results: false } };
const sha = (value: string) => createHash('sha256').update(value).digest('hex');
const rid = (n: number) => n.toString(16).padStart(32, '0');
const insightData = { strengths: ['new'], concerns: [], recommendations: [], degreeOutlook: 'fresh' };
const refused = { allowed: false, remaining: 0, retryAfterSeconds: 60, limit: 2, window: 'hourly' };
let store: ReturnType<typeof rewardTestDb>;
const walletDoc = () => store.docs.get(`_coin_wallets/${sha('alice')}`);
const coinDocs = () => [...store.docs.entries()].filter(([key]) => key.startsWith('_coin'));
function enableCoins(coins: Record<string, unknown> = {}) { store.docs.set('config/usage', { coins: { enabled: true, ...coins } }); }
function fund(balance: number) { store.docs.set(`_coin_wallets/${sha('alice')}`, { balance, holds: {} }); }

type Route = { name: 'insights' | 'forecast' | 'whatif' | 'ocr'; price: number; send: (requestId?: string, body?: Record<string, unknown>) => Promise<Response>; provider: () => ReturnType<typeof vi.fn> };
const jsonPost = (handler: (r: NextRequest) => Promise<Response>, body: unknown, headers: Record<string, string> = {}) =>
  handler(new NextRequest('https://app.test/api/test', { method: 'POST', body: JSON.stringify(body), headers }));
const routes: Route[] = [
  { name: 'insights', price: 2, provider: () => state.insight, send: (id, body = {}) => jsonPost(insights, { semesterData: [], ...body, ...(id ? { coinSpend: { requestId: id } } : {}) }) },
  { name: 'forecast', price: 1, provider: () => state.forecast, send: (id, body = {}) => jsonPost(forecast, { piHistory: [3, 3.5], cgpaHistory: [3, 3.2], ...body, ...(id ? { coinSpend: { requestId: id } } : {}) }) },
  { name: 'whatif', price: 1, provider: () => state.fast, send: (id, body = {}) => jsonPost(whatif, { currentCGPA: 3.5, totalCredits: 100, targetCGPA: 3.8, remainingSemesters: 2, creditLoad: 18, ...body, ...(id ? { coinSpend: { requestId: id } } : {}) }) },
  { name: 'ocr', price: 3, provider: () => state.extract, send: (id, body = {}) => jsonPost(ocr, { base64Data: 'YQ==', mimeType: 'image/png', ...body }, id ? { 'X-Coin-Spend-Id': id } : {}) },
];

beforeEach(() => {
  store = rewardTestDb(); state.db = store.db;
  store.docs.set('config/mobileAds', { ...config });
  // AI routes require a consenting adult (lib/user/age.ts).
  store.docs.set('users/alice', { ageStatus: 'adult', consents: { ai: { granted: true } } });
  state.auth.mockReset().mockResolvedValue({ uid: 'alice', token: 't' });
  state.insight.mockReset().mockResolvedValue({ data: insightData, provenance: { providerId: 'gemini' } });
  state.forecast.mockReset().mockResolvedValue({ text: 'Steady & Upward', providerId: 'p', modelId: 'm', configRevision: 1 });
  state.fast.mockReset().mockResolvedValue({ text: 'Achievable with steady work.', providerId: 'p', modelId: 'm', configRevision: 1 });
  state.extract.mockReset().mockResolvedValue({ text: '[{"code":"CSC 401","units":3}]', providerId: 'p' });
  state.limiter.mockReset().mockResolvedValue({ allowed: true, remaining: 1, retryAfterSeconds: 0, limit: 2, window: 'hourly' });
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}')));
});
afterEach(() => { vi.unstubAllGlobals(); });

describe('coin earning sessions over HTTP', () => {
  it('creates coin sessions only when enabled, rejects unknown rewards, and keeps legacy sessions unchanged', async () => {
    const post = (body: unknown) => POST(new NextRequest('https://app.test/api/ads/rewards/session', { method: 'POST', body: JSON.stringify(body) }));
    const off = await post({ platform: 'android', reward: 'coins' });
    expect(off.status).toBe(403);
    expect(off.headers.get('Cache-Control')).toBe('no-store');
    enableCoins();
    expect((await post({ platform: 'android', reward: 'gems' })).status).toBe(400);
    const created = await post({ platform: 'android', reward: 'coins' });
    const session = await created.json();
    expect(session).toEqual({ sessionId: expect.any(String), unitId: 'ca-app-pub-3940256099942544/5224354917', userId: 'alice', expiresAt: expect.any(Number), reward: 'coins', coins: 2 });
    const status = await GET(new NextRequest(`https://app.test/api/ads/rewards/session?sessionId=${session.sessionId}`));
    expect(await status.json()).toEqual({ status: 'pending', expiresAt: session.expiresAt, reward: 'coins', balance: 0 });
    expect(await (await DELETE(new NextRequest(`https://app.test/api/ads/rewards/session?sessionId=${session.sessionId}`, { method: 'DELETE' }))).json()).toMatchObject({ status: 'expired' });
    const legacy = await (await post({ platform: 'android' })).json();
    expect(Object.keys(legacy).sort()).toEqual(['expiresAt', 'sessionId', 'unitId', 'userId']);
    fund(30);
    expect(await (await post({ platform: 'android', reward: 'coins' })).json()).toEqual({ error: 'Your coin balance is full' });
  });

  it('credits the wallet only from a signed SSV callback and reports it through status', async () => {
    enableCoins();
    const pair = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
    const pem = pair.publicKey.export({ type: 'spki', format: 'pem' }).toString();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ keys: [{ keyId: 7, pem }] }))));
    const session = await (await POST(new NextRequest('https://app.test/api/ads/rewards/session', { method: 'POST', body: JSON.stringify({ platform: 'android', reward: 'coins' }) }))).json();
    const query = `ad_unit=5224354917&custom_data=${session.sessionId}&reward_amount=10&reward_item=coins&timestamp=${Date.now()}&transaction_id=coin-tx&user_id=alice`;
    const url = `https://app.test/api/ads/rewards/ssv?${query}&signature=${sign('sha256', Buffer.from(query), pair.privateKey).toString('base64url')}&key_id=7`;
    expect(await (await ssv(new NextRequest(url))).json()).toMatchObject({ verified: true, granted: true, coins: 2 });
    expect(await (await ssv(new NextRequest(url))).json()).toMatchObject({ verified: true, granted: false, duplicate: true });
    const status = await (await GET(new NextRequest(`https://app.test/api/ads/rewards/session?sessionId=${session.sessionId}`))).json();
    expect(status).toEqual({ status: 'credited', expiresAt: expect.any(Number), reward: 'coins', coinsGranted: 2, balance: 2 });
    expect((await ssv(new NextRequest(`https://app.test/api/ads/rewards/ssv?${query}`))).status).toBe(400);
    expect(walletDoc().balance).toBe(2);
  });
});

describe.each(routes)('$name coin spending', route => {
  beforeEach(() => { enableCoins(); fund(10); });

  it('serves the free path first, without charging, when the free allowance allows it', async () => {
    const before = coinDocs();
    const response = await route.send(rid(1));
    expect(response.status).toBe(200);
    expect(response.headers.get('X-Coins-Spent')).toBe('0');
    expect(response.headers.get('X-Coin-Balance')).toBeNull();
    expect(coinDocs()).toEqual(before);
    expect(state.limiter).toHaveBeenCalledTimes(1);
  });

  it('charges the feature price only when the free path refuses, skipping no further free units', async () => {
    state.limiter.mockResolvedValue(refused);
    const response = await route.send(rid(2));
    expect(response.status).toBe(200);
    expect(response.headers.get('X-Coins-Spent')).toBe(String(route.price));
    expect(response.headers.get('X-Coin-Balance')).toBe(String(10 - route.price));
    expect(walletDoc()).toMatchObject({ balance: 10 - route.price, usesToday: { [route.name]: 1 }, holds: {} });
    expect(route.provider()).toHaveBeenCalledTimes(1);
    expect(state.limiter).toHaveBeenCalledTimes(1);
    // The same requestId is never charged twice (forced, so a cached result can't answer it).
    const replay = await route.send(rid(2), { forceRegenerate: true });
    expect(replay.status).toBe(409);
    expect(replay.headers.get('Cache-Control')).toBe('no-store');
    expect(walletDoc().balance).toBe(10 - route.price);
    expect(route.provider()).toHaveBeenCalledTimes(1);
  });

  it('adds the coin price and balance to the free-limit 429 only when coins can pay', async () => {
    state.limiter.mockResolvedValue(refused);
    const hinted = await route.send();
    expect(hinted.status).toBe(429);
    expect(await hinted.json()).toMatchObject({ window: 'hourly', limit: 2, coinPrice: route.price, coinBalance: 10 });
    enableCoins({ features: { [route.name]: { enabled: false } } });
    expect(await (await route.send()).json()).not.toHaveProperty('coinPrice');
    store.docs.set('config/usage', {});
    const plain = await (await route.send()).json();
    expect(plain).not.toHaveProperty('coinPrice');
    expect(route.provider()).not.toHaveBeenCalled();
  });

  it('returns 402, 403, 429 and 400 without calling the provider or holding coins', async () => {
    state.limiter.mockResolvedValue(refused);
    fund(route.price - 1);
    const poor = await route.send(rid(3));
    expect(poor.status).toBe(402);
    expect(await poor.json()).toEqual({ error: 'Not enough coins', balance: route.price - 1, price: route.price });
    expect(poor.headers.get('Cache-Control')).toBe('no-store');
    fund(10);
    enableCoins({ features: { [route.name]: { enabled: false } } });
    expect((await route.send(rid(4))).status).toBe(403);
    store.docs.set('config/usage', { coins: { enabled: false } });
    expect((await route.send(rid(4))).status).toBe(403);
    enableCoins({ features: { [route.name]: { dailyUseCap: 0 } } });
    expect((await route.send(rid(4))).status).toBe(429);
    enableCoins();
    for (const bad of ['ABCDEF'.repeat(6), 'f'.repeat(31), 'f'.repeat(65), 'not-hex-not-hex-not-hex-not-hex-0']) {
      const malformed = await route.send(bad);
      expect(malformed.status).toBe(400);
      expect(malformed.headers.get('Cache-Control')).toBe('no-store');
    }
    expect(route.provider()).not.toHaveBeenCalled();
    expect(walletDoc()).toEqual({ balance: 10, holds: {} });
  });

  it('refunds on provider failure, says so, and lets the same request retry once successfully', async () => {
    state.limiter.mockResolvedValue(refused);
    route.provider().mockRejectedValueOnce(new Error('provider down'));
    const failed = await route.send(rid(5));
    expect(failed.status).toBe(503);
    expect((await failed.json()).error).toMatch(/your coins were not spent/);
    expect(failed.headers.get('Cache-Control')).toBe('no-store');
    expect(walletDoc()).toMatchObject({ balance: 10, holds: {} });
    expect(store.docs.get(`_coin_requests/${sha(`alice:${rid(5)}`)}`)).toMatchObject({ status: 'refunded' });
    const retried = await route.send(rid(5));
    expect(retried.status).toBe(200);
    expect(walletDoc().balance).toBe(10 - route.price);
  });

  it('charges at most once for racing duplicates of one request', async () => {
    state.limiter.mockResolvedValue(refused);
    const results = await Promise.all([route.send(rid(6)), route.send(rid(6))]);
    expect(results.map(r => r.status).sort()).toEqual([200, 409]);
    expect(walletDoc().balance).toBe(10 - route.price);
  });
});

describe('route-specific coin rules', () => {
  beforeEach(() => { enableCoins(); fund(10); state.limiter.mockResolvedValue(refused); });

  it('never charges a cache hit or a request that needs no provider call', async () => {
    const signature = JSON.stringify({ piHistory: [3, 3.5], cgpaHistory: [3, 3.2], configRevision: 1, promptRevision: 1 });
    store.docs.set('analytics/alice', { forecast: { trendLabel: 'cached', inputSignature: signature, lastUpdated: new Date() } });
    const cached = await routes[1].send(rid(7));
    expect(cached.headers.get('X-AI-Cache')).toBe('HIT');
    expect(cached.headers.get('X-Coins-Spent')).toBe('0');
    const insightSignature = JSON.stringify({ semesterData: [], configRevision: 1, promptRevision: 'You are an expert academic advisor at a top Nigerian University.' });
    store.docs.set('analytics/alice', { lastInsight: { timestamp: new Date(), data: insightData, inputSignature: insightSignature } });
    expect((await routes[0].send(rid(8))).headers.get('X-AI-Cache')).toBe('HIT');
    const impossible = await routes[2].send(rid(9), { targetCGPA: 5, currentCGPA: 1 });
    expect(impossible.status).toBe(200);
    expect(impossible.headers.get('X-Coins-Spent')).toBe('0');
    expect(await routes[1].send(rid(10), { piHistory: [], cgpaHistory: [] }).then(r => r.headers.get('X-Coins-Spent'))).toBe('0');
    expect(walletDoc()).toEqual({ balance: 10, holds: {} });
    expect(state.limiter).not.toHaveBeenCalled();
    expect(state.forecast).not.toHaveBeenCalled();
    expect(state.insight).not.toHaveBeenCalled();
  });

  it('validates input, size and MIME before any charge', async () => {
    expect((await routes[1].send(rid(11), { piHistory: [9] , cgpaHistory: [9] })).status).toBe(400);
    expect((await routes[2].send(rid(11), { creditLoad: 99 })).status).toBe(400);
    expect((await routes[3].send(rid(11), { mimeType: 'text/plain' })).status).toBe(400);
    expect((await routes[3].send(rid(11), { base64Data: 'A'.repeat(14_000_000) })).status).toBe(413);
    expect((await routes[0].send(rid(11), { semesterData: 'x' })).status).toBe(400);
    expect(walletDoc()).toEqual({ balance: 10, holds: {} });
    expect(coinDocs().filter(([key]) => key.startsWith('_coin_requests/'))).toHaveLength(0);
  });

  it('persists the charged forecast and insight in the same transaction as the charge', async () => {
    await routes[1].send(rid(12));
    expect(store.docs.get('analytics/alice').forecast).toMatchObject({ trendLabel: 'Steady & Upward' });
    store.failNextWrite('analytics/alice');
    const failed = await routes[0].send(rid(13), { forceRegenerate: true });
    expect(failed.status).toBe(503);
    expect(walletDoc().balance).toBe(9);
    expect(store.docs.get('analytics/alice').lastInsight).toBeUndefined();
    expect((await routes[0].send(rid(13), { forceRegenerate: true })).headers.get('X-Coins-Spent')).toBe('2');
    expect(store.docs.get('analytics/alice').lastInsight.data).toEqual(insightData);
  });

  it('charges coins for the Written Analysis 12-hour regeneration cooldown and never returns stale data', async () => {
    state.limiter.mockResolvedValue({ allowed: true, remaining: 1 });
    store.docs.set('analytics/alice', { lastInsight: { timestamp: new Date(Date.now() - 3600000), data: { ...insightData, degreeOutlook: 'saved' } } });
    const hinted = await routes[0].send(undefined, { forceRegenerate: true });
    expect(hinted.status).toBe(429);
    expect(await hinted.json()).toMatchObject({ retryAfterSeconds: expect.any(Number), coinPrice: 2, coinBalance: 10 });
    state.insight.mockRejectedValueOnce(new Error('provider down'));
    const failed = await routes[0].send(rid(14), { forceRegenerate: true });
    expect(failed.status).toBe(503);
    expect(await failed.json()).not.toHaveProperty('stale');
    const charged = await routes[0].send(rid(15), { forceRegenerate: true });
    expect(charged.headers.get('X-Coins-Spent')).toBe('2');
    expect(await charged.json()).toEqual(insightData);
    expect(state.limiter).not.toHaveBeenCalled();
  });

  it('rejects mixing a legacy reward session with a coin spend', async () => {
    const response = await routes[0].send(rid(16), { rewardSessionId: 'a'.repeat(64) });
    expect(response.status).toBe(400);
    expect(state.insight).not.toHaveBeenCalled();
  });
});
