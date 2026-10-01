import { beforeEach, describe, expect, it } from 'vitest';
import { RewardService } from '@/lib/ads/reward/service';
import { rewardTestDb } from './reward-test-db';

let store: ReturnType<typeof rewardTestDb>;
let service: RewardService;
let now: number;
const config = { version: 1, enabled: true, rewardedEnabled: true, testMode: true, rewardedUnitId: '', bannerUnitId: '', placements: { dashboard: false, results: false } };
async function session(uid = 'alice') { return service.createSession(uid, 'android'); }
function callback(s: { sessionId: string; unitId: string; userId: string }, transactionId = 'tx1') {
  return { adUnit: s.unitId.split('/')[1], customData: s.sessionId, userId: s.userId, rewardAmount: 10, rewardItem: 'coins', timestamp: now, transactionId };
}
async function earned() { const s = await session(); await service.grant(callback(s)); return s; }
describe('server rewarded refresh entitlement', () => {
  beforeEach(() => {
    store = rewardTestDb(); now = Date.UTC(2026, 9, 1, 12);
    store.docs.set('config/mobileAds', { ...config });
    service = new RewardService(store.db, () => now);
  });
  it('creates Android-only sessions and fails closed on either disabled switch', async () => {
    expect(await session()).toMatchObject({ unitId: 'ca-app-pub-3940256099942544/5224354917', userId: 'alice' });
    await expect(service.createSession('alice', 'ios')).rejects.toThrow();
    for (const change of [{ enabled: false }, { rewardedEnabled: false }, { rewardedEnabled: undefined }]) {
      store.docs.set('config/mobileAds', { ...config, ...change });
      await expect(session()).rejects.toThrow();
    }
  });
  it('binds UID, custom data, unit, reward and timestamp to the session', async () => {
    const s = await session();
    for (const change of [{ userId: 'bob' }, { customData: '0'.repeat(64) }, { adUnit: '1111111111' }, { rewardAmount: 99 }, { rewardItem: 'cash' }, { timestamp: now - 3600000 }]) {
      await expect(service.grant({ ...callback(s), ...change })).rejects.toThrow();
    }
    expect(await service.status('alice', s.sessionId)).toMatchObject({ status: 'pending' });
    await expect(service.status('bob', s.sessionId)).rejects.toThrow();
    await service.grant(callback(s));
    expect(await service.status('alice', s.sessionId)).toMatchObject({ status: 'earned' });
  });
  it('accepts full ad unit IDs but rejects test rewards for live sessions', async () => {
    store.docs.set('config/mobileAds', { ...config, testMode: false, rewardedUnitId: 'ca-app-pub-1111111111111111/1234567890' });
    const s = await session();
    await expect(service.grant(callback(s))).rejects.toThrow();
    await service.grant({ ...callback(s), adUnit: s.unitId, rewardAmount: 1, rewardItem: 'Insights refresh' });
    expect((await service.status('alice', s.sessionId)).status).toBe('earned');
  });
  it('does not grant AdMob validation-only requests with no session binding', async () => {
    expect(await service.grant({ ...callback(await session()), userId: undefined, customData: undefined })).toEqual({ granted: false, validationOnly: true });
    expect([...store.docs.keys()].filter(key => key.startsWith('_reward_transactions/'))).toHaveLength(0);
  });
  it('deduplicates transactions and never re-grants a replayed session', async () => {
    const s = await session(); const other = await session();
    expect(await service.grant(callback(s))).toEqual({ granted: true, duplicate: false });
    expect(await service.grant(callback(s))).toEqual({ granted: false, duplicate: true });
    await expect(service.grant(callback(other))).rejects.toThrow();
    await expect(service.grant(callback(s, 'different'))).rejects.toThrow();
  });
  it('limits earned rewards to two daily and session creation to six hourly', async () => {
    for (let i = 0; i < 2; i++) await service.grant(callback(await session(), `tx${i}`));
    await expect(session()).rejects.toThrow();
    for (let i = 0; i < 6; i++) await session('bob');
    await expect(session('bob')).rejects.toThrow();
  });
  it('leases atomically, releases failure, and consumes together with saved insight', async () => {
    const s = await earned();
    const results = await Promise.allSettled([service.acquire('alice', s.sessionId), service.acquire('alice', s.sessionId)]);
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    const lease = (results.find(r => r.status === 'fulfilled') as PromiseFulfilledResult<any>).value;
    expect((await service.status('alice', s.sessionId)).status).toBe('processing');
    await service.release(lease);
    expect((await service.status('alice', s.sessionId)).status).toBe('earned');
    const retry = await service.acquire('alice', s.sessionId);
    await service.complete(retry, { lastInsight: { data: { degreeOutlook: 'new' } }, insightsStale: false });
    expect(store.docs.get('analytics/alice').lastInsight.data.degreeOutlook).toBe('new');
    expect((await service.status('alice', s.sessionId)).status).toBe('consumed');
    await expect(service.acquire('alice', s.sessionId)).rejects.toThrow();
  });
  it('fences expired leases against late completion or release', async () => {
    const s = await earned(); const old = await service.acquire('alice', s.sessionId);
    now += 6 * 60000;
    expect((await service.status('alice', s.sessionId)).status).toBe('earned');
    const fresh = await service.acquire('alice', s.sessionId);
    await service.release(old);
    await expect(service.complete(old, { lastInsight: { data: 'wrong' } })).rejects.toThrow();
    expect(store.docs.has('analytics/alice')).toBe(false);
    await service.complete(fresh, { lastInsight: { data: 'correct' } });
    expect(store.docs.get('analytics/alice').lastInsight.data).toBe('correct');
  });
  it('bounds failed generation retries without consuming the earned credit', async () => {
    const s = await earned();
    for (let i = 0; i < 6; i++) await service.release(await service.acquire('alice', s.sessionId));
    await expect(service.acquire('alice', s.sessionId)).rejects.toThrow('retry limit');
    expect((await service.status('alice', s.sessionId)).status).toBe('earned');
    now += 3600000;
    for (let i = 0; i < 6; i++) await service.release(await service.acquire('alice', s.sessionId));
    now += 3600000;
    await expect(service.acquire('alice', s.sessionId)).rejects.toThrow('retry limit');
    expect((await service.status('alice', s.sessionId)).status).toBe('earned');
  });
  it('rejects expired callbacks and disabled entitlement use', async () => {
    const s = await session(); now += 31 * 60000;
    await expect(service.grant(callback(s))).rejects.toThrow();
    expect((await service.status('alice', s.sessionId)).status).toBe('expired');
    const ready = await earned(); store.docs.set('config/mobileAds', { ...config, rewardedEnabled: false });
    await expect(service.acquire('alice', ready.sessionId)).rejects.toThrow();
  });
  it('cancels only pending sessions and preserves a credit when SSV wins the race', async () => {
    const cancelled = await session();
    await expect(service.cancel('bob', cancelled.sessionId)).rejects.toThrow();
    expect((await service.cancel('alice', cancelled.sessionId)).status).toBe('expired');
    await expect(service.grant(callback(cancelled))).rejects.toThrow();
    const s = await earned();
    expect((await service.cancel('alice', s.sessionId)).status).toBe('earned');
    const lease = await service.acquire('alice', s.sessionId);
    expect((await service.cancel('alice', s.sessionId)).status).toBe('processing');
    await service.complete(lease, {});
    expect((await service.cancel('alice', s.sessionId)).status).toBe('consumed');
  });
  it('enforces an independent daily use ceiling for credits carried from yesterday', async () => {
    const yesterday = [await session(), await session()];
    for (let i = 0; i < 2; i++) await service.grant(callback(yesterday[i], `yesterday${i}`));
    now += 12 * 3600000;
    const today = await session(); await service.grant(callback(today, 'today'));
    for (const s of yesterday) await service.complete(await service.acquire('alice', s.sessionId), {});
    await expect(service.acquire('alice', today.sessionId)).rejects.toThrow('Daily');
    expect((await service.status('alice', today.sessionId)).status).toBe('earned');
  });
  it('enforces the grant ceiling even with several sessions created before callbacks arrive', async () => {
    const sessions = [await session(), await session(), await session()];
    const results = await Promise.allSettled(sessions.map((s, i) => service.grant(callback(s, `race${i}`))));
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(2);
    expect([...store.docs.keys()].filter(key => key.startsWith('_reward_transactions/'))).toHaveLength(2);
    expect((await service.status('alice', sessions[2].sessionId)).status).toBe('pending');
  });
  it('deduplicates simultaneous callbacks and does not reset the earned credit', async () => {
    const s = await session();
    const results = await Promise.all([service.grant(callback(s)), service.grant(callback(s))]);
    expect(results).toEqual([{ granted: true, duplicate: false }, { granted: false, duplicate: true }]);
    expect((await service.status('alice', s.sessionId)).status).toBe('earned');
  });
  it('serializes grant/cancel races in either commit order', async () => {
    const first = await session();
    await Promise.allSettled([service.cancel('alice', first.sessionId), service.grant(callback(first))]);
    expect((await service.status('alice', first.sessionId)).status).toBe('expired');
    const second = await session();
    await Promise.all([service.grant(callback(second)), service.cancel('alice', second.sessionId)]);
    expect((await service.status('alice', second.sessionId)).status).toBe('earned');
  });
  it('expires unused earned credits and limits session creation across hourly resets', async () => {
    const s = await earned(); now += 24 * 3600000;
    expect((await service.status('alice', s.sessionId)).status).toBe('expired');
    await expect(service.acquire('alice', s.sessionId)).rejects.toThrow();
    for (let i = 0; i < 6; i++) await session('bob');
    now += 3600000;
    for (let i = 0; i < 6; i++) await session('bob');
    now += 3600000;
    await expect(session('bob')).rejects.toThrow('creation limit');
  });
});
