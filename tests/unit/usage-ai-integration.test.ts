import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { rewardTestDb } from './reward-test-db';

const state = vi.hoisted(() => ({ db: null as any }));
vi.mock('@/lib/firebase/admin', () => ({ get adminDb() { return state.db; } }));
vi.mock('@/lib/api/auth', () => ({ getVerifiedApiUser: async () => ({ uid: 'u' }) }));
vi.mock('@/lib/api/logger', () => ({ apiTimer: () => () => 0, logApiCall: () => undefined }));
vi.mock('@/lib/ai/manager', () => ({
  getAiConfigRevision: async () => 1,
  generateDeepInsightJSONWithMetadata: async () => { throw new Error('Provider must not run'); },
  generateForecastResponseWithMetadata: async () => { throw new Error('Provider must not run'); },
  generateFastResponseWithMetadata: async () => { throw new Error('Provider must not run'); },
  generateMultimodalGeminiContentWithMetadata: async () => { throw new Error('Provider must not run'); },
}));
vi.mock('@/lib/ads/reward', () => ({ rewards: {}, coins: { quote: async () => null }, RewardError: class extends Error {} }));
import { POST as insights } from '@/app/api/ai/insights/route';
import { POST as forecast } from '@/app/api/ai/forecast/route';
import { POST as whatif } from '@/app/api/ai/whatif/route';
import { POST as ocr } from '@/app/api/results/extract/route';

let storage: ReturnType<typeof rewardTestDb>;
beforeEach(() => {
  storage = rewardTestDb(); state.db = storage.db;
  // AI routes require a consenting adult (lib/user/age.ts).
  storage.docs.set('users/u', { ageStatus: 'adult', consents: { ai: { granted: true } } });
  storage.docs.set('config/usage', { dailyLimits: { insights: 1, forecast: 1, whatif: 1, ocr: 1 } });
});

describe('AI route centralized allowance enforcement', () => {
  it.each([
    ['insights', insights, 'ai_insights', { semesterData: [] }],
    ['forecast', forecast, 'ai_forecast', { piHistory: [3, 3.5], cgpaHistory: [3, 3.5] }],
    ['whatif', whatif, 'ai_whatif', { currentCGPA: 3.5, totalCredits: 100, targetCGPA: 3.8, remainingSemesters: 2, creditLoad: 18 }],
    ['ocr', ocr, 'results_extract', { base64Data: 'YQ==', mimeType: 'image/png' }],
  ] as const)('%s rejects the configured daily ceiling before calling its provider', async (_id, handler, endpoint, body) => {
    storage.docs.set(`_api_rate_limits/u_${endpoint}_daily`, { count: 1, windowStartedAt: Timestamp.fromMillis(Date.now() - 1000) });
    const before = [...storage.docs.entries()];
    const response = await handler(new NextRequest('https://app.test/api/ai/test', { method: 'POST', body: JSON.stringify(body) }));
    expect(response.status).toBe(429);
    expect(await response.json()).toMatchObject({ window: 'daily', limit: 1 });
    expect([...storage.docs.entries()]).toEqual(before);
  });
});
