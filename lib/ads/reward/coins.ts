import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import type { Firestore, Transaction } from 'firebase-admin/firestore';
import { FEATURE_IDS, USAGE_FEATURES, readUsagePolicy, type CoinPolicy, type CoinSummary, type FeatureCoinSummary, type UsageFeatureId } from '@/lib/usage/policy';
import { rewardedDelivery } from './delivery';
import { RewardError } from './errors';

/** A hold that is neither committed nor refunded within this window is
 * refunded by the next wallet transaction. */
export const COIN_HOLD_TTL = 5 * 60 * 1000;
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const REQUEST_ID = /^[a-f0-9]{32,64}$/;
const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');
const newId = () => randomBytes(16).toString('hex');
export const utcDay = (now: number) => new Date(now).toISOString().slice(0, 10);
export const nextUtcMidnight = (now: number) => Date.parse(`${utcDay(now)}T00:00:00.000Z`) + DAY;

export function isCoinRequestId(value: unknown): value is string {
  return typeof value === 'string' && REQUEST_ID.test(value);
}

interface StoredHold { feature: UsageFeatureId; amount: number; holdId: string; until: number; requestId: string }
interface WalletDoc {
  balance?: number; day?: string; earnedToday?: number;
  usesToday?: Partial<Record<UsageFeatureId, number>>;
  holds?: Record<string, StoredHold>;
  created?: number; hourlyCreated?: number; hourStarted?: number;
}
interface CoinRequestDoc { uidHash: string; feature: UsageFeatureId; requestId: string; amount: number; status: 'held' | 'committed' | 'refunded'; holdId: string; heldAt: number; until: number }
type LedgerEntry = { type: 'earn' | 'spend' | 'refund'; amount: number; balanceAfter: number; feature?: UsageFeatureId; sessionId?: string; requestId?: string };

/** Proof of a reserved price; only the route that reserved it may commit or refund it. */
export interface CoinHold { uid: string; requestId: string; feature: UsageFeatureId; holdId: string; amount: number }

export const walletRef = (db: Firestore, uid: string) => db.collection('_coin_wallets').doc(sha256(uid));
const requestKey = (uid: string, requestId: string) => sha256(`${uid}:${requestId}`);
const requestRef = (db: Firestore, key: string) => db.collection('_coin_requests').doc(key);

/** One transaction's view of a wallet. Construction refunds expired holds in
 * memory; `write` persists them (with ledger entries) only when a caller
 * writes, so read-only summaries report the same numbers without mutating. */
export class WalletState {
  balance: number; earnedToday: number; usesToday: Partial<Record<UsageFeatureId, number>>;
  holds: Record<string, StoredHold> = {};
  created: number; hourlyCreated: number; hourStarted: number;
  private readonly ledger: LedgerEntry[] = [];
  private readonly requests = new Map<string, { data: Partial<CoinRequestDoc> & { refundedAt?: number; committedAt?: number }; merge: boolean }>();
  readonly swept = new Set<string>();

  constructor(data: WalletDoc | undefined, readonly now: number) {
    const sameDay = data?.day === utcDay(now);
    this.balance = data?.balance ?? 0;
    this.earnedToday = sameDay ? data?.earnedToday ?? 0 : 0;
    this.usesToday = sameDay ? { ...data?.usesToday } : {};
    this.created = sameDay ? data?.created ?? 0 : 0;
    this.hourlyCreated = now - (data?.hourStarted ?? 0) >= HOUR ? 0 : data?.hourlyCreated ?? 0;
    this.hourStarted = this.hourlyCreated ? data?.hourStarted ?? now : now;
    for (const [key, hold] of Object.entries(data?.holds ?? {})) {
      this.holds[key] = hold;
      if (hold.until <= now) { this.refund(key); this.swept.add(key); }
    }
  }

  usesIncludingHolds(feature: UsageFeatureId) {
    return (this.usesToday[feature] ?? 0) + Object.values(this.holds).filter(hold => hold.feature === feature).length;
  }

  refund(key: string) {
    const hold = this.holds[key];
    if (!hold) return;
    delete this.holds[key];
    this.balance += hold.amount;
    this.ledger.push({ type: 'refund', amount: hold.amount, feature: hold.feature, requestId: hold.requestId, balanceAfter: this.balance });
    this.requests.set(key, { data: { status: 'refunded', refundedAt: this.now }, merge: true });
  }

