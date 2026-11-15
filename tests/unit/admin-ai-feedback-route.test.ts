import { beforeEach, describe, expect, it, vi } from 'vitest';
import { queryTestDb } from './query-test-db';

const state = vi.hoisted(() => ({ db: null as any, requireAdmin: vi.fn() }));
vi.mock('@/lib/firebase/admin', () => ({ get adminDb() { return state.db; } }));
vi.mock('@/lib/api/admin-auth', () => ({
  requireAdmin: state.requireAdmin,
  AdminAuthorizationError: class AdminAuthorizationError extends Error {
    constructor(public status: 401 | 403) { super(status === 401 ? 'Unauthorized' : 'Forbidden'); }
  },
}));

import { GET } from '@/app/api/admin/ai/feedback/route';
import { AdminAuthorizationError } from '@/lib/api/admin-auth';

let store: ReturnType<typeof queryTestDb>;
const DAY = 24 * 60 * 60 * 1000;
const get = (query = '') => GET(new Request(`https://app.test/api/admin/ai/feedback${query}`, { headers: { Authorization: 'Bearer t' } }));
let n = 0;
function row(extra: Record<string, unknown>) {
  store.docs.set(`_ai_feedback/f${n++}`, {
    uidHash: 'abc', feature: 'insights', kind: 'helpful', reason: null, note: null, platform: 'web',
    providerId: 'groq', modelId: 'llama', createdAt: new Date(Date.now() - DAY), ...extra,
  });
}

beforeEach(() => {
  n = 0;
  store = queryTestDb();
  state.db = store.db;
  state.requireAdmin.mockReset().mockResolvedValue({ uid: 'a', email: 'admin@test.example' });
});

describe('GET /api/admin/ai/feedback', () => {
  it('rejects non-admins', async () => {
    state.requireAdmin.mockRejectedValue(new AdminAuthorizationError(403));
    expect((await get()).status).toBe(403);
  });

  it('aggregates rates per model; never returns notes unless report kind', async () => {
    row({ kind: 'helpful' });
    row({ kind: 'helpful' });
    row({ kind: 'not_helpful' });
    row({ kind: 'not_helpful', reason: 'inaccurate', note: 'secret rating note' });
    row({ kind: 'report', reason: 'offensive', note: 'rude reply', feature: 'forecast', providerId: 'gemini', modelId: 'flash' });
    row({ kind: 'helpful', createdAt: new Date(Date.now() - 90 * DAY) });
    const body = await (await get('?days=30')).json();
    expect(body.total).toBe(4);
    expect(body.byFeature.insights).toEqual({ helpful: 2, notHelpful: 1, reports: 0 });
    expect(body.byFeature.forecast.reports).toBe(1);
    const groq = body.byModel.find((m: any) => m.modelId === 'llama');
    expect(groq).toMatchObject({ providerId: 'groq', helpful: 2, notHelpful: 1, reports: 0 });
    expect(groq.helpfulRate).toBeCloseTo(2 / 3);
    expect(body.notHelpfulReasons).toEqual({ inaccurate: 1 });
    expect(body.reports).toHaveLength(1);
    expect(body.reports[0]).toMatchObject({ feature: 'forecast', reason: 'offensive', note: 'rude reply' });
    const text = JSON.stringify(body);
    expect(text).not.toContain('secret rating note');
    expect(text).not.toContain('abc');
  });

  it('clamps days and handles an empty collection', async () => {
    const body = await (await get('?days=9999')).json();
    expect(body.days).toBe(90);
    expect(body.total).toBe(0);
    expect(body.byModel).toEqual([]);
    expect((await (await get('?days=x')).json()).days).toBe(30);
  });
});
