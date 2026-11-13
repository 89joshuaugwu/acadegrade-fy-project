import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { RewardService } from '@/lib/ads/reward/service';
import { CoinWallet } from '@/lib/ads/reward/coins';
import { rewardTestDb } from './reward-test-db';

let store: ReturnType<typeof rewardTestDb>;
let rewards: RewardService;
let wallet: CoinWallet;
let now: number;
const config = { version: 1, enabled: true, rewardedEnabled: true, testMode: true, rewardedUnitId: '', bannerUnitId: '', placements: { dashboard: false, results: false } };
const sha = (value: string) => createHash('sha256').update(value).digest('hex');
const rid = (n: number) => n.toString(16).padStart(32, '0');
const walletDoc = (uid = 'alice') => store.docs.get(`_coin_wallets/${sha(uid)}`);
const ledger = () => [...store.docs.entries()].filter(([key]) => key.startsWith('_coin_ledger/')).map(([, value]) => value).sort((a, b) => a.at - b.at);
const coinDocs = () => [...store.docs.entries()].filter(([key]) => /^(_coin|_reward|analytics)/.test(key));
function coins(change: Record<string, unknown> = {}) { store.docs.set('config/usage', { coins: { enabled: true, ...change } }); }
function callback(s: { sessionId: string; unitId: string; userId: string }, transactionId: string) {
  return { adUnit: s.unitId.split('/')[1], customData: s.sessionId, userId: s.userId, rewardAmount: 10, rewardItem: 'coins', timestamp: now, transactionId };
}
let txCounter = 0;
async function earn(uid = 'alice') {
  const s = await rewards.createSession(uid, 'android', 'coins');
  return { session: s, grant: await rewards.grant(callback(s, `earn-${++txCounter}`)) };
}

beforeEach(() => {
  store = rewardTestDb(); now = Date.UTC(2026, 9, 1, 12);
  store.docs.set('config/mobileAds', { ...config });
  rewards = new RewardService(store.db, () => now);
  wallet = new CoinWallet(store.db, () => now);
});

