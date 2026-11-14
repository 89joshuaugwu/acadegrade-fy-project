import { beforeEach, describe, expect, it, vi } from 'vitest';
import { queryTestDb } from './query-test-db';

const state = vi.hoisted(() => ({
  db: null as any,
  requireAdmin: vi.fn(),
  audit: vi.fn(),
  sendEmail: vi.fn(),
  rtdbPath: [] as string[],
  unread: {} as Record<string, number>,
}));

vi.mock('@/lib/firebase/admin', () => ({
  get adminDb() { return state.db; },
  adminRtdb: {
    ref: (path: string) => ({
      transaction: async (fn: (value: number | null) => number) => {
        state.rtdbPath.push(path);
        state.unread[path] = fn(state.unread[path] ?? null);
        return { committed: true };
      },
    }),
  },
}));
vi.mock('@/lib/api/admin-audit', () => ({ writeAdminAudit: state.audit }));
vi.mock('@/lib/email/mailer', () => ({ sendEmail: state.sendEmail, supportReplyEmail: (name: string, message: string) => `<p>${name}: ${message}</p>` }));
vi.mock('@/lib/api/admin-auth', () => ({
  requireAdmin: state.requireAdmin,
  AdminAuthorizationError: class AdminAuthorizationError extends Error {
    constructor(public status: 401 | 403) { super(status === 401 ? 'Unauthorized' : 'Forbidden'); }
  },
}));

import { GET, POST } from '@/app/api/admin/support/route';
import { supportRetentionJob } from '@/lib/cron/support';

const ADMIN = { uid: 'admin-1', email: 'admin@test.example' };
const DAY = 24 * 60 * 60 * 1000;
let store: ReturnType<typeof queryTestDb>;

const post = (body: unknown) => POST(new Request('https://app.test/api/admin/support', {
  method: 'POST', headers: { Authorization: 'Bearer t', 'Content-Type': 'application/json' }, body: JSON.stringify(body),
}));
const get = (query = '') => GET(new Request(`https://app.test/api/admin/support${query}`, { headers: { Authorization: 'Bearer t' } }));

function ticket(id: string, extra: Record<string, unknown> = {}) {
  store.docs.set(`support_tickets/${id}`, {
    uid: 'ada', email: 'ada@test.example', name: 'Ada', category: 'grades', message: 'My CGPA looks wrong.', platform: 'web',
    appVersion: null, route: null, status: 'open', createdAt: new Date('2026-11-10T00:00:00Z'), updatedAt: new Date('2026-11-10T00:00:00Z'),
    closedAt: null, purgeAt: null, replies: [], ...extra,
  });
}

beforeEach(() => {
  store = queryTestDb();
  state.db = store.db;
  state.requireAdmin.mockReset().mockResolvedValue(ADMIN);
  state.audit.mockReset().mockResolvedValue(undefined);
  state.sendEmail.mockReset().mockResolvedValue(undefined);
  state.rtdbPath = [];
  state.unread = {};
});

describe('GET /api/admin/support', () => {
  it('lists by status, newest first, with a cursor', async () => {
    for (let i = 0; i < 5; i += 1) ticket(`t${i}`, { createdAt: new Date(Date.UTC(2026, 10, 1 + i)) });
    ticket('closed', { status: 'closed', createdAt: new Date(Date.UTC(2026, 10, 9)) });
    const first = await (await get('?status=open&limit=2')).json();
    expect(first.tickets.map((t: { id: string }) => t.id)).toEqual(['t4', 't3']);
    expect(first.tickets[0]).toMatchObject({ email: 'ada@test.example', category: 'grades', status: 'open', createdAt: '2026-11-05T00:00:00.000Z' });
    const second = await (await get(`?status=open&limit=2&cursor=${first.nextCursor}`)).json();
    expect(second.tickets.map((t: { id: string }) => t.id)).toEqual(['t2', 't1']);
    expect((await (await get('?status=closed')).json()).tickets.map((t: { id: string }) => t.id)).toEqual(['closed']);
    expect((await get('?status=nope')).status).toBe(400);
  });
});

