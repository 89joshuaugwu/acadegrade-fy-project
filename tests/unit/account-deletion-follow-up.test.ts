import { createHash } from 'node:crypto';
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { queryTestDb } from './query-test-db';

const state = vi.hoisted(() => ({ db: null as any, verify: vi.fn(), deleteUser: vi.fn(), rtdbRemove: vi.fn() }));
vi.mock('@/lib/firebase/admin', () => ({
  get adminDb() { return state.db; },
  adminAuth: { verifyIdToken: state.verify, deleteUser: state.deleteUser },
  adminRtdb: { ref: () => ({ remove: state.rtdbRemove }) },
}));
vi.mock('@/lib/api/logger', () => ({ apiTimer: () => () => 0, logApiCall: vi.fn() }));

import { POST as deleteAccount } from '@/app/api/user/delete-account/route';
import {
  DELETION_PROMISE_MS, DELETION_QUEUE_COLLECTION, deleteUserData, queueAccountDeletion, settleAccountDeletion,
} from '@/lib/user/account-deletion';
import { createAccountDeletionFollowUpJob } from '@/lib/cron/account-deletion';
import { DAILY_JOBS } from '@/lib/cron/registry';

const sha = (value: string) => createHash('sha256').update(value).digest('hex');
const queuePath = (uid: string) => `${DELETION_QUEUE_COLLECTION}/${sha(uid)}`;
const NOW = new Date('2026-11-17T03:00:00Z');
let store: ReturnType<typeof queryTestDb>;

function seed(uid = 'alice', logs = 0) {
  store.docs.set(`users/${uid}`, { email: `${uid}@test.example`, matricNormalized: `${uid.toUpperCase()}/1`, avatarUrl: '' });
  store.docs.set(`users/${uid}/semesters/s1`, { gpa: 4 });
  store.docs.set(`users/${uid}/timetables/t1`, { title: 'Lectures' });
  store.docs.set(`support_tickets/${uid}-1`, { uid, message: 'help' });
  store.docs.set(`_ai_feedback/${uid}-1`, { uidHash: sha(uid) });
  store.docs.set(`_academic_catalog_suggestions/${uid}-1`, { uid, name: 'New Dept' });
  store.docs.set(`otps/${uid}@test.example_reset`, { code: '1' });
  for (let index = 0; index < logs; index += 1) store.docs.set(`api_logs/${uid}-${index}`, { uid });
}

beforeEach(() => {
  store = queryTestDb();
  state.db = store.db;
  state.verify.mockReset().mockResolvedValue({ uid: 'alice' });
  state.deleteUser.mockReset().mockResolvedValue(undefined);
  state.rtdbRemove.mockReset().mockResolvedValue(undefined);
});

describe('deleteUserData: the full list (account-deletion.md §5.2, items 8-11)', () => {
  it('deletes timetables, support requests, AI-answer reports and catalogue suggestions', async () => {
    seed('alice'); seed('bob');
    await deleteUserData(store.db, 'alice', { cloudinary: async () => 'skipped' });
    expect(store.paths('users/alice')).toEqual([]);
    expect(store.paths('support_tickets/')).toEqual(['support_tickets/bob-1']);
    expect(store.paths('_ai_feedback/')).toEqual(['_ai_feedback/bob-1']);
    expect(store.paths('_academic_catalog_suggestions/')).toEqual(['_academic_catalog_suggestions/bob-1']);
    expect(store.paths('users/bob/timetables/')).toEqual(['users/bob/timetables/t1']);
  });

  it('uses the saved identity when the profile is already gone (a follow-up run)', async () => {
    store.docs.set(`_matric_numbers/${sha('ALICE/1')}`, { uid: 'alice' });
    store.docs.set('otps/alice@test.example_reset', { code: '1' });
    await deleteUserData(store.db, 'alice', { cloudinary: async () => 'skipped', identity: { email: 'alice@test.example', matric: 'ALICE/1' } });
    expect(store.paths('_matric_numbers/')).toEqual([]);
    expect(store.paths('otps/')).toEqual([]);
  });
});