describe('coin earning through verified rewarded sessions', () => {
  it('keeps coins off by default and also requires the Android rewarded switch', async () => {
    await expect(rewards.createSession('alice', 'android', 'coins')).rejects.toMatchObject({ status: 403 });
    coins();
    store.docs.set('config/mobileAds', { ...config, rewardedEnabled: false });
    await expect(rewards.createSession('alice', 'android', 'coins')).rejects.toMatchObject({ status: 403 });
    await expect(rewards.createSession('alice', 'android', 'gems')).rejects.toMatchObject({ status: 400 });
    expect([...store.docs.keys()].filter(key => key.startsWith('_reward_sessions/'))).toHaveLength(0);
  });

  it('creates a coin session bound to user and unit, then credits coins only from the signed callback', async () => {
    coins();
    const s = await rewards.createSession('alice', 'android', 'coins');
    expect(s).toEqual({ sessionId: expect.stringMatching(/^[a-f0-9]{64}$/), unitId: 'ca-app-pub-3940256099942544/5224354917', userId: 'alice', expiresAt: now + 30 * 60000, reward: 'coins', coins: 2 });
    expect(await rewards.status('alice', s.sessionId)).toEqual({ status: 'pending', expiresAt: s.expiresAt, reward: 'coins', balance: 0 });
    expect(await rewards.grant(callback(s, 'tx1'))).toMatchObject({ granted: true, duplicate: false, coins: 2 });
    expect(await rewards.status('alice', s.sessionId)).toEqual({ status: 'credited', expiresAt: expect.any(Number), reward: 'coins', coinsGranted: 2, balance: 2 });
    expect(walletDoc()).toMatchObject({ balance: 2, earnedToday: 2, day: '2026-10-01' });
    expect(ledger()).toEqual([{ uidHash: sha('alice'), type: 'earn', amount: 2, sessionId: s.sessionId, at: now, balanceAfter: 2 }]);
    // Coin sessions never touch the legacy Written Analysis counters or credits.
    expect([...store.docs.keys()].some(key => key.startsWith('_reward_daily/'))).toBe(false);
    expect(await rewards.dailySummary('alice')).toMatchObject({ earnedToday: 0, usedToday: 0, earnRemaining: 2 });
    await expect(rewards.acquire('alice', s.sessionId)).rejects.toMatchObject({ status: 409 });
  });

  it('never credits twice for one session or one transaction', async () => {
    coins();
    const s = await rewards.createSession('alice', 'android', 'coins');
    const other = await rewards.createSession('alice', 'android', 'coins');
    const results = await Promise.all([rewards.grant(callback(s, 'tx1')), rewards.grant(callback(s, 'tx1'))]);
    expect(results).toEqual([expect.objectContaining({ granted: true }), { granted: false, duplicate: true }]);
    await expect(rewards.grant(callback(s, 'tx2'))).rejects.toMatchObject({ status: 409 });
    await expect(rewards.grant(callback(other, 'tx1'))).rejects.toMatchObject({ status: 409 });
    await expect(rewards.grant({ ...callback(other, 'tx3'), userId: 'bob' })).rejects.toThrow();
    expect(walletDoc().balance).toBe(2);
    expect(ledger()).toHaveLength(1);
    expect((await rewards.status('alice', other.sessionId)).status).toBe('pending');
  });

  it('credits min(coinsPerAd, earn headroom, balance headroom) and refuses sessions when capped', async () => {
    coins({ dailyEarnCap: 3 });
    expect((await earn()).grant).toMatchObject({ coins: 2 });
    const late = await rewards.createSession('alice', 'android', 'coins');
    expect((await earn()).grant).toMatchObject({ coins: 1 });
    await expect(rewards.createSession('alice', 'android', 'coins')).rejects.toMatchObject({ status: 429 });
    // A session created before the cap was reached is credited zero, never negative.
    expect(await rewards.grant(callback(late, 'late'))).toMatchObject({ granted: true, coins: 0 });
    expect(await rewards.status('alice', late.sessionId)).toMatchObject({ status: 'credited', coinsGranted: 0, balance: 3 });
    now = Date.UTC(2026, 9, 2, 1);
    coins({ balanceCap: 4 });
    expect((await earn()).grant).toMatchObject({ coins: 1 });
    await expect(rewards.createSession('alice', 'android', 'coins')).rejects.toMatchObject({ status: 429, message: 'Your coin balance is full' });
    expect(walletDoc()).toMatchObject({ balance: 4, earnedToday: 1, day: '2026-10-02' });
  });

  it('rejects coin callbacks after coins are switched off and keeps the session pending', async () => {
    coins();
    const s = await rewards.createSession('alice', 'android', 'coins');
    store.docs.set('config/usage', { coins: { enabled: false } });
    await expect(rewards.grant(callback(s, 'tx1'))).rejects.toMatchObject({ status: 403 });
    expect((await rewards.status('alice', s.sessionId)).status).toBe('pending');
    expect(await rewards.cancel('alice', s.sessionId)).toMatchObject({ status: 'expired' });
  });

  it('leaves the legacy Written Analysis session flow unchanged', async () => {
    coins();
    const s = await rewards.createSession('alice', 'android');
    expect(Object.keys(s).sort()).toEqual(['expiresAt', 'sessionId', 'unitId', 'userId']);
    expect(store.docs.get(`_reward_sessions/${s.sessionId}`).reward).toBeUndefined();
    await rewards.grant(callback(s, 'legacy'));
    expect(await rewards.status('alice', s.sessionId)).toEqual({ status: 'earned', expiresAt: expect.any(Number) });
    expect(walletDoc()).toBeUndefined();
    await rewards.complete(await rewards.acquire('alice', s.sessionId), {});
    expect(await rewards.dailySummary('alice')).toMatchObject({ earnedToday: 1, usedToday: 1 });
  });
});

