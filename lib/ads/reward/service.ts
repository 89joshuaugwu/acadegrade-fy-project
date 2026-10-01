import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import { Timestamp, type Firestore, type Transaction } from 'firebase-admin/firestore';
import { safeMobileAdsConfig } from '@/lib/ads/mobile';
import { RewardError } from './errors';
import type { VerifiedRewardCallback } from './ssv';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const PENDING_TTL = 30 * 60 * 1000;
const LEASE_TTL = 5 * 60 * 1000;
const TEST_UNIT = 'ca-app-pub-3940256099942544/5224354917';
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const id = () => randomBytes(32).toString('hex');
export type RewardStatus = 'pending' | 'earned' | 'processing' | 'consumed' | 'expired';
interface Session {
  uid: string; unitId: string; testMode: boolean; status: RewardStatus;
  createdAt: number; expiresAt: number; transactionId?: string;
  leaseId?: string | null; leaseUntil?: number; leaseDay?: string;
}
interface Daily {
  earned?: number; used?: number; created?: number; hourStarted?: number; hourlyCreated?: number;
  attempted?: number; attemptHourStarted?: number; hourlyAttempts?: number;
  leases?: Record<string, { id: string; until: number }>;
}
export interface RewardLease { uid: string; sessionId: string; leaseId: string; day: string }

