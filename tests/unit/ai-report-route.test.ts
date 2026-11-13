import { createHash } from 'node:crypto';
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { queryTestDb } from './query-test-db';

const state = vi.hoisted(() => ({ db: null as any, verify: vi.fn() }));
vi.mock('@/lib/firebase/admin', () => ({ get adminDb() { return state.db; }, adminAuth: { verifyIdToken: state.verify } }));

import { POST } from '@/app/api/ai/report/route';
import { invalidatePlatformSettingsCache } from '@/lib/platform/settings-server';

let store: ReturnType<typeof queryTestDb>;
const send = (body: unknown, token = 'good') => POST(new NextRequest('https://app.test/api/ai/report', {
  method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: typeof body === 'string' ? body : JSON.stringify(body),
}));
const feedback = () => store.paths('_ai_feedback/').map((path) => store.docs.get(path));

beforeEach(() => {
  store = queryTestDb(); state.db = store.db;
  invalidatePlatformSettingsCache();
  state.verify.mockReset().mockResolvedValue({ uid: 'alice', email: 'alice@test.example' });
});

describe('POST /api/ai/report', () => {
  it('stores a report with a hashed uid and no academic content, and returns { ok: true }', async () => {
    const response = await send({ feature: 'whatif', kind: 'report', reason: 'inaccurate', note: 'The note said 6.0 is possible', platform: 'android' });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(feedback()).toEqual([{
      uidHash: createHash('sha256').update('alice').digest('hex'),
      feature: 'whatif', kind: 'report', reason: 'inaccurate', note: 'The note said 6.0 is possible', platform: 'android',
      providerId: null, modelId: null, createdAt: expect.any(Date),
    }]);
    expect(JSON.stringify(feedback())).not.toContain('alice');
  });

  it('adds the provider and model from the saved result for insights and forecast, never the result itself', async () => {
    store.docs.set('analytics/alice', {
      lastInsight: { data: { degreeOutlook: 'PRIVATE ANALYSIS' }, provenance: { providerId: 'openrouter', modelId: 'openrouter/free', configRevision: 3 } },
      forecast: { trendLabel: 'PRIVATE LABEL', provenance: { providerId: 'gemini', modelId: 'gemini-3.1-flash-lite' } },
    });
    await send({ feature: 'insights', kind: 'helpful' });
    await send({ feature: 'forecast', kind: 'not_helpful', reason: 'other' });
    expect(feedback().map((entry) => [entry.feature, entry.providerId, entry.modelId, entry.platform, entry.reason, entry.note])).toEqual(expect.arrayContaining([
      ['insights', 'openrouter', 'openrouter/free', 'unknown', null, null],
      ['forecast', 'gemini', 'gemini-3.1-flash-lite', 'unknown', 'other', null],
    ]));
    expect(JSON.stringify(feedback())).not.toContain('PRIVATE');
  });

  it('validates the body', async () => {
    for (const body of [
      { feature: 'chat', kind: 'report' },
      { feature: 'ocr', kind: 'love' },
      { feature: 'ocr', kind: 'report', reason: 'boring' },
      { feature: 'ocr', kind: 'report', note: 'x'.repeat(501) },
      { feature: 'ocr', kind: 'report', extra: true },
      'not json',
    ]) expect((await send(body)).status).toBe(400);
    expect(feedback()).toEqual([]);
  });

  it('requires authentication', async () => {
    expect((await send({ feature: 'ocr', kind: 'report' }, '')).status).toBe(401);
  });

  it('is rate limited to 20 per day', async () => {
    for (let index = 0; index < 20; index += 1) expect((await send({ feature: 'ocr', kind: 'helpful' })).status).toBe(200);
    expect((await send({ feature: 'ocr', kind: 'helpful' })).status).toBe(429);
    expect(feedback()).toHaveLength(20);
  });

  it('stays open during maintenance', async () => {
    store.docs.set('config/settings', { maintenanceMode: true });
    expect((await send({ feature: 'ocr', kind: 'report', reason: 'unsafe' })).status).toBe(200);
  });
});
