import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryTestDb } from './query-test-db';

const state = vi.hoisted(() => ({ db: null as any, auth: vi.fn(), insight: vi.fn(), forecast: vi.fn(), fast: vi.fn(), extract: vi.fn(), limiter: vi.fn() }));
// Forwarding object: reward/coin services capture adminDb when the module loads.
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

import { POST as rewardSession } from '@/app/api/ads/rewards/session/route';
import { POST as insights } from '@/app/api/ai/insights/route';
import { POST as forecast } from '@/app/api/ai/forecast/route';
import { POST as whatif } from '@/app/api/ai/whatif/route';
import { GET as usage } from '@/app/api/ai/usage/route';
import { POST as ocr } from '@/app/api/results/extract/route';
import { invalidatePlatformSettingsCache } from '@/lib/platform/settings-server';

let store: ReturnType<typeof queryTestDb>;
const consent = { ai: { granted: true, version: '2026-11-13', at: new Date() } };
const adult = { ageStatus: 'adult', consents: consent };
const post = (handler: (r: NextRequest) => Promise<Response>, body: unknown, headers: Record<string, string> = {}) =>
  handler(new NextRequest('https://app.test/api/x', { method: 'POST', body: JSON.stringify(body), headers }));
const routes = [
  { name: 'insights', feature: 'ai_insights', send: () => post(insights, { semesterData: [], forceRegenerate: true }), provider: () => state.insight },
  { name: 'whatif', feature: 'ai_whatif', send: () => post(whatif, { currentCGPA: 3.5, totalCredits: 100, targetCGPA: 3.8, remainingSemesters: 2, creditLoad: 18 }), provider: () => state.fast },
  { name: 'ocr', feature: 'extract_slip', send: () => post(ocr, { base64Data: 'YQ==', mimeType: 'image/png' }, { 'X-Coin-Spend-Id': 'a'.repeat(32) }), provider: () => state.extract },
] as const;
const sendForecast = () => post(forecast, { piHistory: [3, 3.5], cgpaHistory: [3, 3.2], coinSpend: { requestId: 'b'.repeat(32) } });
const nothingSpent = () => {
  expect(state.limiter).not.toHaveBeenCalled();
  expect(store.paths('_coin')).toEqual([]);
  expect(store.paths('_reward')).toEqual([]);
};

beforeEach(() => {
  store = queryTestDb(); state.db = store.db;
  invalidatePlatformSettingsCache();
  store.docs.set('config/mobileAds', { version: 1, enabled: true, rewardedEnabled: true, testMode: true, rewardedUnitId: '', bannerUnitId: '', placements: { dashboard: false, results: false } });
  store.docs.set('config/usage', { coins: { enabled: true } });
  state.auth.mockReset().mockResolvedValue({ uid: 'alice', token: 't', email: 'alice@test.example' });
  state.insight.mockReset().mockResolvedValue({ data: { strengths: [], concerns: [], recommendations: [], degreeOutlook: 'x' }, provenance: { providerId: 'p' } });
  state.forecast.mockReset().mockResolvedValue({ text: 'AI Label', providerId: 'p', modelId: 'm', configRevision: 1 });
  state.fast.mockReset().mockResolvedValue({ text: 'Doable.', providerId: 'p', modelId: 'm', configRevision: 1 });
  state.extract.mockReset().mockResolvedValue({ text: '[]', providerId: 'p' });
  state.limiter.mockReset().mockResolvedValue({ allowed: true, remaining: 1, retryAfterSeconds: 0, limit: 2, window: 'hourly' });
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}')));
});
afterEach(() => { vi.unstubAllGlobals(); });

describe.each(routes)('$name age and consent gate', (route) => {
  it('serves consenting adults', async () => {
    store.docs.set('users/alice', adult);
    expect((await route.send()).status).toBe(200);
    expect(route.provider()).toHaveBeenCalledTimes(1);
  });

  it('returns 403 AGE_RESTRICTED for minors before any limiter, coin or provider work', async () => {
    store.docs.set('users/alice', { ageStatus: 'minor' });
    const response = await route.send();
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: expect.any(String), code: 'AGE_RESTRICTED' });
    expect(route.provider()).not.toHaveBeenCalled();
    nothingSpent();
  });

  it('asks an old account with no fields to confirm its age, and an adult without consent to opt in', async () => {
    store.docs.set('users/alice', {});
    expect(await (await route.send()).json()).toMatchObject({ code: 'AGE_CONFIRMATION_REQUIRED', error: 'Confirm your age in AcadeGrade to use AI features' });
    store.docs.set('users/alice', { ageStatus: 'adult' });
    expect(await (await route.send()).json()).toMatchObject({ code: 'AI_CONSENT_REQUIRED' });
    expect(route.provider()).not.toHaveBeenCalled();
    nothingSpent();
  });

  it('lets unknown answers through when the operator relaxes enforcement, but never minors or a withdrawal', async () => {
    store.docs.set('config/settings', { ageGate: { enforceUnknown: false } });
    store.docs.set('users/alice', {});
    expect((await route.send()).status).toBe(200);
    store.docs.set('users/alice', { ageStatus: 'adult', consents: { ai: { granted: false } } });
    expect(await (await route.send()).json()).toMatchObject({ code: 'AI_CONSENT_REQUIRED' });
  });

  it('returns 503 FEATURE_DISABLED for its kill switch', async () => {
    store.docs.set('users/alice', adult);
    store.docs.set('config/settings', { disabledFeatures: [route.feature] });
    const response = await route.send();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: expect.any(String), code: 'FEATURE_DISABLED', feature: route.feature });
    expect(route.provider()).not.toHaveBeenCalled();
  });

  it('returns 503 MAINTENANCE for students and exempts admins', async () => {
    store.docs.set('users/alice', adult);
    store.docs.set('config/settings', { maintenanceMode: true });
    store.docs.set('config/admins', { emails: ['boss@test.example'] });
    expect(await (await route.send()).json()).toMatchObject({ code: 'MAINTENANCE' });
    state.auth.mockResolvedValue({ uid: 'alice', token: 't', email: 'boss@test.example' });
    expect((await route.send()).status).toBe(200);
  });
});

