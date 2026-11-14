import { beforeEach, describe, expect, it } from 'vitest';
import { CLEANUP_TARGETS, cleanupJob, deleteExpired } from '@/lib/cron/cleanup';
import { queryTestDb } from './query-test-db';

const NOW = Date.parse('2026-11-14T03:00:00Z');
const DAY = 86_400_000;
let store: ReturnType<typeof queryTestDb>;

beforeEach(() => { store = queryTestDb(); });

describe('deleteExpired', () => {
  it('deletes only documents whose field is before the cutoff and keeps the rest', async () => {
    store.docs.set('otps/old', { expiresAt: new Date(NOW - 1000) });
    store.docs.set('otps/new', { expiresAt: new Date(NOW + 1000) });
    const result = await deleteExpired(store.db, 'otps', 'expiresAt', new Date(NOW));
    expect(result).toEqual({ deleted: 1, truncated: false });
    expect([...store.docs.keys()]).toEqual(['otps/new']);
  });

  it('keeps documents that do not have the field at all', async () => {
    store.docs.set('otps/no-field', { email: 'a@test.example' });
    store.docs.set('otps/old', { expiresAt: new Date(NOW - 1) });
    await deleteExpired(store.db, 'otps', 'expiresAt', new Date(NOW));
    expect(store.docs.has('otps/no-field')).toBe(true);
    expect(store.docs.has('otps/old')).toBe(false);
  });

  it('stops at maxPages and reports truncated instead of running unbounded', async () => {
    for (let i = 0; i < 25; i += 1) store.docs.set(`otps/d${i}`, { expiresAt: new Date(NOW - 1000 - i) });
    const result = await deleteExpired(store.db, 'otps', 'expiresAt', new Date(NOW), { pageSize: 10, maxPages: 2 });
    expect(result).toEqual({ deleted: 20, truncated: true });
    expect(store.paths('otps/')).toHaveLength(5);
  });

  it('finishes a small backlog without reporting truncation', async () => {
    for (let i = 0; i < 7; i += 1) store.docs.set(`otps/d${i}`, { expiresAt: new Date(NOW - 1000) });
    const result = await deleteExpired(store.db, 'otps', 'expiresAt', new Date(NOW), { pageSize: 10, maxPages: 2 });
    expect(result).toEqual({ deleted: 7, truncated: false });
  });

  it('does nothing for an empty collection', async () => {
    expect(await deleteExpired(store.db, 'otps', 'expiresAt', new Date(NOW))).toEqual({ deleted: 0, truncated: false });
  });
});

describe('cleanupJob', () => {
  // `now` is a pretend date for expiry maths; the deadline is checked against the real clock.
  const ctx = () => ({ db: store.db, now: NOW, deadline: Date.now() + 240_000 });

  it('deletes only expired documents per target and reports the counts', async () => {
    store.docs.set('shared_transcripts/expired', { expiresAt: new Date(NOW - DAY) });
    store.docs.set('shared_transcripts/live', { expiresAt: new Date(NOW + DAY) });
    store.docs.set('otps/expired', { expiresAt: new Date(NOW - 1) });
    store.docs.set('otps/live', { expiresAt: new Date(NOW + 5 * 60_000) });
    store.docs.set('_api_rate_limits/expired', { expiresAt: new Date(NOW - 1) });
    store.docs.set('_reward_sessions/expired', { ttlAt: new Date(NOW - 1) });
    store.docs.set('_reward_sessions/live', { ttlAt: new Date(NOW + DAY) });
    // api_logs are kept for 90 days.
    store.docs.set('api_logs/old', { timestamp: new Date(NOW - 91 * DAY) });
    store.docs.set('api_logs/recent', { timestamp: new Date(NOW - 89 * DAY) });

    const result = await cleanupJob.run(ctx());

    expect(result.deleted).toEqual({ shared_transcripts: 1, otps: 1, _api_rate_limits: 1, _reward_sessions: 1, api_logs: 1 });
    expect(result.truncated).toBe(false);
    expect([...store.docs.keys()].sort()).toEqual([
      'api_logs/recent', 'otps/live', 'shared_transcripts/live', '_reward_sessions/live',
    ].sort());
  });

  it('never touches replay tombstones or the coin ledger, however old', async () => {
    const ancient = { expiresAt: new Date(NOW - 900 * DAY), ttlAt: new Date(NOW - 900 * DAY), timestamp: new Date(NOW - 900 * DAY), at: new Date(NOW - 900 * DAY) };
    store.docs.set('_reward_transactions/tx1', ancient);
    store.docs.set('_coin_requests/r1', ancient);
    store.docs.set('_coin_ledger/l1', ancient);
    store.docs.set('_coin_wallets/w1', ancient);
    store.docs.set('_admin_audit/a1', ancient);

    await cleanupJob.run(ctx());

    expect(store.docs.size).toBe(5);
    const targeted = CLEANUP_TARGETS.map((target) => target.collection);
    for (const protectedName of ['_reward_transactions', '_coin_requests', '_coin_ledger', '_coin_wallets', '_admin_audit']) {
      expect(targeted).not.toContain(protectedName);
    }
  });

  it('reports truncated when any target hit its page limit', async () => {
    for (let i = 0; i < 4_100; i += 1) store.docs.set(`otps/d${i}`, { expiresAt: new Date(NOW - 1000) });
    const result = await cleanupJob.run(ctx());
    expect(result.deleted?.otps).toBe(4_000);
    expect(result.truncated).toBe(true);
    expect(store.paths('otps/')).toHaveLength(100);
  });
});
