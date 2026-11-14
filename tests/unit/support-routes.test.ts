import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { queryTestDb } from './query-test-db';

const state = vi.hoisted(() => ({ db: null as any, verify: vi.fn() }));
vi.mock('@/lib/firebase/admin', () => ({ get adminDb() { return state.db; }, adminAuth: { verifyIdToken: state.verify } }));

import { GET, POST } from '@/app/api/support/tickets/route';
import { invalidatePlatformSettingsCache } from '@/lib/platform/settings-server';

let store: ReturnType<typeof queryTestDb>;
const GOOD = { category: 'grades', message: 'My CGPA looks wrong after I added 200L.', platform: 'android', appVersion: '1.4.0', route: '/results' };
const post = (body: unknown, token = 'student-token') => POST(new NextRequest('https://app.test/api/support/tickets', {
  method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
}));
const list = (token = 'student-token') => GET(new NextRequest('https://app.test/api/support/tickets', { headers: { Authorization: `Bearer ${token}` } }));
const tickets = () => store.paths('support_tickets/').map((path) => ({ id: path.split('/')[1], ...store.docs.get(path) }));

beforeEach(() => {
  store = queryTestDb();
  state.db = store.db;
  invalidatePlatformSettingsCache();
  state.verify.mockReset().mockImplementation(async (token: string) => (token === 'other-token'
    ? { uid: 'bob', email: 'bob@test.example' }
    : { uid: 'ada', email: 'ada@test.example' }));
  store.docs.set('users/ada', { fullName: 'Ada Obi', email: 'ada@test.example', ageStatus: 'minor' });
  store.docs.set('users/bob', { fullName: 'Bob', email: 'bob@test.example' });
});

describe('POST /api/support/tickets', () => {
  it('validation, rate limit, kill switch, own tickets only', async () => {
    expect((await POST(new NextRequest('https://app.test/api/support/tickets', { method: 'POST', body: JSON.stringify(GOOD) }))).status).toBe(401);

    const bad = [
      { ...GOOD, category: 'billing' },
      { ...GOOD, message: 'too short' },
      { ...GOOD, message: 'x'.repeat(2001) },
      { ...GOOD, platform: 'ios' },
      { ...GOOD, appVersion: 'v'.repeat(33) },
      { ...GOOD, route: `/${'r'.repeat(120)}` },
      { ...GOOD, appVersion: 12 },
    ];
    for (const body of bad) expect((await post(body)).status).toBe(400);
    expect(tickets()).toHaveLength(0);

    // A minor may submit; optional fields may be left out (old clients).
    const created = await post({ category: 'bug', message: '  The results page is blank on my phone.  ', platform: 'web' });
    expect(created.status).toBe(201);
    const { ticketId } = await created.json();
    expect(ticketId).toEqual(expect.any(String));
    expect(store.docs.get(`support_tickets/${ticketId}`)).toMatchObject({
      uid: 'ada', email: 'ada@test.example', name: 'Ada Obi', category: 'bug', message: 'The results page is blank on my phone.',
      platform: 'web', appVersion: null, route: null, status: 'open', closedAt: null, purgeAt: null, replies: [],
      createdAt: expect.any(Date), updatedAt: expect.any(Date),
    });

    // 3 an hour.
    expect((await post(GOOD)).status).toBe(201);
    expect((await post(GOOD)).status).toBe(201);
    const limited = await post(GOOD);
    expect(limited.status).toBe(429);
    expect(limited.headers.get('Retry-After')).toBeTruthy();
    expect(tickets()).toHaveLength(3);

    // Kill switch: 503 even for a user with quota left; maintenance does not close support.
    store.docs.set('config/settings', { disabledFeatures: ['support'], maintenanceMode: true });
    invalidatePlatformSettingsCache();
    const off = await post(GOOD, 'other-token');
    expect(off.status).toBe(503);
    expect(await off.json()).toMatchObject({ code: 'FEATURE_DISABLED', feature: 'support' });
    store.docs.set('config/settings', { disabledFeatures: [], maintenanceMode: true });
    invalidatePlatformSettingsCache();
    expect((await post(GOOD, 'other-token')).status).toBe(201);

    // Own tickets only, newest first, without internal fields or admin emails.
    const first = tickets().find((ticket) => ticket.platform === 'web')!;
    store.docs.set(`support_tickets/${first.id}`, {
      ...store.docs.get(`support_tickets/${first.id}`),
      status: 'waiting', replies: [{ message: 'Fixed now.', at: new Date('2026-11-14T10:00:00Z'), actorEmail: 'admin@test.example' }],
    });
    const mine = await (await list()).json();
    expect(mine.tickets).toHaveLength(3);
    expect(mine.tickets.every((ticket: { id: string }) => tickets().find((t) => t.id === ticket.id)?.uid === 'ada')).toBe(true);
    const replied = mine.tickets.find((ticket: { id: string }) => ticket.id === first.id);
    expect(replied).toMatchObject({ status: 'waiting', category: 'bug', replies: [{ message: 'Fixed now.', at: '2026-11-14T10:00:00.000Z' }] });
    expect(JSON.stringify(mine)).not.toContain('admin@test.example');
    expect(JSON.stringify(mine)).not.toContain('"uid"');
    const bobs = await (await list('other-token')).json();
    expect(bobs.tickets).toHaveLength(1);
    expect((await GET(new NextRequest('https://app.test/api/support/tickets'))).status).toBe(401);
  });

  it('allows 10 a day', async () => {
    const day = 24 * 60 * 60 * 1000;
    const now = Date.now();
    // Pre-fill the daily window to its limit (the hourly window is fresh).
    store.docs.set('_api_rate_limits/ada_support_ticket_daily', { count: 10, windowStartedAt: { toMillis: () => now - 1000 }, expiresAt: new Date(now + day) });
    expect((await post(GOOD)).status).toBe(429);
  });
});