describe('queue and settle', () => {
  it('queues the work before deleting, with the 21-day date, and clears it when nothing is left', async () => {
    seed('alice');
    const identity = await queueAccountDeletion(store.db, 'alice', 'self', NOW);
    expect(identity).toEqual({ email: 'alice@test.example', matric: 'ALICE/1', avatarUrl: null });
    const queued = store.docs.get(queuePath('alice'));
    expect(queued).toMatchObject({ uid: 'alice', email: 'alice@test.example', source: 'self', status: 'running', attempts: 0 });
    expect(queued.dueBy.getTime() - queued.requestedAt.getTime()).toBe(DELETION_PROMISE_MS);
    expect(queued.nextAttemptAt.getTime()).toBeGreaterThan(NOW.getTime());

    const report = await deleteUserData(store.db, 'alice', { cloudinary: async () => 'skipped', identity });
    expect(await settleAccountDeletion(store.db, 'alice', report, NOW)).toBe('complete');
    expect(store.docs.has(queuePath('alice'))).toBe(false);
  });

  it('keeps the original request date when queued again', async () => {
    seed('alice');
    await queueAccountDeletion(store.db, 'alice', 'self', NOW);
    await queueAccountDeletion(store.db, 'alice', 'admin', new Date(NOW.getTime() + 86_400_000));
    expect(store.docs.get(queuePath('alice')).requestedAt).toEqual(NOW);
  });

  it('marks truncated work pending for the next daily run', async () => {
    seed('alice', 12);
    const identity = await queueAccountDeletion(store.db, 'alice', 'self', NOW);
    const report = await deleteUserData(store.db, 'alice', { cloudinary: async () => 'skipped', identity, pageSize: 5, maxPages: 1 });
    expect(report.truncated).toContain('api_logs');
    expect(await settleAccountDeletion(store.db, 'alice', report, NOW)).toBe('pending');
    expect(store.docs.get(queuePath('alice'))).toMatchObject({ status: 'pending', truncated: ['api_logs'], nextAttemptAt: NOW });
  });
});

describe('POST /api/user/delete-account with the follow-up', () => {
  const call = () => deleteAccount(new NextRequest('https://app.test/api/user/delete-account', { method: 'POST', headers: { Authorization: 'Bearer fresh' } }));

  it('leaves no queue entry when everything was deleted', async () => {
    seed('alice');
    expect((await call()).status).toBe(200);
    expect(store.paths(`${DELETION_QUEUE_COLLECTION}/`)).toEqual([]);
    expect(state.deleteUser).toHaveBeenCalledWith('alice');
  });

  it('leaves a queue entry for the daily job when the deletion fails part-way, and says so', async () => {
    seed('alice');
    state.deleteUser.mockRejectedValueOnce(new Error('auth backend down'));
    const response = await call();
    expect(response.status).toBe(500);
    expect((await response.json()).error).toMatch(/within 21 days/);
    expect(store.docs.get(queuePath('alice'))).toMatchObject({ uid: 'alice', source: 'self' });
  });
});

