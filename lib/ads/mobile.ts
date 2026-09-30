export interface MobileAdsConfig {
  version: 1;
  enabled: boolean;
  testMode: boolean;
  placements: { dashboard: boolean; results: boolean };
  bannerUnitId: string;
  rewardedUnitId: string;
}

export function createDefaultMobileAdsConfig(): MobileAdsConfig {
  return {
    version: 1,
    enabled: false,
    testMode: true,
    placements: { dashboard: false, results: false },
    bannerUnitId: '',
    rewardedUnitId: '',
  };
}

function exactRecord(value: unknown, keys: string[], label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object.`);
  const result = value as Record<string, unknown>;
  if (Object.keys(result).some(key => !keys.includes(key)) || keys.some(key => !(key in result))) {
    throw new Error(`${label} has missing or unsupported fields.`);
  }
  return result;
}

function unit(value: unknown, label: string): string {
  if (typeof value !== 'string') throw new Error(`${label} must be a string.`);
  const trimmed = value.trim();
  if (trimmed && !/^ca-app-pub-\d{16}\/\d{10}$/.test(trimmed)) throw new Error(`${label} must be an AdMob ad unit ID.`);
  return trimmed;
}

export function parseMobileAdsConfig(value: unknown): MobileAdsConfig {
  const data = exactRecord(value, ['version', 'enabled', 'testMode', 'placements', 'bannerUnitId', 'rewardedUnitId'], 'Android ads');
  const placements = exactRecord(data.placements, ['dashboard', 'results'], 'Android placements');
  if (data.version !== 1) throw new Error('Unsupported Android ads version.');
  if (typeof data.enabled !== 'boolean' || typeof data.testMode !== 'boolean' ||
    typeof placements.dashboard !== 'boolean' || typeof placements.results !== 'boolean') {
    throw new Error('Android ad switches must be boolean.');
  }
  const bannerUnitId = unit(data.bannerUnitId, 'Banner unit');
  const rewardedUnitId = unit(data.rewardedUnitId, 'Rewarded unit');
  if (data.enabled && !data.testMode && (placements.dashboard || placements.results) && !bannerUnitId) {
    throw new Error('A production banner unit is required before live banner delivery.');
  }
  return {
    version: 1, enabled: data.enabled, testMode: data.testMode,
    placements: { dashboard: placements.dashboard as boolean, results: placements.results as boolean },
    bannerUnitId, rewardedUnitId,
  };
}

export function deliveryMobileAdsConfig(config: MobileAdsConfig): MobileAdsConfig {
  return config.enabled ? config : { ...config, placements: { dashboard: false, results: false } };
}

export function safeMobileAdsConfig(value: unknown): MobileAdsConfig {
  try { return parseMobileAdsConfig(value); } catch { return createDefaultMobileAdsConfig(); }
}