describe('coin spending holds', () => {
  beforeEach(async () => { coins(); for (let i = 0; i < 3; i++) await earn(); });

  it('holds the price, commits with the persisted result, and reports the balance', async () => {
    expect(walletDoc().balance).toBe(6);
    const hold = await wallet.reserve('alice', 'insights', rid(1));
    expect(hold).toMatchObject({ uid: 'alice', feature: 'insights', amount: 2, requestId: rid(1) });
    expect(walletDoc().balance).toBe(4);
    expect(await wallet.commit(hold, { lastInsight: { data: 'new' } })).toEqual({ spent: 2, balance: 4 });
    expect(store.docs.get('analytics/alice').lastInsight.data).toBe('new');
    expect(walletDoc()).toMatchObject({ balance: 4, usesToday: { insights: 1 }, holds: {} });
    expect(store.docs.get(`_coin_requests/${sha(`alice:${rid(1)}`)}`)).toMatchObject({ status: 'committed', feature: 'insights', amount: 2 });
    expect(ledger().at(-1)).toMatchObject({ type: 'spend', amount: 2, feature: 'insights', requestId: rid(1), balanceAfter: 4 });
    // The same requestId is never charged twice.
    await expect(wallet.reserve('alice', 'insights', rid(1))).rejects.toMatchObject({ status: 409 });
    expect(walletDoc().balance).toBe(4);
  });

  it('commits without an analytics write when the route persists nothing', async () => {
    await wallet.commit(await wallet.reserve('alice', 'whatif', rid(2)));
    expect(store.docs.has('analytics/alice')).toBe(false);
    expect(walletDoc()).toMatchObject({ balance: 5, usesToday: { whatif: 1 } });
  });

  it('validates request ids, switches, balance and the daily coin-use cap before holding', async () => {
    for (const bad of ['', 'ABC'.repeat(11), rid(1).slice(1), 'g'.repeat(32), 'a'.repeat(65)]) {
      await expect(wallet.reserve('alice', 'ocr', bad)).rejects.toMatchObject({ status: 400 });
    }
    coins({ features: { ocr: { enabled: false } } });
    await expect(wallet.reserve('alice', 'ocr', rid(3))).rejects.toMatchObject({ status: 403 });
    coins({ features: { ocr: { price: 7 } } });
    await expect(wallet.reserve('alice', 'ocr', rid(3))).rejects.toMatchObject({ status: 402, message: 'Not enough coins', details: { balance: 6, price: 7 } });
    coins({ features: { forecast: { dailyUseCap: 1 } } });
    const active = await wallet.reserve('alice', 'forecast', rid(4));
    // An in-flight hold counts against the cap, so concurrent requests cannot exceed it.
    await expect(wallet.reserve('alice', 'forecast', rid(5))).rejects.toMatchObject({ status: 429 });
    await wallet.commit(active);
    await expect(wallet.reserve('alice', 'forecast', rid(5))).rejects.toMatchObject({ status: 429 });
    store.docs.set('config/usage', { coins: { enabled: false } });
    await expect(wallet.reserve('alice', 'whatif', rid(6))).rejects.toMatchObject({ status: 403 });
    // Spending does not depend on the ads switch; earning does.
    coins(); store.docs.set('config/mobileAds', { ...config, enabled: false });
    expect(await wallet.reserve('alice', 'whatif', rid(6))).toMatchObject({ amount: 1 });
  });

  it('refunds a failed request once, and allows that same request id to be retried', async () => {
    const hold = await wallet.reserve('alice', 'ocr', rid(7));
    await expect(wallet.reserve('alice', 'ocr', rid(7))).rejects.toMatchObject({ status: 409 });
    await wallet.refund(hold);
    await wallet.refund(hold);
    expect(walletDoc()).toMatchObject({ balance: 6, holds: {} });
    expect(ledger().filter(entry => entry.type === 'refund')).toHaveLength(1);
    expect(ledger().at(-1)).toMatchObject({ type: 'refund', amount: 3, feature: 'ocr', requestId: rid(7), balanceAfter: 6 });
    await expect(wallet.commit(hold)).rejects.toMatchObject({ status: 409 });
    const retry = await wallet.reserve('alice', 'ocr', rid(7));
    await wallet.commit(retry);
    await wallet.refund(retry);
    expect(walletDoc()).toMatchObject({ balance: 3, usesToday: { ocr: 1 } });
  });

  it('auto-refunds holds older than five minutes on the next wallet transaction, exactly once', async () => {
    const stale = await wallet.reserve('alice', 'ocr', rid(8));
    now += 5 * 60000 + 1;
    expect(walletDoc().balance).toBe(3);
    await wallet.commit(await wallet.reserve('alice', 'whatif', rid(9)));
    expect(walletDoc()).toMatchObject({ balance: 5, holds: {} });
    expect(store.docs.get(`_coin_requests/${sha(`alice:${rid(8)}`)}`)).toMatchObject({ status: 'refunded' });
    await expect(wallet.commit(stale)).rejects.toMatchObject({ status: 409 });
    await wallet.refund(stale);
    expect(walletDoc().balance).toBe(5);
    expect(ledger().filter(entry => entry.type === 'refund')).toHaveLength(1);
  });

  it('refunds an expired hold whose commit is refused, even without another transaction first', async () => {
    const hold = await wallet.reserve('alice', 'insights', rid(10));
    now += 6 * 60000;
    await expect(wallet.commit(hold, { lastInsight: { data: 'late' } })).rejects.toMatchObject({ status: 409 });
    expect(store.docs.has('analytics/alice')).toBe(false);
    await wallet.refund(hold);
    expect(walletDoc().balance).toBe(6);
  });

  it('rolls back the charge when persisting the result fails', async () => {
    const hold = await wallet.reserve('alice', 'forecast', rid(11));
    store.failNextWrite('analytics/alice');
    await expect(wallet.commit(hold, { forecast: { trendLabel: 'x' } })).rejects.toThrow('storage unavailable');
    expect(walletDoc()).toMatchObject({ balance: 5 });
    expect(store.docs.get(`_coin_requests/${sha(`alice:${rid(11)}`)}`)).toMatchObject({ status: 'held' });
    await wallet.refund(hold);
    expect(walletDoc().balance).toBe(6);
  });

  it('serializes racing holds against one balance and one request id', async () => {
    coins({ features: { ocr: { price: 4 } } });
    const racing = await Promise.allSettled([wallet.reserve('alice', 'ocr', rid(12)), wallet.reserve('alice', 'ocr', rid(13))]);
    expect(racing.map(r => r.status).sort()).toEqual(['fulfilled', 'rejected']);
    expect((racing.find(r => r.status === 'rejected') as PromiseRejectedResult).reason).toMatchObject({ status: 402 });
    const same = await Promise.allSettled([wallet.reserve('alice', 'whatif', rid(14)), wallet.reserve('alice', 'whatif', rid(14))]);
    expect((same.find(r => r.status === 'rejected') as PromiseRejectedResult).reason).toMatchObject({ status: 409 });
    expect(walletDoc().balance).toBe(1);
  });

  it('isolates wallets between users and resets daily counters at UTC midnight', async () => {
    await expect(wallet.reserve('bob', 'whatif', rid(15))).rejects.toMatchObject({ status: 402, details: { balance: 0, price: 1 } });
    await wallet.commit(await wallet.reserve('alice', 'insights', rid(16)));
    await wallet.commit(await wallet.reserve('alice', 'insights', rid(17)));
    await expect(wallet.reserve('alice', 'insights', rid(18))).rejects.toMatchObject({ status: 429 });
    now = Date.UTC(2026, 9, 2, 0, 0, 1);
    expect(await wallet.reserve('alice', 'insights', rid(18))).toMatchObject({ amount: 2 });
  });
});

