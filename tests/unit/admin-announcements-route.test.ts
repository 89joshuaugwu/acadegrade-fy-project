import { beforeEach, describe, expect, it, vi } from 'vitest';
import { queryTestDb } from './query-test-db';

const state = vi.hoisted(() => ({
  db: null as any,
  requireAdmin: vi.fn(),
  audit: vi.fn(),
  send: vi.fn(),
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
  collections: [] as string[],
}));

vi.mock('@/lib/firebase/admin', () => ({
  get adminDb() { return state.db; },
  adminMessaging: { send: state.send, subscribeToTopic: state.subscribe, unsubscribeFromTopic: state.unsubscribe },
}));
vi.mock('@/lib/api/admin-audit', () => ({ writeAdminAudit: state.audit }));
vi.mock('@/lib/api/admin-auth', () => ({
  requireAdmin: state.requireAdmin,
  AdminAuthorizationError: class AdminAuthorizationError extends Error {
    constructor(public status: 401 | 403) { super(status === 401 ? 'Unauthorized' : 'Forbidden'); }
  },
}));

import { GET, POST } from '@/app/api/admin/announcements/route';
import { createScheduledAnnouncementsJob, createTopicBackfillJob } from '@/lib/cron/announcements';
import { topicsForProfile, universityTopic } from '@/lib/notifications/topics';

const ADMIN = { uid: 'admin-1', email: 'admin@test.example' };
const HOUR = 60 * 60 * 1000;
let store: ReturnType<typeof queryTestDb>;

const post = (body: unknown) => POST(new Request('https://app.test/api/admin/announcements', {
  method: 'POST', headers: { Authorization: 'Bearer t', 'Content-Type': 'application/json' }, body: JSON.stringify(body),
}));
const DRAFT = {
  title: 'Exam timetable is out', body: 'Check the portal for your exam dates.', linkUrl: '/dashboard',
  audience: { universities: ['University of Lagos'], levels: [300] }, showAsBanner: true, push: true,
};
const announcements = () => store.paths('announcements/').map((path) => ({ id: path.split('/')[1], ...store.docs.get(path) }));

beforeEach(() => {
  store = queryTestDb();
  const realCollection = store.db.collection.bind(store.db);
  state.collections = [];
  (store.db as any).collection = (name: string) => { state.collections.push(name); return realCollection(name); };
  state.db = store.db;
  state.requireAdmin.mockReset().mockResolvedValue(ADMIN);
  state.audit.mockReset().mockResolvedValue(undefined);
  state.send.mockReset().mockResolvedValue('projects/p/messages/1');
  state.subscribe.mockReset().mockResolvedValue({ successCount: 1 });
  state.unsubscribe.mockReset().mockResolvedValue({ successCount: 1 });
});

describe('POST /api/admin/announcements', () => {
  it('publish sends one condition message, never reads users, audits', async () => {
    const saved = await post({ action: 'save', announcement: DRAFT });
    expect(saved.status).toBe(200);
    const { announcement } = await saved.json();
    expect(announcement).toMatchObject({ id: expect.any(String), status: 'draft', title: DRAFT.title, sentAt: null });
    expect(state.send).not.toHaveBeenCalled();

    const published = await post({ action: 'publish', announcement: { id: announcement.id } });
    expect(published.status).toBe(200);
    expect(await published.json()).toMatchObject({ pushed: true, announcement: { status: 'published', sentAt: expect.any(String) } });
    expect(state.send).toHaveBeenCalledTimes(1);
    expect(state.send).toHaveBeenCalledWith({
      condition: `('${universityTopic('University of Lagos')}' in topics) && ('ag_l_300' in topics)`,
      notification: { title: DRAFT.title, body: DRAFT.body },
      data: { type: 'announcement', url: '/dashboard', announcementId: announcement.id },
      android: { ttl: 259200000 },
    });
    expect(state.collections).not.toContain('users');
    expect(state.audit.mock.calls.map(([entry]) => entry.action)).toEqual(['announcements.save', 'announcements.publish']);

    // Publishing again never sends a second push.
    await post({ action: 'publish', announcement: { id: announcement.id } });
    expect(state.send).toHaveBeenCalledTimes(1);
  });

  it('validates title, body, link and audience size', async () => {
    const bad = [
      { ...DRAFT, title: '' },
      { ...DRAFT, title: 'x'.repeat(81) },
      { ...DRAFT, body: 'x'.repeat(501) },
      { ...DRAFT, linkUrl: 'http://insecure.example' },
      { ...DRAFT, linkUrl: 'javascript:alert(1)' },
      { ...DRAFT, linkUrl: '//evil.example' },
      { ...DRAFT, audience: { universities: ['A', 'B', 'C'], levels: [100, 200, 300] } },
      { ...DRAFT, audience: { levels: [100, 200, 300, 400, 500, 600] } },
      { ...DRAFT, audience: { levels: [-1] } },
      { ...DRAFT, startsAt: '2026-12-01T00:00:00Z', endsAt: '2026-11-01T00:00:00Z' },
    ];
    for (const announcement of bad) expect((await post({ action: 'save', announcement })).status).toBe(400);
    expect(announcements()).toHaveLength(0);
    expect((await post({ action: 'save', announcement: { ...DRAFT, linkUrl: 'https://example.com/x', audience: {} } })).status).toBe(200);
    expect((await post({ action: 'explode', announcement: DRAFT })).status).toBe(400);
  });

  it('schedule needs a future start; archive hides it', async () => {
    expect((await post({ action: 'schedule', announcement: { ...DRAFT, startsAt: new Date(Date.now() - HOUR).toISOString() } })).status).toBe(400);
    const scheduled = await (await post({ action: 'schedule', announcement: { ...DRAFT, push: false, startsAt: new Date(Date.now() + 24 * HOUR).toISOString() } })).json();
    expect(scheduled.announcement.status).toBe('scheduled');
    const archived = await (await post({ action: 'archive', announcement: { id: scheduled.announcement.id } })).json();
    expect(archived.announcement.status).toBe('archived');
    expect(state.audit.mock.calls.map(([entry]) => entry.action)).toEqual(['announcements.schedule', 'announcements.archive']);
  });

  it('GET lists announcements and the topic backfill state', async () => {
    await post({ action: 'save', announcement: DRAFT });
    let body = await (await GET(new Request('https://app.test/api/admin/announcements'))).json();
    expect(body.announcements).toHaveLength(1);
    expect(body.topicsBackfill).toEqual({ completedOnce: false });
    store.docs.set('_cron_state/topics', { completedOnce: true, cursor: null });
    body = await (await GET(new Request('https://app.test/api/admin/announcements'))).json();
    expect(body.topicsBackfill).toEqual({ completedOnce: true });
  });
});