  assertCanEarn(policy: CoinPolicy) {
    if (this.earnedToday >= policy.dailyEarnCap) throw new RewardError('Daily coin earning limit reached', 429);
    if (this.balance >= policy.balanceCap) throw new RewardError('Your coin balance is full', 429);
  }

  /** Session creation stays bounded: 6 per fixed hour and enough per UTC day
   * to reach the earn cap with headroom for no-fill and cancelled ads. */
  countSessionCreation(policy: CoinPolicy) {
    const daily = Math.max(12, Math.ceil(policy.dailyEarnCap / policy.coinsPerAd) + 10);
    if (this.hourlyCreated >= 6 || this.created >= daily) throw new RewardError('Reward session creation limit reached', 429);
    this.created += 1; this.hourlyCreated += 1;
  }

  /** Credits min(offered, earn headroom, balance headroom), never below zero. */
  credit(offered: number, policy: CoinPolicy, sessionId: string) {
    const amount = Math.max(0, Math.min(offered, policy.dailyEarnCap - this.earnedToday, policy.balanceCap - this.balance));
    this.balance += amount; this.earnedToday += amount;
    this.ledger.push({ type: 'earn', amount, sessionId, balanceAfter: this.balance });
    return amount;
  }

  hold(uid: string, feature: UsageFeatureId, requestId: string, amount: number): CoinHold {
    const key = requestKey(uid, requestId);
    const holdId = newId(); const until = this.now + COIN_HOLD_TTL;
    this.balance -= amount;
    this.holds[key] = { feature, amount, holdId, until, requestId };
    this.ledger.push({ type: 'spend', amount, feature, requestId, balanceAfter: this.balance });
    this.requests.set(key, { data: { uidHash: sha256(uid), feature, requestId, amount, status: 'held', holdId, heldAt: this.now, until }, merge: false });
    return { uid, requestId, feature, holdId, amount };
  }

  commit(key: string, request: CoinRequestDoc) {
    const hold = this.holds[key];
    delete this.holds[key];
    this.usesToday = { ...this.usesToday, [hold.feature]: (this.usesToday[hold.feature] ?? 0) + 1 };
    this.requests.set(key, { data: { ...request, status: 'committed', committedAt: this.now }, merge: false });
  }

  get changed() { return this.ledger.length > 0 || this.requests.size > 0; }

  write(tx: Transaction, db: Firestore, uid: string) {
    const uidHash = sha256(uid);
    tx.set(walletRef(db, uid), {
      balance: this.balance, day: utcDay(this.now), earnedToday: this.earnedToday, usesToday: this.usesToday, holds: this.holds,
      created: this.created, hourlyCreated: this.hourlyCreated, hourStarted: this.hourStarted, updatedAt: this.now,
    } satisfies WalletDoc & { updatedAt: number });
    // Append-only audit trail; entries are never updated or deleted.
    for (const entry of this.ledger) tx.create(db.collection('_coin_ledger').doc(newId()), { uidHash, ...entry, at: this.now });
    // Idempotency records have no TTL: deleting one would let a replayed requestId charge again.
    for (const [key, { data, merge }] of this.requests) tx.set(requestRef(db, key), data, { merge });
  }
}

export interface CoinSnapshot { coins: CoinSummary | null; features: Record<UsageFeatureId, FeatureCoinSummary | null> }

export class CoinWallet {
  constructor(private readonly db: Firestore, private readonly clock = Date.now) {}

  private async policy(tx: Transaction) {
    return readUsagePolicy((await tx.get(this.db.collection('config').doc('usage'))).data()).coins;
  }

  /** Step 1: atomically reserve the feature's price, keyed by the client's requestId. */
  async reserve(uid: string, feature: UsageFeatureId, requestId: string): Promise<CoinHold> {
    if (!isCoinRequestId(requestId)) throw new RewardError('Invalid coin spend request ID');
    if (!FEATURE_IDS.includes(feature)) throw new RewardError('Unknown coin feature');
    const key = requestKey(uid, requestId);
    return this.db.runTransaction(async tx => {
      const now = this.clock();
      const policy = await this.policy(tx);
      const walletSnap = await tx.get(walletRef(this.db, uid));
      const request = (await tx.get(requestRef(this.db, key))).data() as CoinRequestDoc | undefined;
      const label = USAGE_FEATURES[feature].label;
      if (!policy.enabled) throw new RewardError('Coins are disabled', 403);
      const price = policy.features[feature];
      if (!price.enabled) throw new RewardError(`Coins are disabled for ${label}`, 403);
      const state = new WalletState(walletSnap.data() as WalletDoc | undefined, now);
      const retryable = request?.status === 'refunded' || (request?.status === 'held' && state.swept.has(key));
      if (request && !retryable) throw new RewardError('This coin request was already used or is in progress', 409);
      if (state.usesIncludingHolds(feature) >= price.dailyUseCap) throw new RewardError(`Daily coin limit reached for ${label}`, 429);
      if (state.balance < price.price) throw new RewardError('Not enough coins', 402, { balance: state.balance, price: price.price });
      const hold = state.hold(uid, feature, requestId, price.price);
      state.write(tx, this.db, uid);
      return hold;
    });
  }

