import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { queryTestDb } from './query-test-db';
import { inboxActionUrl, safeInboxActionUrl } from '@/lib/notifications/action-url';

const state = vi.hoisted(() => ({ db: null as any, verify: vi.fn(), sendEmail: vi.fn(), multicast: vi.fn() }));
vi.mock('@/lib/firebase/admin', () => ({
  get adminDb() { return state.db; },
  adminAuth: { verifyIdToken: state.verify },
  adminRtdb: { ref: () => ({ transaction: async () => ({ committed: true }) }) },
  adminMessaging: { sendEachForMulticast: state.multicast },
}));
vi.mock('@/lib/email/mailer', () => ({
  sendEmail: state.sendEmail, welcomeEmail: () => '<p>hi</p>', semesterSavedEmail: () => '<p>saved</p>', degreeClassEmail: () => '<p>class</p>',
}));
vi.mock('@/lib/api/logger', () => ({ apiTimer: () => () => 0, logApiCall: vi.fn() }));

import { POST as notify } from '@/app/api/notifications/send/route';
import { invalidatePlatformSettingsCache } from '@/lib/platform/settings-server';

const ORIGINS = ['https://acadegrade.vercel.app'];

describe('safeInboxActionUrl', () => {
  it('keeps same-site relative paths', () => {
    expect(safeInboxActionUrl('/insights', ORIGINS)).toBe('/insights');
    expect(safeInboxActionUrl(' /results/s1?tab=a#x ', ORIGINS)).toBe('/results/s1?tab=a#x');
  });

  it('turns this site\'s absolute links into paths', () => {
    expect(safeInboxActionUrl('https://acadegrade.vercel.app/support?x=1', ORIGINS)).toBe('/support?x=1');
  });

  it('rejects other hosts, scripts, data and protocol-relative links', () => {
    for (const bad of [
      'https://evil.example/insights', 'http://acadegrade.vercel.app/insights', '//evil.example/x', '/\\evil.example',
      'javascript:alert(1)', 'JavaScript:alert(1)', 'data:text/html,<b>x</b>', 'insights', '', '   ', `/${'a'.repeat(2100)}`,
      '/ok\nnext', 42, null, undefined, { url: '/x' },
    ]) expect(safeInboxActionUrl(bad, ORIGINS)).toBeNull();
  });
});

describe('inboxActionUrl', () => {
  it('prefers a valid data.url, then the event route', () => {
    expect(inboxActionUrl({ url: '/timetable', event: 'degreeClass' }, ORIGINS)).toBe('/timetable');
    expect(inboxActionUrl({ url: 'javascript:alert(1)', event: 'degreeClass' }, ORIGINS)).toBe('/insights');
    expect(inboxActionUrl({ event: 'degreeClass' }, ORIGINS)).toBe('/insights');
    expect(inboxActionUrl({ event: 'semesterSaved' }, ORIGINS)).toBe('/results');
    expect(inboxActionUrl({ event: 'aiInsights' }, ORIGINS)).toBe('/insights');
    expect(inboxActionUrl({ event: 'somethingElse' }, ORIGINS)).toBeNull();
    expect(inboxActionUrl({}, ORIGINS)).toBeNull();
  });
});

describe('POST /api/notifications/send', () => {
  let store: ReturnType<typeof queryTestDb>;
  const request = (body: unknown) => new NextRequest('https://acadegrade.vercel.app/api/notifications/send', {
    method: 'POST', headers: { Authorization: 'Bearer good', 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const items = () => store.paths('notifications/alice/items/').map((path) => store.docs.get(path));

  beforeEach(() => {
    store = queryTestDb(); state.db = store.db;
    invalidatePlatformSettingsCache();
    store.docs.set('config/admins', { emails: [] });
    store.docs.set('users/alice', { email: 'alice@test.example', fcmTokens: [] });
    state.verify.mockReset().mockResolvedValue({ uid: 'alice', email: 'alice@test.example' });
    state.sendEmail.mockReset().mockResolvedValue(undefined);
    state.multicast.mockReset().mockResolvedValue({ successCount: 0, responses: [] });
  });

  it('stores the event route as the inbox actionUrl', async () => {
    const response = await notify(request({ uid: 'alice', title: 'T', message: 'M', type: 'achievement', event: 'degreeClass' }));
    expect(response.status).toBe(200);
    expect(items()).toEqual([{ title: 'T', message: 'M', type: 'achievement', read: false, createdAt: expect.any(Date), actionUrl: '/insights' }]);
  });

  it('stores a safe data.url and ignores an unsafe one', async () => {
    await notify(request({ uid: 'alice', title: 'A', message: 'M', type: 'info', data: { url: '/timetable' } }));
    await notify(request({ uid: 'alice', title: 'B', message: 'M', type: 'info', data: { url: 'javascript:alert(1)' } }));
    await notify(request({ uid: 'alice', title: 'C', message: 'M', type: 'info', data: { url: 'https://evil.example/x' } }));
    const byTitle = Object.fromEntries(items().map((item) => [item.title, item]));
    expect(byTitle.A.actionUrl).toBe('/timetable');
    expect(byTitle.B).not.toHaveProperty('actionUrl');
    expect(byTitle.C).not.toHaveProperty('actionUrl');
  });

  it('does not send the degree-class email when the student turned degreeClass alerts off', async () => {
    store.docs.set('users/alice', { email: 'alice@test.example', notificationPreferences: { degreeClass: false } });
    const response = await notify(request({ uid: 'alice', type: 'email', event: 'degreeClass', data: { name: 'Alice', degreeClass: 'First Class' } }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ success: true, skipped: true });
    expect(state.sendEmail).not.toHaveBeenCalled();
  });

  it('still sends the degree-class email when the preference is on or unset', async () => {
    await notify(request({ uid: 'alice', type: 'email', event: 'degreeClass', data: { name: 'Alice', degreeClass: 'First Class' } }));
    expect(state.sendEmail).toHaveBeenCalledWith('alice@test.example', 'Your degree-class outlook has changed', '<p>class</p>');
  });
});
