import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { queryTestDb } from './query-test-db';

const state = vi.hoisted(() => ({
  db: null as any,
  user: { uid: 'ada' } as { uid: string } | null,
  balance: vi.fn(),
  aiAllowed: true,
}));
vi.mock('@/lib/firebase/admin', () => ({ get adminDb() { return state.db; } }));
vi.mock('@/lib/api/auth', () => ({ getVerifiedApiUser: async () => state.user }));
vi.mock('@/lib/ads/reward', () => ({ coins: { balance: state.balance } }));
vi.mock('@/lib/user/age', () => ({ getAiEligibility: async () => ({ aiAllowed: state.aiAllowed }) }));

import { GET } from '@/app/api/coins/history/route';

const hash = (uid: string) => createHash('sha256').update(uid).digest('hex');
let store: ReturnType<typeof queryTestDb>;
const get = (query = '') => GET(new Request(`https://app.test/api/coins/history${query}`, { headers: { Authorization: 'Bearer t' } }) as any);
let n = 0;
const entry = (uid: string, extra: Record<string, unknown>) => store.docs.set(`_coin_ledger/e${n++}`, { uidHash: hash(uid), type: 'earn', amount: 1, balanceAfter: 1, at: 1000, ...extra });

beforeEach(() => {
  n = 0;
  store = queryTestDb();
  state.db = store.db;
  state.user = { uid: 'ada' };
  state.aiAllowed = true;
  state.balance.mockReset().mockResolvedValue(4);
});

describe('GET /api/coins/history', () => {
  it('requires a signed-in user', async () => {
    state.user = null;
    expect((await get()).status).toBe(401);
  });

  it('returns the caller only, newest first, without internal ids or admin emails', async () => {
    entry('ada', { type: 'earn', amount: 1, balanceAfter: 1, at: 1000, sessionId: 'sess-secret' });
    entry('ada', { type: 'spend', amount: 3, feature: 'insights', balanceAfter: 4, at: 3000, requestId: 'req-secret' });
    entry('ada', { type: 'grant', amount: 5, balanceAfter: 9, at: 2000, actorEmail: 'admin@test.example' });
    entry('bob', { type: 'earn', amount: 1, at: 4000 });
    const response = await get();
    const body = await response.json();
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(body.balance).toBe(4);
    expect(body.entries.map((e: any) => e.type)).toEqual(['spend', 'grant', 'earn']);
    expect(body.entries[0]).toEqual({ type: 'spend', amount: 3, feature: 'insights', at: new Date(3000).toISOString(), balanceAfter: 4 });
    const text = JSON.stringify(body);
    for (const secret of ['sess-secret', 'req-secret', 'admin@test.example', 'uidHash']) expect(text).not.toContain(secret);
  });

  it('clamps the limit (default 30, max 100)', async () => {
    for (let i = 0; i < 120; i++) entry('ada', { at: i });
    expect((await (await get()).json()).entries).toHaveLength(30);
    expect((await (await get('?limit=500')).json()).entries).toHaveLength(100);
    expect((await (await get('?limit=5')).json()).entries).toHaveLength(5);
    expect((await (await get('?limit=abc')).json()).entries).toHaveLength(30);
  });

  it('returns an empty list for accounts that may not use AI (no coins for minors)', async () => {
    entry('ada', { at: 1 });
    state.aiAllowed = false;
    expect(await (await get()).json()).toEqual({ entries: [], balance: 0 });
  });
});