describe('forecast for restricted users', () => {
  it('returns the mathematical forecast with a fixed label and no provider, limiter or coin work', async () => {
    store.docs.set('users/alice', { ageStatus: 'minor' });
    const response = await sendForecast();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({ trendLabel: 'Steady improvement', trendDirection: 'improving', aiEnhanced: false, riskScore: expect.any(Number), projectedPi: expect.any(Array) });
    expect(response.headers.get('X-Coins-Spent')).toBe('0');
    expect(state.forecast).not.toHaveBeenCalled();
    nothingSpent();
    expect(store.docs.get('analytics/alice')).toBeUndefined();
  });

  it('still uses the AI label for consenting adults', async () => {
    store.docs.set('users/alice', adult);
    expect(await (await sendForecast()).json()).toMatchObject({ trendLabel: 'AI Label' });
  });

  it('honours ai_forecast and maintenance', async () => {
    store.docs.set('users/alice', adult);
    store.docs.set('config/settings', { disabledFeatures: ['ai_forecast'] });
    expect(await (await sendForecast()).json()).toMatchObject({ code: 'FEATURE_DISABLED', feature: 'ai_forecast' });
    store.docs.set('config/settings', { maintenanceMode: true });
    invalidatePlatformSettingsCache();
    expect(await (await sendForecast()).json()).toMatchObject({ code: 'MAINTENANCE' });
  });
});

describe('rewarded sessions', () => {
  const create = (reward?: string) => post(rewardSession, { platform: 'android', ...(reward ? { reward } : {}) });

  it('refuses coin and legacy sessions for minors without creating anything', async () => {
    store.docs.set('users/alice', { ageStatus: 'minor' });
    for (const reward of ['coins', undefined]) {
      const response = await create(reward);
      expect(response.status).toBe(403);
      expect(await response.json()).toMatchObject({ code: 'AGE_RESTRICTED' });
    }
    nothingSpent();
  });

  it('creates sessions for consenting adults and returns 503 in maintenance', async () => {
    store.docs.set('users/alice', adult);
    expect((await create('coins')).status).toBe(200);
    store.docs.set('config/settings', { maintenanceMode: true });
    invalidatePlatformSettingsCache();
    expect(await (await create('coins')).json()).toMatchObject({ code: 'MAINTENANCE' });
  });

  it('still rejects an unknown reward type with 400 for allowed users', async () => {
    store.docs.set('users/alice', adult);
    expect((await create('gems')).status).toBe(400);
  });
});

describe('usage summary age block', () => {
  it('reports age, AI permission and consent, and marks coins unavailable when AI is not allowed', async () => {
    store.docs.set('users/alice', { ageStatus: 'minor' });
    const minor = await (await usage(new NextRequest('https://app.test/api/ai/usage'))).json();
    expect(minor.age).toEqual({ status: 'minor', aiAllowed: false, aiConsent: null });
    expect(minor.coins).toMatchObject({ enabled: false });
    expect(minor.features.every((feature: { coin: { enabled: boolean } | null }) => feature.coin === null || feature.coin.enabled === false)).toBe(true);

    store.docs.set('users/alice', adult);
    const allowed = await (await usage(new NextRequest('https://app.test/api/ai/usage'))).json();
    expect(allowed.age).toEqual({ status: 'adult', aiAllowed: true, aiConsent: true });
    expect(allowed.coins).toMatchObject({ enabled: true });

    store.docs.set('users/alice', {});
    expect((await (await usage(new NextRequest('https://app.test/api/ai/usage'))).json()).age).toEqual({ status: 'unknown', aiAllowed: false, aiConsent: null });
  });
});