export class RewardService {
  constructor(private readonly db: Firestore, private readonly clock = Date.now) {}
  private sessionRef(sessionId: string) {
    if (typeof sessionId !== 'string' || !/^[a-f0-9]{64}$/.test(sessionId)) throw new RewardError('Invalid reward session ID');
    return this.db.collection('_reward_sessions').doc(sessionId);
  }
  private day(now: number) { return new Date(now).toISOString().slice(0, 10); }
  private dailyRef(uid: string, day: string) { return this.db.collection('_reward_daily').doc(`${hash(uid)}_${day}`); }
  private async config(tx: Transaction) {
    const config = safeMobileAdsConfig((await tx.get(this.db.collection('config').doc('mobileAds'))).data());
    // Absent optional switch is disabled; never bootstrap delivery from env.
    if (!config.enabled || config.rewardedEnabled !== true) throw new RewardError('Rewarded Insights refresh is disabled', 403);
    const unitId = config.testMode ? TEST_UNIT : config.rewardedUnitId;
    if (!/^ca-app-pub-\d{16}\/\d{10}$/.test(unitId)) throw new RewardError('Rewarded ad unit is not configured', 403);
    return { ...config, unitId };
  }
  private owned(data: Session | undefined, uid: string): Session {
    if (!data || data.uid !== uid) throw new RewardError('Reward session not found', 404);
    return data;
  }
  private effectiveStatus(s: Session, now: number): RewardStatus {
    if (s.status === 'consumed') return 'consumed';
    if (s.expiresAt <= now) return 'expired';
    if (s.status === 'processing' && (s.leaseUntil ?? 0) <= now) return 'earned';
    return s.status;
  }
  async createSession(uid: string, platform: unknown) {
    if (platform !== 'android') throw new RewardError('Rewarded refresh is Android only');
    const sessionId = id();
    return this.db.runTransaction(async tx => {
      const now = this.clock();
      const config = await this.config(tx);
      const dailyRef = this.dailyRef(uid, this.day(now));
      const daily: Daily = (await tx.get(dailyRef)).data() ?? {};
      if ((daily.earned ?? 0) >= 2) throw new RewardError('Daily rewarded refresh limit reached', 429);
      const hourlyCreated = now - (daily.hourStarted ?? 0) >= HOUR ? 0 : (daily.hourlyCreated ?? 0);
      if (hourlyCreated >= 6 || (daily.created ?? 0) >= 12) throw new RewardError('Reward session creation limit reached', 429);
      const expiresAt = now + PENDING_TTL;
      tx.set(dailyRef, { ...daily, created: (daily.created ?? 0) + 1, hourlyCreated: hourlyCreated + 1, hourStarted: hourlyCreated ? daily.hourStarted : now });
      tx.create(this.sessionRef(sessionId), { uid, unitId: config.unitId, testMode: config.testMode, status: 'pending', createdAt: now, expiresAt,
        // TTL cleanup is optional; authorization always enforces expiresAt itself.
        ttlAt: Timestamp.fromMillis(expiresAt + DAY) });
      return { sessionId, unitId: config.unitId, userId: uid, expiresAt };
    });
  }
  async status(uid: string, sessionId: string) {
    const s = this.owned((await this.sessionRef(sessionId).get()).data() as Session | undefined, uid);
    return { status: this.effectiveStatus(s, this.clock()), expiresAt: s.expiresAt };
  }
  async cancel(uid: string, sessionId: string) {
    const ref = this.sessionRef(sessionId);
    return this.db.runTransaction(async tx => {
      const now = this.clock();
      const s = this.owned((await tx.get(ref)).data() as Session | undefined, uid);
      // Grant/cancel both read the same document. Firestore retries a racing
      // transaction; whichever commits first determines the final state.
      if (s.status === 'pending') {
        tx.set(ref, { ...s, status: 'expired', expiresAt: Math.min(now, s.expiresAt) });
        return { status: 'expired' as RewardStatus, expiresAt: Math.min(now, s.expiresAt) };
      }
      return { status: this.effectiveStatus(s, now), expiresAt: s.expiresAt };
    });
  }
  /** Input MUST come from verifyRewardCallback, never client SDK callbacks. */
  async grant(callback: VerifiedRewardCallback) {
    if (callback.userId === undefined && callback.customData === undefined) return { granted: false, validationOnly: true };
    if (!callback.userId || !callback.customData || callback.transactionId.length > 256) throw new RewardError('Missing reward session binding');
    const ref = this.sessionRef(callback.customData);
    const transactionRef = this.db.collection('_reward_transactions').doc(hash(callback.transactionId));
    return this.db.runTransaction(async tx => {
      const now = this.clock();
      await this.config(tx);
      const s = this.owned((await tx.get(ref)).data() as Session | undefined, callback.userId!);
      const replay = (await tx.get(transactionRef)).data();
      const dailyRef = this.dailyRef(s.uid, this.day(now));
      const daily: Daily = (await tx.get(dailyRef)).data() ?? {};
      const unitMatches = callback.adUnit === s.unitId || callback.adUnit === s.unitId.split('/')[1];
      const rewardMatches = callback.rewardAmount === 1 && callback.rewardItem === 'Insights refresh';
      const testRewardMatches = s.testMode && s.unitId === TEST_UNIT && callback.rewardAmount === 10 && callback.rewardItem === 'coins';
      if (!unitMatches || (!rewardMatches && !testRewardMatches)) throw new RewardError('Reward does not match session');
      if (replay) {
        if (replay.sessionId === callback.customData && s.transactionId === callback.transactionId) return { granted: false, duplicate: true };
        throw new RewardError('Reward transaction already used', 409);
      }
      if (s.status !== 'pending') throw new RewardError('Reward session already rewarded', 409);
      if (s.expiresAt <= now || callback.timestamp < s.createdAt - 60000 || callback.timestamp > now + 60000 || callback.timestamp > s.expiresAt) throw new RewardError('Reward session expired or timestamp invalid', 410);
      if ((daily.earned ?? 0) >= 2) throw new RewardError('Daily rewarded refresh limit reached', 429);
      // No TTL on transaction tombstones: deleting one would reopen replay.
      tx.create(transactionRef, { sessionId: callback.customData, uid: s.uid, receivedAt: now });
      tx.set(ref, { ...s, status: 'earned', transactionId: callback.transactionId, expiresAt: now + DAY, ttlAt: Timestamp.fromMillis(now + 2 * DAY) });
      tx.set(dailyRef, { ...daily, earned: (daily.earned ?? 0) + 1 });
      return { granted: true, duplicate: false };
    });
  }
  async acquire(uid: string, sessionId: string): Promise<RewardLease> {
    const ref = this.sessionRef(sessionId); const leaseId = id();
    return this.db.runTransaction(async tx => {
      const now = this.clock(); const day = this.day(now);
      await this.config(tx);
      const s = this.owned((await tx.get(ref)).data() as Session | undefined, uid);
      if (this.effectiveStatus(s, now) !== 'earned' || !s.transactionId) throw new RewardError('Reward session is not available', 409);
      const dailyRef = this.dailyRef(uid, day); const daily: Daily = (await tx.get(dailyRef)).data() ?? {};
      const leases = Object.fromEntries(Object.entries(daily.leases ?? {}).filter(([, lease]) => lease.until > now));
      if ((daily.used ?? 0) + Object.keys(leases).length >= 2) throw new RewardError('Daily rewarded refresh use limit reached', 429);
      // Failure restores the credit, not an unlimited provider-request budget.
      const hourlyAttempts = now - (daily.attemptHourStarted ?? 0) >= HOUR ? 0 : (daily.hourlyAttempts ?? 0);
      if (hourlyAttempts >= 6 || (daily.attempted ?? 0) >= 12) throw new RewardError('Rewarded refresh retry limit reached; your credit is preserved', 429);
      leases[sessionId] = { id: leaseId, until: now + LEASE_TTL };
      tx.set(dailyRef, { ...daily, leases, attempted: (daily.attempted ?? 0) + 1, hourlyAttempts: hourlyAttempts + 1, attemptHourStarted: hourlyAttempts ? daily.attemptHourStarted : now });
      tx.set(ref, { ...s, status: 'processing', leaseId, leaseUntil: now + LEASE_TTL, leaseDay: day });
      return { uid, sessionId, leaseId, day };
    });
  }
  async release(lease: RewardLease) {
    const ref = this.sessionRef(lease.sessionId);
    await this.db.runTransaction(async tx => {
      const s = this.owned((await tx.get(ref)).data() as Session | undefined, lease.uid);
      const dailyRef = this.dailyRef(lease.uid, lease.day); const daily: Daily = (await tx.get(dailyRef)).data() ?? {};
      if (s.status !== 'processing' || s.leaseId !== lease.leaseId) return;
      const leases = { ...daily.leases }; if (leases[lease.sessionId]?.id === lease.leaseId) delete leases[lease.sessionId];
      tx.set(dailyRef, { ...daily, leases });
      tx.set(ref, { ...s, status: 'earned', leaseId: null, leaseUntil: 0 });
    });
  }
  async complete(lease: RewardLease, analytics: Record<string, unknown>) {
    const ref = this.sessionRef(lease.sessionId);
    await this.db.runTransaction(async tx => {
      await this.config(tx);
      const s = this.owned((await tx.get(ref)).data() as Session | undefined, lease.uid);
      const dailyRef = this.dailyRef(lease.uid, lease.day); const daily: Daily = (await tx.get(dailyRef)).data() ?? {};
      const now = this.clock();
      if (s.status !== 'processing' || s.leaseId !== lease.leaseId || s.leaseDay !== lease.day || (s.leaseUntil ?? 0) <= now || s.expiresAt <= now || daily.leases?.[lease.sessionId]?.id !== lease.leaseId) throw new RewardError('Reward processing lease expired', 409);
      const leases = { ...daily.leases }; delete leases[lease.sessionId];
      tx.set(dailyRef, { ...daily, used: (daily.used ?? 0) + 1, leases });
      tx.set(ref, { ...s, status: 'consumed', consumedAt: now, leaseId: null, leaseUntil: 0 });
      tx.set(this.db.collection('analytics').doc(lease.uid), analytics, { merge: true });
    });
  }
}