describe('POST /api/admin/support', () => {
  it('reply writes inbox item, RTDB count, email and audit', async () => {
    ticket('t1');
    state.unread['notif_counts/ada/unread'] = 2;
    const response = await post({ action: 'reply', ticketId: 't1', message: 'Thanks, we fixed the 200L total.' });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ success: true, emailSent: true });

    const items = store.paths('notifications/ada/items/').map((path) => store.docs.get(path));
    expect(items).toEqual([{ title: 'Reply from AcadeGrade support', message: 'Thanks, we fixed the 200L total.', type: 'system', read: false, createdAt: expect.any(Date) }]);
    expect(state.unread['notif_counts/ada/unread']).toBe(3);
    expect(state.sendEmail).toHaveBeenCalledWith('ada@test.example', 'Reply from AcadeGrade support', expect.stringContaining('Thanks, we fixed'));
    expect(store.docs.get('support_tickets/t1')).toMatchObject({
      status: 'waiting', replies: [{ message: 'Thanks, we fixed the 200L total.', at: expect.any(Date), actorEmail: ADMIN.email }],
    });
    expect(state.audit).toHaveBeenCalledWith(expect.objectContaining({ action: 'support.reply', target: 'support_tickets/t1', actorEmail: ADMIN.email }));
  });

  it('a failed email still records the reply', async () => {
    ticket('t1');
    state.sendEmail.mockRejectedValueOnce(new Error('smtp down'));
    const body = await (await post({ action: 'reply', ticketId: 't1', message: 'Hello there' })).json();
    expect(body).toMatchObject({ success: true, emailSent: false });
    expect(store.paths('notifications/ada/items/')).toHaveLength(1);
  });

  it('validates replies and the reply limit', async () => {
    ticket('t1');
    expect((await post({ action: 'reply', ticketId: 't1', message: '   ' })).status).toBe(400);
    expect((await post({ action: 'reply', ticketId: 't1', message: 'x'.repeat(2001) })).status).toBe(400);
    expect((await post({ action: 'reply', ticketId: 'missing', message: 'Hello there' })).status).toBe(404);
    expect((await post({ action: 'shout', ticketId: 't1' })).status).toBe(400);
    ticket('full', { replies: Array.from({ length: 20 }, () => ({ message: 'm', at: new Date(), actorEmail: 'a' })) });
    expect((await post({ action: 'reply', ticketId: 'full', message: 'One more' })).status).toBe(409);
    expect(state.audit).not.toHaveBeenCalled();
  });

  it('close sets purgeAt', async () => {
    ticket('t1');
    const before = Date.now();
    expect((await post({ action: 'close', ticketId: 't1' })).status).toBe(200);
    const closed = store.docs.get('support_tickets/t1');
    expect(closed.status).toBe('closed');
    expect((closed.closedAt as Date).getTime()).toBeGreaterThanOrEqual(before);
    expect((closed.purgeAt as Date).getTime() - (closed.closedAt as Date).getTime()).toBe(180 * DAY);
    expect(state.audit).toHaveBeenCalledWith(expect.objectContaining({ action: 'support.close', target: 'support_tickets/t1' }));

    expect((await post({ action: 'reopen', ticketId: 't1' })).status).toBe(200);
    expect(store.docs.get('support_tickets/t1')).toMatchObject({ status: 'open', closedAt: null, purgeAt: null });
    expect(state.audit).toHaveBeenCalledWith(expect.objectContaining({ action: 'support.reopen' }));
  });
});

describe('supportRetentionJob', () => {
  it('deletes only closed tickets past purgeAt', async () => {
    const now = Date.UTC(2026, 10, 14, 3);
    ticket('old', { status: 'closed', closedAt: new Date(now - 200 * DAY), purgeAt: new Date(now - 20 * DAY) });
    ticket('recent', { status: 'closed', closedAt: new Date(now - 10 * DAY), purgeAt: new Date(now + 170 * DAY) });
    ticket('open');
    const result = await supportRetentionJob.run({ db: store.db, now, deadline: Date.now() + 60_000 });
    expect(result.deleted).toEqual({ support_tickets: 1 });
    expect(store.paths('support_tickets/').sort()).toEqual(['support_tickets/open', 'support_tickets/recent']);
  });
});