describe('read-only coin summaries', () => {
  it('reports null when coins are off and never creates documents', async () => {
    const before = coinDocs();
    expect(await wallet.summary('alice')).toEqual({ coins: null, features: { insights: null, forecast: null, whatif: null, ocr: null } });
    expect(await wallet.quote('alice', 'ocr')).toBeNull();
    expect(coinDocs()).toEqual(before);
  });

  it('summarizes balance, earning headroom and per-feature uses without mutating storage', async () => {
    coins({ dailyEarnCap: 10, balanceCap: 7, features: { whatif: { enabled: false } } });
    for (let i = 0; i < 3; i++) await earn();
    await wallet.commit(await wallet.reserve('alice', 'insights', rid(1)));
    await wallet.reserve('alice', 'ocr', rid(2));
    now += 6 * 60000; // The ocr hold is expired but not yet swept: reads report it as refunded.
    const before = coinDocs();
    expect(await wallet.summary('alice')).toEqual({
      coins: { enabled: true, balance: 4, balanceCap: 7, coinsPerAd: 2, earnedToday: 6, dailyEarnCap: 10, earnRemaining: 3, resetAtUTC: Date.UTC(2026, 9, 2) },
      features: {
        insights: { enabled: true, price: 2, usesToday: 1, dailyUseCap: 2 },
        forecast: { enabled: true, price: 1, usesToday: 0, dailyUseCap: 5 },
        whatif: { enabled: false, price: 1, usesToday: 0, dailyUseCap: 10 },
        ocr: { enabled: true, price: 3, usesToday: 0, dailyUseCap: 5 },
      },
    });
    expect(await wallet.quote('alice', 'ocr')).toEqual({ price: 3, balance: 4 });
    expect(await wallet.quote('alice', 'whatif')).toBeNull();
    store.docs.set('config/mobileAds', { ...config, rewardedEnabled: false });
    expect((await wallet.summary('alice')).coins).toMatchObject({ enabled: false, balance: 4 });
    expect((await wallet.summary('alice')).features.forecast).toMatchObject({ enabled: true });
    expect(coinDocs()).toEqual(before);
  });
});