describe('daily follow-up job', () => {
  const ctx = (now = NOW) => ({ db: store.db, now: now.getTime(), deadline: Date.now() + 240_000 });
  const deps = () => ({
    deleteAuthUser: vi.fn().mockResolvedValue(undefined),
    removeUnreadCounter: vi.fn().mockResolvedValue(undefined),
    cloudinary: vi.fn().mockResolvedValue('deleted' as const),
  });

  it('is registered in the daily jobs', () => {
    expect(DAILY_JOBS.map((job) => job.id)).toContain('accountDeletionFollowUp');
  });

  it('finishes a pending deletion, deletes the Auth user, clears the entry and audits without the uid', async () => {
    seed('alice', 12);
    const identity = await queueAccountDeletion(store.db, 'alice', 'self', NOW);
    const first = await deleteUserData(store.db, 'alice', { cloudinary: async () => 'skipped', identity, pageSize: 5, maxPages: 1 });
    await settleAccountDeletion(store.db, 'alice', first, new Date(NOW.getTime() - 1000));

    const d = deps();
    const result = await createAccountDeletionFollowUpJob(d).run(ctx());
    expect(store.paths('api_logs/')).toEqual([]);
    expect(store.docs.has(queuePath('alice'))).toBe(false);
    expect(d.deleteAuthUser).toHaveBeenCalledWith('alice');
    expect(d.removeUnreadCounter).toHaveBeenCalledWith('alice');
    expect(result).toMatchObject({ written: 1 });
    const audits = store.paths('_admin_audit/').map((path) => store.docs.get(path));
    expect(audits).toHaveLength(1);
    expect(audits[0]).toMatchObject({ action: 'account-deletion.follow-up', target: `${DELETION_QUEUE_COLLECTION}/${sha('alice')}` });
    expect(JSON.stringify(audits[0])).not.toContain('alice@');
    expect(JSON.stringify(audits[0])).not.toContain('"alice"');
  });

  it('finishes a deletion whose request crashed before it settled (status running, past the grace hour)', async () => {
    seed('alice');
    await queueAccountDeletion(store.db, 'alice', 'self', new Date(NOW.getTime() - 2 * 3_600_000));
    const d = deps();
    await createAccountDeletionFollowUpJob(d).run(ctx());
    expect(store.paths('users/alice')).toEqual([]);
    expect(store.paths('otps/')).toEqual([]);
    expect(d.deleteAuthUser).toHaveBeenCalledWith('alice');
    expect(store.docs.has(queuePath('alice'))).toBe(false);
  });

  it('leaves a request that is still inside its grace hour alone', async () => {
    seed('alice');
    await queueAccountDeletion(store.db, 'alice', 'self', new Date(NOW.getTime() - 60_000));
    const d = deps();
    await createAccountDeletionFollowUpJob(d).run(ctx());
    expect(store.docs.has('users/alice')).toBe(true);
    expect(d.deleteAuthUser).not.toHaveBeenCalled();
  });

  it('is idempotent: an Auth user that is already gone still completes', async () => {
    store.docs.set(queuePath('alice'), {
      uid: 'alice', email: null, matric: null, avatarUrl: null, source: 'self', status: 'pending', attempts: 1,
      requestedAt: NOW, dueBy: new Date(NOW.getTime() + DELETION_PROMISE_MS), nextAttemptAt: NOW, truncated: ['api_logs'],
    });
    const d = deps();
    d.deleteAuthUser.mockRejectedValueOnce(Object.assign(new Error('gone'), { code: 'auth/user-not-found' }));
    await createAccountDeletionFollowUpJob(d).run(ctx());
    expect(store.docs.has(queuePath('alice'))).toBe(false);
  });

  it('keeps the entry, counts the attempt and records the error when a run fails', async () => {
    store.docs.set(queuePath('alice'), {
      uid: 'alice', email: null, matric: null, avatarUrl: null, source: 'self', status: 'pending', attempts: 1,
      requestedAt: NOW, dueBy: new Date(NOW.getTime() + DELETION_PROMISE_MS), nextAttemptAt: NOW, truncated: [],
    });
    const d = deps();
    d.deleteAuthUser.mockRejectedValueOnce(Object.assign(new Error('backend down'), { code: 'auth/internal-error' }));
    const result = await createAccountDeletionFollowUpJob(d).run(ctx());
    expect(store.docs.get(queuePath('alice'))).toMatchObject({ attempts: 2, status: 'pending', lastError: 'auth/internal-error' });
    expect(result.note).toMatch(/1 failed/);
  });

  it('retries the avatar removal from the saved URL', async () => {
    store.docs.set(queuePath('alice'), {
      uid: 'alice', email: null, matric: null, avatarUrl: 'https://res.cloudinary.com/x/image/upload/v1/a.jpg', source: 'self',
      status: 'pending', attempts: 1, requestedAt: NOW, dueBy: new Date(NOW.getTime() + DELETION_PROMISE_MS), nextAttemptAt: NOW, truncated: [],
    });
    const d = deps();
    await createAccountDeletionFollowUpJob(d).run(ctx());
    expect(d.cloudinary).toHaveBeenCalledWith('https://res.cloudinary.com/x/image/upload/v1/a.jpg');
    expect(store.docs.has(queuePath('alice'))).toBe(false);
  });

  it('notes entries past the 21-day promise', async () => {
    store.docs.set(queuePath('alice'), {
      uid: 'alice', email: null, matric: null, avatarUrl: null, source: 'self', status: 'pending', attempts: 9,
      requestedAt: new Date(NOW.getTime() - 30 * 86_400_000), dueBy: new Date(NOW.getTime() - 9 * 86_400_000), nextAttemptAt: NOW, truncated: [],
    });
    const d = deps();
    d.deleteAuthUser.mockRejectedValue(Object.assign(new Error('backend down'), { code: 'auth/internal-error' }));
    const result = await createAccountDeletionFollowUpJob(d).run(ctx());
    expect(result.note).toMatch(/1 past the 21-day date/);
  });
});
