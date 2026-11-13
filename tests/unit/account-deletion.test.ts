import { createHash } from 'node:crypto';
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryTestDb } from './query-test-db';

const state = vi.hoisted(() => ({ db: null as any, verify: vi.fn(), deleteUser: vi.fn(), rtdbRemove: vi.fn(), log: vi.fn() }));
vi.mock('@/lib/firebase/admin', () => ({
  get adminDb() { return state.db; },
  adminAuth: { verifyIdToken: state.verify, deleteUser: state.deleteUser },
  adminRtdb: { ref: () => ({ remove: state.rtdbRemove }) },
}));
vi.mock('@/lib/api/logger', () => ({ apiTimer: () => () => 0, logApiCall: state.log }));

import { POST as deleteAccount } from '@/app/api/user/delete-account/route';
import { deleteUserData } from '@/lib/user/account-deletion';
import { cloudinaryPublicId, destroyCloudinaryAvatar } from '@/lib/cloudinary/server';

const sha = (value: string) => createHash('sha256').update(value).digest('hex');
const uid = 'alice';
const uidHash = sha(uid);
let store: ReturnType<typeof queryTestDb>;

function seedAlice() {
  store.docs.set('users/alice', { fullName: 'Alice', email: 'alice@test.example', matric: 'ABC/1', matricNormalized: 'ABC/1', avatarUrl: 'https://res.cloudinary.com/dgqukbs8n/image/upload/v1712/avatars/alice.jpg' });
  store.docs.set('users/alice/semesters/s1', { gpa: 4 });
  store.docs.set('users/alice/semesters/s1/courses/c1', { code: 'CSC 101' });
  store.docs.set('notifications/alice', { x: 1 });
  store.docs.set('notifications/alice/items/n1', { title: 'hi' });
  store.docs.set('analytics/alice', { cgpa: 4 });
  store.docs.set('shareCodes/AAA', { authorId: 'alice' });
  store.docs.set('shared_transcripts/t1', { uid: 'alice' });
  store.docs.set(`_coin_wallets/${uidHash}`, { balance: 3 });
  store.docs.set('_coin_ledger/l1', { uidHash, type: 'earn' });
  store.docs.set('_coin_ledger/l2', { uidHash, type: 'spend' });
  store.docs.set(`_coin_requests/${sha('alice:r1')}`, { uidHash, requestId: 'r1' });
  store.docs.set('_reward_sessions/s1', { uid: 'alice', status: 'consumed' });
  store.docs.set('_reward_transactions/t1', { uid: 'alice', sessionId: 's1' });
  store.docs.set(`_reward_daily/${uidHash}_2026-11-12`, { earned: 1 });
  store.docs.set(`_reward_daily/${uidHash}_2026-11-13`, { earned: 2 });
  store.docs.set('api_logs/a1', { uid: 'alice', endpoint: '/api/ai/insights' });
  store.docs.set('_api_rate_limits/alice_ai_insights_daily', { uid: 'alice', count: 1 });
  store.docs.set('_api_rate_limits/alice_user_age_hourly', { uid: 'alice', count: 1 });
  store.docs.set(`_matric_numbers/${sha('ABC/1')}`, { uid: 'alice', matric: 'ABC/1' });
  store.docs.set('_ai_feedback/f1', { uidHash, feature: 'insights' });
  store.docs.set('_academic_catalog_suggestions/x', { uid: 'alice', name: 'New Dept' });
  store.docs.set('otps/alice@test.example_reset', { code: 'hash' });
  store.docs.set('_registration_tickets/j1', { email: 'alice@test.example' });
}

function seedBob() {
  const bobHash = sha('bob');
  store.docs.set('users/bob', { fullName: 'Bob', matricNormalized: 'BOB/1' });
  store.docs.set(`_coin_wallets/${bobHash}`, { balance: 9 });
  store.docs.set('_coin_ledger/b1', { uidHash: bobHash });
  store.docs.set('_reward_sessions/b1', { uid: 'bob' });
  store.docs.set(`_reward_daily/${bobHash}_2026-11-13`, { earned: 1 });
  store.docs.set('api_logs/b1', { uid: 'bob' });
  store.docs.set('_api_rate_limits/bob_ai_insights_daily', { uid: 'bob' });
  store.docs.set(`_matric_numbers/${sha('BOB/1')}`, { uid: 'bob' });
  store.docs.set('otps/bob@test.example_reset', { code: 'hash' });
}

