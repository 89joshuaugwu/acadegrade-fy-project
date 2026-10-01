import 'server-only';
import { adminDb } from '@/lib/firebase/admin';
import { RewardService } from './service';

export const rewards = new RewardService(adminDb);
export { RewardError } from './errors';
export type { RewardLease } from './service';
