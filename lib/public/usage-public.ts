import 'server-only';
import { unstable_cache } from 'next/cache';
import { inspectStoredUsagePolicy } from '@/lib/usage/server';
import { FEATURE_IDS, type UsageFeatureId, type UsagePolicy } from '@/lib/usage/policy';

/**
 * The free daily allowances and coin settings that public pages quote
 * (AcadeMind, scanner, Android pages). Read live from `config/usage`,
 * cached for five minutes, and null on any failure so pages fall back to
 * numberless wording ("Free uses every day").
 */

export const USAGE_PUBLIC_REVALIDATE_SECONDS = 300;

export interface PublicCoinFeature {
  enabled: boolean;
  price: number;
  dailyUseCap: number;
}

export interface PublicUsage {
  /** Free uses per 24 hours; 0 means the feature is paused. */
  dailyLimits: Record<UsageFeatureId, number>;
  coins: {
    enabled: boolean;
    coinsPerAd: number;
    dailyEarnCap: number;
    features: Record<UsageFeatureId, PublicCoinFeature>;
  };
}

/** Only the fields public pages need; nothing else from the stored document. */
export function toPublicUsage(policy: UsagePolicy): PublicUsage {
  return {
    dailyLimits: Object.fromEntries(FEATURE_IDS.map((id) => [id, policy.dailyLimits[id]])) as PublicUsage['dailyLimits'],
    coins: {
      enabled: policy.coins.enabled,
      coinsPerAd: policy.coins.coinsPerAd,
      dailyEarnCap: policy.coins.dailyEarnCap,
      features: Object.fromEntries(FEATURE_IDS.map((id) => {
        const feature = policy.coins.features[id];
        return [id, { enabled: feature.enabled, price: feature.price, dailyUseCap: feature.dailyUseCap }];
      })) as PublicUsage['coins']['features'],
    },
  };
}

const readCachedUsage = unstable_cache(
  async (): Promise<PublicUsage> => toPublicUsage((await inspectStoredUsagePolicy()).policy),
  ['public-usage'],
  { revalidate: USAGE_PUBLIC_REVALIDATE_SECONDS }
);

/** Live public usage, or null when storage cannot be read. Never throws. */
export async function readPublicUsage(): Promise<PublicUsage | null> {
  try {
    return await readCachedUsage();
  } catch {
    return null;
  }
}