describe('announcement cron jobs', () => {
  const messaging = () => ({ send: state.send, subscribeToTopic: state.subscribe, unsubscribeFromTopic: state.unsubscribe });

  it('publishes only due scheduled items', async () => {
    const now = Date.UTC(2026, 10, 14, 3, 10);
    const base = { title: 'T', body: 'B', linkUrl: null, audience: {}, endsAt: null, showAsBanner: false, sentAt: null, createdBy: 'a', createdAt: new Date(now - 48 * HOUR), updatedAt: new Date(now - 48 * HOUR) };
    store.docs.set('announcements/due', { ...base, status: 'scheduled', push: true, startsAt: new Date(now - HOUR) });
    store.docs.set('announcements/later', { ...base, status: 'scheduled', push: true, startsAt: new Date(now + 20 * HOUR) });
    store.docs.set('announcements/draft', { ...base, status: 'draft', push: true, startsAt: new Date(now - HOUR) });
    store.docs.set('announcements/quiet', { ...base, status: 'scheduled', push: false, startsAt: new Date(now - 2 * HOUR) });

    const job = createScheduledAnnouncementsJob(async () => messaging());
    const result = await job.run({ db: store.db, now, deadline: Date.now() + 60_000 });
    expect(result.written).toBe(2);
    expect(store.docs.get('announcements/due')).toMatchObject({ status: 'published', sentAt: expect.any(Date) });
    expect(store.docs.get('announcements/quiet')).toMatchObject({ status: 'published', sentAt: null });
    expect(store.docs.get('announcements/later').status).toBe('scheduled');
    expect(store.docs.get('announcements/draft').status).toBe('draft');
    expect(state.send).toHaveBeenCalledTimes(1);
    expect(state.send.mock.calls[0][0]).toMatchObject({ condition: "'ag_all' in topics", data: { announcementId: 'due', url: '/notifications' } });
  });

  it('backfill resumes from cursor', async () => {
    for (let i = 0; i < 5; i += 1) store.docs.set(`users/u${i}`, { fcmTokens: [`tok${i}`], currentLevel: 100 });
    store.docs.set('users/u2', { currentLevel: 100 }); // no devices
    const job = createTopicBackfillJob({ getMessaging: async () => messaging(), pageSize: 2 });

    const first = await job.run({ db: store.db, now: Date.now(), deadline: Date.now() + 60_000 });
    expect(first.truncated).toBe(true);
    expect(store.docs.get('_cron_state/topics')).toMatchObject({ cursor: 'u1', completedOnce: false });
    expect(store.docs.get('users/u0').fcmTopics).toEqual(topicsForProfile({ currentLevel: 100 }));
    expect(store.docs.get('users/u2').fcmTopics).toBeUndefined();

    await job.run({ db: store.db, now: Date.now(), deadline: Date.now() + 60_000 });
    expect(store.docs.get('_cron_state/topics').cursor).toBe('u3');
    const last = await job.run({ db: store.db, now: Date.now(), deadline: Date.now() + 60_000 });
    expect(last.truncated).toBe(false);
    expect(store.docs.get('_cron_state/topics')).toMatchObject({ cursor: null, completedOnce: true });
    expect(store.docs.get('users/u4').fcmTopics).toEqual(['ag_all', 'ag_l_100']);
    // u2 has no devices: nothing to subscribe, and no write.
    expect(store.docs.get('users/u2').fcmTopics).toBeUndefined();
  });
});
