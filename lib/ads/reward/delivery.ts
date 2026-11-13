import 'server-only';
import { safeMobileAdsConfig } from '@/lib/ads/mobile';

export const TEST_REWARDED_UNIT = 'ca-app-pub-3940256099942544/5224354917';

export type RewardedDelivery =
  | { enabled: true; unitId: string; testMode: boolean }
  | { enabled: false; reason: 'disabled' | 'unit' };

/** The single Android rewarded "master switch" rule, shared by legacy refresh
 * sessions, coin earning and read-only summaries. Absent or invalid config is
 * disabled; delivery is never bootstrapped from env. */
export function rewardedDelivery(mobileAds: unknown): RewardedDelivery {
  const config = safeMobileAdsConfig(mobileAds);
  if (!config.enabled || config.rewardedEnabled !== true) return { enabled: false, reason: 'disabled' };
  const unitId = config.testMode ? TEST_REWARDED_UNIT : config.rewardedUnitId;
  if (!/^ca-app-pub-\d{16}\/\d{10}$/.test(unitId)) return { enabled: false, reason: 'unit' };
  return { enabled: true, unitId, testMode: config.testMode };
}