beforeEach(() => {
  store = queryTestDb(); state.db = store.db;
  state.verify.mockReset().mockResolvedValue({ uid, email: 'alice@test.example' });
  state.deleteUser.mockReset().mockResolvedValue(undefined);
  state.rtdbRemove.mockReset().mockResolvedValue(undefined);
  state.log.mockReset();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ result: 'ok' }))));
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('deleteUserData', () => {
  it("removes every document found by the user's uid, hash, matric or email and leaves other users alone", async () => {
    seedAlice(); seedBob();
    const report = await deleteUserData(store.db, uid, { cloudinary: async () => 'skipped' });
    const remaining = [...store.docs.keys()].sort();
    expect(remaining).toEqual([
      '_api_rate_limits/bob_ai_insights_daily',
      `_coin_ledger/b1`,
      `_coin_wallets/${sha('bob')}`,
      `_matric_numbers/${sha('BOB/1')}`,
      `_reward_daily/${sha('bob')}_2026-11-13`,
      '_reward_sessions/b1',
      'api_logs/b1',
      'otps/bob@test.example_reset',
      'users/bob',
    ].sort());
    expect(report.truncated).toEqual([]);
    expect(report.deleted).toMatchObject({ _coin_ledger: 2, _reward_daily: 2, _api_rate_limits: 2, api_logs: 1, _matric_numbers: 1 });
  });

  it('uses batched deletes rather than one write per round trip', async () => {
    seedAlice();
    for (let index = 0; index < 30; index += 1) store.docs.set(`api_logs/x${index}`, { uid });
    await deleteUserData(store.db, uid, { cloudinary: async () => 'skipped' });
    expect(store.batchCommits()).toBeGreaterThan(0);
    expect(store.writes.filter((write) => write.op === 'delete' && write.path.startsWith('api_logs/'))).toHaveLength(31);
  });

  it('bounds the work per collection and reports what was left', async () => {
    for (let index = 0; index < 12; index += 1) store.docs.set(`api_logs/x${index}`, { uid });
    const report = await deleteUserData(store.db, uid, { cloudinary: async () => 'skipped', pageSize: 5, maxPages: 2 });
    expect(report.truncated).toEqual(['api_logs']);
    expect(store.paths('api_logs')).toHaveLength(2);
  });

  it('does not delete a matric reservation that now belongs to someone else', async () => {
    store.docs.set('users/alice', { matricNormalized: 'ABC/1' });
    store.docs.set(`_matric_numbers/${sha('ABC/1')}`, { uid: 'carol' });
    await deleteUserData(store.db, uid, { cloudinary: async () => 'skipped' });
    expect(store.docs.has(`_matric_numbers/${sha('ABC/1')}`)).toBe(true);
  });

  it('asks Cloudinary to remove the avatar URL from the profile', async () => {
    seedAlice();
    const cloudinary = vi.fn().mockResolvedValue('deleted');
    const report = await deleteUserData(store.db, uid, { cloudinary });
    expect(cloudinary).toHaveBeenCalledWith('https://res.cloudinary.com/dgqukbs8n/image/upload/v1712/avatars/alice.jpg');
    expect(report.avatar).toBe('deleted');
  });
});

describe('Cloudinary avatar removal', () => {
  it('extracts the public id from delivery URLs, with or without transformations and versions', () => {
    expect(cloudinaryPublicId('https://res.cloudinary.com/dgqukbs8n/image/upload/v1712/avatars/alice.jpg', 'dgqukbs8n')).toBe('avatars/alice');
    expect(cloudinaryPublicId('https://res.cloudinary.com/dgqukbs8n/image/upload/c_fill,w_200/v99/abc.png', 'dgqukbs8n')).toBe('abc');
    expect(cloudinaryPublicId('https://res.cloudinary.com/other/image/upload/v1/abc.png', 'dgqukbs8n')).toBeNull();
    expect(cloudinaryPublicId('https://lh3.googleusercontent.com/a/photo', 'dgqukbs8n')).toBeNull();
  });

  it('skips quietly without server credentials', async () => {
    vi.stubEnv('CLOUDINARY_API_KEY', '');
    vi.stubEnv('CLOUDINARY_API_SECRET', '');
    expect(await destroyCloudinaryAvatar('https://res.cloudinary.com/dgqukbs8n/image/upload/v1/a.jpg')).toBe('skipped');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('sends a signed destroy with invalidation and never the secret itself', async () => {
    vi.stubEnv('CLOUDINARY_CLOUD_NAME', 'dgqukbs8n');
    vi.stubEnv('CLOUDINARY_API_KEY', 'key-1');
    vi.stubEnv('CLOUDINARY_API_SECRET', 'very-secret');
    expect(await destroyCloudinaryAvatar('https://res.cloudinary.com/dgqukbs8n/image/upload/v1/avatars/a.jpg')).toBe('deleted');
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe('https://api.cloudinary.com/v1_1/dgqukbs8n/image/destroy');
    const form = new URLSearchParams(String(init?.body));
    expect(form.get('public_id')).toBe('avatars/a');
    expect(form.get('invalidate')).toBe('true');
    expect(form.get('api_key')).toBe('key-1');
    const expected = createHash('sha1').update(`invalidate=true&public_id=avatars/a&timestamp=${form.get('timestamp')}very-secret`).digest('hex');
    expect(form.get('signature')).toBe(expected);
    expect(String(init?.body)).not.toContain('very-secret');
  });

  it('reports a failure without throwing', async () => {
    vi.stubEnv('CLOUDINARY_CLOUD_NAME', 'dgqukbs8n');
    vi.stubEnv('CLOUDINARY_API_KEY', 'key-1');
    vi.stubEnv('CLOUDINARY_API_SECRET', 'very-secret');
    vi.mocked(fetch).mockRejectedValueOnce(new Error('network'));
    expect(await destroyCloudinaryAvatar('https://res.cloudinary.com/dgqukbs8n/image/upload/v1/a.jpg')).toBe('failed');
  });
});

describe('POST /api/user/delete-account', () => {
  it('wipes the data, the RTDB counter and the Auth user, and logs without the uid', async () => {
    seedAlice();
    const response = await deleteAccount(new NextRequest('https://app.test/api/user/delete-account', { method: 'POST', headers: { Authorization: 'Bearer fresh' } }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
    expect(state.verify).toHaveBeenCalledWith('fresh', true);
    expect(state.deleteUser).toHaveBeenCalledWith('alice');
    expect(state.rtdbRemove).toHaveBeenCalled();
    expect(store.paths('users/alice')).toEqual([]);
    expect(store.paths('_coin')).toEqual([]);
    expect(state.log).toHaveBeenCalledWith(expect.objectContaining({ endpoint: '/api/user/delete-account', status: 200, uid: null }));
  });

  it('requires a bearer token', async () => {
    const response = await deleteAccount(new NextRequest('https://app.test/api/user/delete-account', { method: 'POST' }));
    expect(response.status).toBe(401);
  });
});