  /** Step 3: finalize the charge, persisting the route's result atomically. */
  async commit(hold: CoinHold, analytics?: Record<string, unknown>) {
    const key = requestKey(hold.uid, hold.requestId);
    return this.db.runTransaction(async tx => {
      const now = this.clock();
      const walletSnap = await tx.get(walletRef(this.db, hold.uid));
      const request = (await tx.get(requestRef(this.db, key))).data() as CoinRequestDoc | undefined;
      const state = new WalletState(walletSnap.data() as WalletDoc | undefined, now);
      if (state.holds[key]?.holdId !== hold.holdId || request?.status !== 'held' || request.holdId !== hold.holdId) {
        throw new RewardError('Coin hold expired; your coins were not spent', 409);
      }
      state.commit(key, request);
      state.write(tx, this.db, hold.uid);
      if (analytics) tx.set(this.db.collection('analytics').doc(hold.uid), analytics, { merge: true });
      return { spent: hold.amount, balance: state.balance };
    });
  }

  /** Step 4: return a failed request's coins. Idempotent and token-fenced. */
  async refund(hold: CoinHold) {
    const key = requestKey(hold.uid, hold.requestId);
    await this.db.runTransaction(async tx => {
      const walletSnap = await tx.get(walletRef(this.db, hold.uid));
      const request = (await tx.get(requestRef(this.db, key))).data() as CoinRequestDoc | undefined;
      const state = new WalletState(walletSnap.data() as WalletDoc | undefined, this.clock());
      if (request?.status === 'held' && request.holdId === hold.holdId && state.holds[key]?.holdId === hold.holdId) state.refund(key);
      if (state.changed) state.write(tx, this.db, hold.uid);
    });
  }

  /** Read-only snapshot. Never creates, sweeps or increments anything. */
  async summary(uid: string): Promise<CoinSnapshot> {
    const now = this.clock();
    const [ads, usage, walletSnap] = await Promise.all([
      this.db.collection('config').doc('mobileAds').get(),
      this.db.collection('config').doc('usage').get(),
      walletRef(this.db, uid).get(),
    ]);
    const policy = readUsagePolicy(usage.data()).coins;
    if (!policy.enabled) return { coins: null, features: { insights: null, forecast: null, whatif: null, ocr: null } };
    const state = new WalletState(walletSnap.data() as WalletDoc | undefined, now);
    return {
      coins: {
        enabled: rewardedDelivery(ads.data()).enabled,
        balance: state.balance, balanceCap: policy.balanceCap, coinsPerAd: policy.coinsPerAd,
        earnedToday: state.earnedToday, dailyEarnCap: policy.dailyEarnCap,
        earnRemaining: Math.max(0, Math.min(policy.dailyEarnCap - state.earnedToday, policy.balanceCap - state.balance)),
        resetAtUTC: nextUtcMidnight(now),
      },
      features: Object.fromEntries(FEATURE_IDS.map(id => [id, {
        enabled: policy.features[id].enabled, price: policy.features[id].price,
        usesToday: state.usesToday[id] ?? 0, dailyUseCap: policy.features[id].dailyUseCap,
      }])) as CoinSnapshot['features'],
    };
  }

  /** Price and balance for the free-limit 429 hint; null when coins can't pay for this feature. */
  async quote(uid: string, feature: UsageFeatureId) {
    const { coins, features } = await this.summary(uid);
    const entry = features[feature];
    return coins && entry?.enabled ? { price: entry.price, balance: coins.balance } : null;
  }

  /** Read-only wallet balance (expired holds counted as refunded). */
  async balance(uid: string) {
    return new WalletState((await walletRef(this.db, uid).get()).data() as WalletDoc | undefined, this.clock()).balance;
  }
}
