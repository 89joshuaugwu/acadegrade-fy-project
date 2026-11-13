import 'server-only';
import { adminDb } from '@/lib/firebase/admin';
import { CoinWallet } from './coins';
import { RewardService } from './service';

export const rewards = new RewardService(adminDb);
export const coins = new CoinWallet(adminDb);
export { RewardError } from './errors';
export { isCoinRequestId } from './coins';
export type { RewardLease, RewardDailySummary } from './service';
export type { CoinHold, CoinSnapshot } from './coins';
