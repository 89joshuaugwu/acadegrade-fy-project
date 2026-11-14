import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { queryTestDb } from './query-test-db';

const state = vi.hoisted(() => ({
  db: null as any,
  requireAdmin: vi.fn(),
  audit: vi.fn(),
  revoke: vi.fn(),
  deleteUser: vi.fn(),
  rtdbRemove: vi.fn(),
  usage: vi.fn(),
}));

vi.mock('@/lib/firebase/admin', () => ({
  get adminDb() { return state.db; },
  adminAuth: { revokeRefreshTokens: state.revoke, deleteUser: state.deleteUser, verifyIdToken: vi.fn() },
  adminRtdb: { ref: () => ({ remove: state.rtdbRemove }) },
  adminMessaging: { subscribeToTopic: vi.fn(), unsubscribeFromTopic: vi.fn(async () => ({})) },
}));
vi.mock('@/lib/api/admin-audit', () => ({ writeAdminAudit: state.audit }));
vi.mock('@/lib/api/admin-auth', () => ({
  requireAdmin: state.requireAdmin,
  AdminAuthorizationError: class AdminAuthorizationError extends Error {
    constructor(public status: 401 | 403) { super(status === 401 ? 'Unauthorized' : 'Forbidden'); }
  },
}));
vi.mock('@/lib/usage/server', () => ({ getUsageSummary: state.usage }));
vi.mock('@/lib/cloudinary/server', () => ({ destroyCloudinaryAvatar: vi.fn(async () => 'skipped') }));

import { GET } from '@/app/api/admin/users/[uid]/route';
import { POST } from '@/app/api/admin/users/route';
import { invalidatePlatformSettingsCache } from '@/lib/platform/settings-server';

const sha = (value: string) => createHash('sha256').update(value).digest('hex');
const ADMIN = { uid: 'admin-1', email: 'admin@test.example' };
let store: ReturnType<typeof queryTestDb>;

const detail = (uid: string) => GET(new Request(`https://app.test/api/admin/users/${uid}`), { params: Promise.resolve({ uid }) });
const post = (body: unknown) => POST(new Request('https://app.test/api/admin/users', {
  method: 'POST', headers: { Authorization: 'Bearer t', 'Content-Type': 'application/json' }, body: JSON.stringify(body),
}));
const ADULT = { ageStatus: 'adult', consents: { ai: { granted: true } } };

beforeEach(() => {
  store = queryTestDb();
  state.db = store.db;
  invalidatePlatformSettingsCache();
  state.requireAdmin.mockReset().mockResolvedValue(ADMIN);
  state.audit.mockReset().mockResolvedValue(undefined);
  state.revoke.mockReset().mockResolvedValue(undefined);
  state.deleteUser.mockReset().mockResolvedValue(undefined);
  state.rtdbRemove.mockReset().mockResolvedValue(undefined);
  state.usage.mockReset().mockResolvedValue({ features: [{ id: 'insights', usedToday: 1 }] });
  store.docs.set('users/stu', {
    fullName: 'Ada Student', email: 'ada@test.example', matric: 'CSC/1', university: 'Uni', department: 'CSC', programme: 'BSc',
    currentLevel: 300, createdAt: new Date('2026-01-01T00:00:00Z'), lastActiveAt: new Date('2026-11-13T00:00:00Z'),
    fcmTokens: ['tok-a', 'tok-b'], ...ADULT, consents: { ai: { granted: true }, marketing: { granted: false } },
  });
  store.docs.set('users/stu/semesters/s1', { label: '100L First', gpa: 4.2, pi: 4, creditLoaded: 20, isComplete: true });
  store.docs.set('users/stu/semesters/s2', { label: '100L Second', gpa: 3.8, pi: 3.5, creditLoaded: 20, isComplete: false });
});

describe('GET /api/admin/users/[uid]', () => {
  it('detail hides grades', async () => {
    store.docs.set(`_coin_ledger/l1`, { uidHash: sha('stu'), type: 'earn', amount: 2, balanceAfter: 2, at: 1000, sessionId: 'secret-session' });
    store.docs.set(`_coin_ledger/l2`, { uidHash: sha('stu'), type: 'spend', amount: 1, balanceAfter: 1, at: 2000, feature: 'insights', requestId: 'r' });
    store.docs.set(`_coin_ledger/other`, { uidHash: sha('someone'), type: 'earn', amount: 9, balanceAfter: 9, at: 3000 });
    store.docs.set(`_coin_wallets/${sha('stu')}`, { balance: 1, day: new Date().toISOString().slice(0, 10), earnedToday: 2 });

    const response = await detail('stu');
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.profile).toMatchObject({
      uid: 'stu', fullName: 'Ada Student', email: 'ada@test.example', matric: 'CSC/1', currentLevel: 300,
      createdAt: '2026-01-01T00:00:00.000Z', lastActiveAt: '2026-11-13T00:00:00.000Z', disabled: false,
      ageStatus: 'adult', aiConsent: true, marketingConsent: false,
    });
    expect(body.academic).toEqual({ semesterCount: 2, completedCount: 1 });
    expect(body.devices).toEqual({ count: 2 });
    expect(body.usage).toEqual({ features: [{ id: 'insights', usedToday: 1 }] });
    expect(body.coins.balance).toBe(1);
    expect(body.coins.earnedToday).toBe(2);
    expect(body.coins.ledger).toEqual([
      { type: 'spend', amount: 1, feature: 'insights', at: new Date(2000).toISOString(), balanceAfter: 1 },
      { type: 'earn', amount: 2, at: new Date(1000).toISOString(), balanceAfter: 2 },
    ]);
    const text = JSON.stringify(body);
    for (const hidden of ['4.2', '3.8', 'gpa', 'cgpa', 'tok-a', 'secret-session']) expect(text).not.toContain(hidden);
    expect(state.audit).not.toHaveBeenCalled();
  });

  it('404 for an unknown account', async () => {
    expect((await detail('nobody')).status).toBe(404);
  });
});

