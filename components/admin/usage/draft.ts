import { COIN_LIMITS, FEATURE_IDS, MAX_FREE_DAILY_LIMIT, USAGE_FEATURES, parseCompleteUsagePolicy, type UsageFeatureId, type UsagePolicy } from '@/lib/usage/policy';

/** The editor keeps one flat draft keyed by policy path, so an in-flight save
 * can adopt server values field by field without losing later edits. */
export type DraftValue = string | boolean;
export type PolicyDraft = Record<string, DraftValue>;

interface NumberField { label: string; min: number; max: number; message: string }

const range = (label: string, min: number, max: number): NumberField =>
  ({ label, min, max, message: `${label} must be a whole number from ${min} to ${max}.` });

/** Feature names exactly as students see them (the policy module says "What-if guidance"). */
export const FEATURE_LABELS: Record<UsageFeatureId, string> = {
  insights: 'Written Analysis',
  forecast: 'Forecast',
  whatif: 'What-If guidance',
  ocr: 'Result scanning',
};

export const dailyKey = (id: UsageFeatureId) => `dailyLimits.${id}`;
export const featureKey = (id: UsageFeatureId, field: 'enabled' | 'price' | 'dailyUseCap') => `coins.features.${id}.${field}`;

export const NUMBER_FIELDS: Record<string, NumberField> = Object.fromEntries([
  ...FEATURE_IDS.map(id => [dailyKey(id), { ...range(`${FEATURE_LABELS[id]}: free uses per 24 hours`, 0, MAX_FREE_DAILY_LIMIT), message: 'Free uses must be whole numbers from 0 to 1000.' }]),
  ['coins.coinsPerAd', range('Coins per ad', COIN_LIMITS.coinsPerAd.min, COIN_LIMITS.coinsPerAd.max)],
  ['coins.dailyEarnCap', range('Daily earn cap', COIN_LIMITS.dailyEarnCap.min, COIN_LIMITS.dailyEarnCap.max)],
  ['coins.balanceCap', range('Balance cap', COIN_LIMITS.balanceCap.min, COIN_LIMITS.balanceCap.max)],
  ...FEATURE_IDS.flatMap(id => [
    [featureKey(id, 'price'), range(`${FEATURE_LABELS[id]} coin price`, COIN_LIMITS.price.min, COIN_LIMITS.price.max)],
    [featureKey(id, 'dailyUseCap'), range(`${FEATURE_LABELS[id]} coin uses per day`, COIN_LIMITS.dailyUseCap.min, COIN_LIMITS.dailyUseCap.max)],
  ]),
]);

export function toDraft(policy: UsagePolicy): PolicyDraft {
  const draft: PolicyDraft = {
    'coins.enabled': policy.coins.enabled,
    'coins.coinsPerAd': String(policy.coins.coinsPerAd),
    'coins.dailyEarnCap': String(policy.coins.dailyEarnCap),
    'coins.balanceCap': String(policy.coins.balanceCap),
  };
  for (const id of FEATURE_IDS) {
    draft[dailyKey(id)] = String(policy.dailyLimits[id]);
    draft[featureKey(id, 'enabled')] = policy.coins.features[id].enabled;
    draft[featureKey(id, 'price')] = String(policy.coins.features[id].price);
    draft[featureKey(id, 'dailyUseCap')] = String(policy.coins.features[id].dailyUseCap);
  }
  return draft;
}

/** Fields whose draft text is not a whole number in range, in display order. */
export function invalidFields(draft: PolicyDraft): string[] {
  return Object.entries(NUMBER_FIELDS).filter(([key, spec]) => {
    const text = String(draft[key] ?? '').trim();
    const value = Number(text);
    return !text || !Number.isInteger(value) || value < spec.min || value > spec.max;
  }).map(([key]) => key);
}

export function fromDraft(draft: PolicyDraft): UsagePolicy {
  const num = (key: string) => Number(String(draft[key]).trim());
  return parseCompleteUsagePolicy({
    dailyLimits: Object.fromEntries(FEATURE_IDS.map(id => [id, num(dailyKey(id))])),
    coins: {
      enabled: draft['coins.enabled'] === true,
      coinsPerAd: num('coins.coinsPerAd'),
      dailyEarnCap: num('coins.dailyEarnCap'),
      balanceCap: num('coins.balanceCap'),
      features: Object.fromEntries(FEATURE_IDS.map(id => [id, {
        enabled: draft[featureKey(id, 'enabled')] === true,
        price: num(featureKey(id, 'price')),
        dailyUseCap: num(featureKey(id, 'dailyUseCap')),
      }])),
    },
  });
}

/** Human label for a fallback path reported by GET /api/admin/usage. */
export function fallbackLabel(path: string): string {
  if (path === 'coins') return 'Coin settings (not saved yet)';
  if (path === 'coins.enabled') return 'Coins switch';
  const feature = /^coins\.features\.(\w+)\.enabled$/.exec(path)?.[1] as UsageFeatureId | undefined;
  if (feature && feature in USAGE_FEATURES) return `Coins allowed for ${FEATURE_LABELS[feature]}`;
  return NUMBER_FIELDS[path]?.label ?? path;
}
