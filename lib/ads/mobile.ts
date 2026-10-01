export interface MobileAdsConfig {
  version: 1;
  enabled: boolean;
  testMode: boolean;
  placements: { dashboard: boolean; results: boolean };
  bannerUnitId: string;
  dashboardBannerUnitId?: string;
  resultsBannerUnitId?: string;
  rewardedUnitId: string;
  rewardedEnabled?: boolean;
}

export function createDefaultMobileAdsConfig(): MobileAdsConfig {
  return {
    version: 1,
    enabled: false,
    testMode: true,
    placements: { dashboard: false, results: false },
    bannerUnitId: '',
    dashboardBannerUnitId: '',
    resultsBannerUnitId: '',
    rewardedUnitId: '',
    rewardedEnabled: false,
  };
}

function exactRecord(value: unknown, keys: string[], label: string, optional: string[] = []): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object.`);
  const result = value as Record<string, unknown>;
  if (Object.keys(result).some(key => !keys.includes(key) && !optional.includes(key)) || keys.some(key => !(key in result))) {
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
  const data = exactRecord(value, ['version', 'enabled', 'testMode', 'placements', 'bannerUnitId', 'rewardedUnitId'], 'Android ads', ['dashboardBannerUnitId', 'resultsBannerUnitId', 'rewardedEnabled']);
  const placements = exactRecord(data.placements, ['dashboard', 'results'], 'Android placements');
  if (data.version !== 1) throw new Error('Unsupported Android ads version.');
  if (typeof data.enabled !== 'boolean' || typeof data.testMode !== 'boolean' ||
    typeof placements.dashboard !== 'boolean' || typeof placements.results !== 'boolean') {
    throw new Error('Android ad switches must be boolean.');
  }
  const bannerUnitId = unit(data.bannerUnitId, 'Banner unit');
  const dashboardBannerUnitId = unit(data.dashboardBannerUnitId ?? bannerUnitId, 'Dashboard banner unit');
  const resultsBannerUnitId = unit(data.resultsBannerUnitId ?? bannerUnitId, 'Results banner unit');
  const rewardedUnitId = unit(data.rewardedUnitId, 'Rewarded unit');
  const rewardedEnabled = data.rewardedEnabled ?? false;
  if (typeof rewardedEnabled !== 'boolean') throw new Error('Rewarded switch must be boolean.');
  if (data.enabled && rewardedEnabled && !data.testMode && !rewardedUnitId) throw new Error('A Rewarded ad unit ID is required before live reward delivery.');
  if (data.enabled && !data.testMode) {
    if (placements.dashboard && !dashboardBannerUnitId) throw new Error('A Dashboard banner ad unit ID is required before live delivery.');
    if (placements.results && !resultsBannerUnitId) throw new Error('A Results banner ad unit ID is required before live delivery.');
  }
  return {
    version: 1, enabled: data.enabled, testMode: data.testMode,
    placements: { dashboard: placements.dashboard as boolean, results: placements.results as boolean },
    // Preserve the shared field for installed clients that predate placement IDs.
    bannerUnitId: dashboardBannerUnitId || resultsBannerUnitId, dashboardBannerUnitId, resultsBannerUnitId, rewardedUnitId, rewardedEnabled,
  };
}

export function deliveryMobileAdsConfig(config: MobileAdsConfig): MobileAdsConfig {
  return config.enabled ? config : { ...config, placements: { dashboard: false, results: false } };
}

export function safeMobileAdsConfig(value: unknown): MobileAdsConfig {
  try { return parseMobileAdsConfig(value); } catch { return createDefaultMobileAdsConfig(); }
}