describe('POST /api/admin/users actions', () => {
  it('reveal requires a reason and audits', async () => {
    for (const reason of [undefined, '', 'shrt', 'x'.repeat(301)]) {
      expect((await post({ action: 'reveal-grades', uid: 'stu', reason })).status).toBe(400);
    }
    expect(state.audit).not.toHaveBeenCalled();

    const response = await post({ action: 'reveal-grades', uid: 'stu', reason: 'Student asked support to check their CGPA' });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.semesters).toEqual(expect.arrayContaining([
      { label: '100L First', gpa: 4.2, creditLoaded: 20, isComplete: true },
      { label: '100L Second', gpa: 3.8, creditLoaded: 20, isComplete: false },
    ]));
    expect(body.cgpa).toBeCloseTo(4, 6);
    expect(state.audit).toHaveBeenCalledWith(expect.objectContaining({
      action: 'users.reveal-grades', target: 'users/stu', actorEmail: ADMIN.email,
      summary: expect.stringContaining('Student asked support to check their CGPA'),
    }));
    // The grades themselves are not copied into the audit log.
    expect(JSON.stringify(state.audit.mock.calls)).not.toContain('4.2');
  });

  it('grant enforces per-grant, monthly and balance caps, refuses minors, writes a grant ledger entry', async () => {
    store.docs.set('config/usage', { coins: { enabled: true, balanceCap: 30 } });
    expect((await post({ action: 'grant-coins', uid: 'stu', amount: 3, reason: 'no' })).status).toBe(400);
    expect((await post({ action: 'grant-coins', uid: 'stu', amount: 11, reason: 'Outage on 12 Nov' })).status).toBe(400);
    expect((await post({ action: 'grant-coins', uid: 'stu', amount: 0, reason: 'Outage on 12 Nov' })).status).toBe(400);

    const ok = await post({ action: 'grant-coins', uid: 'stu', amount: 5, reason: 'Outage on 12 Nov' });
    expect(ok.status).toBe(200);
    expect(await ok.json()).toMatchObject({ granted: 5, balance: 5 });
    const ledger = store.paths('_coin_ledger/').map((path) => store.docs.get(path));
    expect(ledger).toEqual([expect.objectContaining({ uidHash: sha('stu'), type: 'grant', amount: 5, actorEmail: ADMIN.email })]);
    expect(state.audit).toHaveBeenCalledWith(expect.objectContaining({ action: 'users.grant-coins', target: 'users/stu', after: { amount: 5, balance: 5 } }));

    store.docs.set(`_coin_wallets/${sha('stu')}`, { ...store.docs.get(`_coin_wallets/${sha('stu')}`), balance: 28 });
    const full = await post({ action: 'grant-coins', uid: 'stu', amount: 5, reason: 'Outage on 12 Nov' });
    expect(full.status).toBe(409);
    expect((await full.json()).code).toBe('BALANCE_CAP');

    const month = new Date().toISOString().slice(0, 7);
    store.docs.set(`_admin_grants/${sha(ADMIN.email)}_${month}`, { total: 99 });
    const capped = await post({ action: 'grant-coins', uid: 'stu', amount: 2, reason: 'Outage on 12 Nov' });
    expect(capped.status).toBe(409);
    expect((await capped.json()).code).toBe('CAP_REACHED');

    store.docs.set('users/kid', { email: 'kid@test.example', ageStatus: 'minor' });
    const minor = await post({ action: 'grant-coins', uid: 'kid', amount: 1, reason: 'Outage on 12 Nov' });
    expect(minor.status).toBe(403);
    expect((await minor.json()).code).toBe('AI_NOT_ALLOWED');
    expect(store.docs.has(`_coin_wallets/${sha('kid')}`)).toBe(false);
  });

  it('sign-out-all revokes sessions and clears push tokens', async () => {
    const response = await post({ action: 'sign-out-all', uid: 'stu' });
    expect(response.status).toBe(200);
    expect(state.revoke).toHaveBeenCalledWith('stu');
    expect(store.docs.get('users/stu').fcmTokens).toEqual([]);
    expect(state.audit).toHaveBeenCalledWith(expect.objectContaining({ action: 'users.sign-out-all', target: 'users/stu', before: { devices: 2 } }));
  });

  it('delete requires a matching email', async () => {
    for (const confirmEmail of [undefined, '', 'someone@test.example']) {
      expect((await post({ action: 'delete-account', uid: 'stu', confirmEmail })).status).toBe(400);
    }
    expect(store.docs.has('users/stu')).toBe(true);
    expect(state.deleteUser).not.toHaveBeenCalled();

    const response = await post({ action: 'delete-account', uid: 'stu', confirmEmail: '  ADA@test.example ' });
    expect(response.status).toBe(200);
    expect(store.docs.has('users/stu')).toBe(false);
    expect(store.paths('users/stu/')).toEqual([]);
    expect(state.rtdbRemove).toHaveBeenCalled();
    expect(state.deleteUser).toHaveBeenCalledWith('stu');
    expect(state.audit).toHaveBeenCalledWith(expect.objectContaining({ action: 'users.delete-account', target: 'users/stu' }));
  });
});
