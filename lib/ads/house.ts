import { legacyBannersToAdsConfig, safeParseAdsConfig } from './config';
import type { AdCampaign } from './types';

export interface HouseConfig {
  version: 1;
  enabled: boolean;
  placements: { dashboard: boolean; results: boolean };
  includeLegacy: boolean;
}
export type HouseCampaign = Pick<AdCampaign, 'id' | 'schedule' | 'weight' | 'frequencyCap' | 'creative' | 'linkUrl'>;
export interface HouseDelivery {
  version: 1;
  enabled: boolean;
  placements: HouseConfig['placements'];
  campaigns: HouseCampaign[];
  legacyCampaigns: HouseCampaign[];
}
export class HouseConfigError extends Error {}
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
export function defaultHouseConfig(): HouseConfig {
  return { version: 1, enabled: false, placements: { dashboard: true, results: false }, includeLegacy: true };
}
export function parseHouseConfig(value: unknown): HouseConfig {
  if (!record(value) || Object.keys(value).length !== 4 || Object.keys(value).some(k => !['version', 'enabled', 'placements', 'includeLegacy'].includes(k)) ||
    value.version !== 1 || typeof value.enabled !== 'boolean' || typeof value.includeLegacy !== 'boolean' || !record(value.placements) ||
    Object.keys(value.placements).length !== 2 || Object.keys(value.placements).some(k => !['dashboard', 'results'].includes(k)) ||
    typeof value.placements.dashboard !== 'boolean' || typeof value.placements.results !== 'boolean') {
    throw new HouseConfigError('Invalid Android house-promotion configuration.');
  }
  return { version: 1, enabled: value.enabled, includeLegacy: value.includeLegacy, placements: { dashboard: value.placements.dashboard, results: value.placements.results } };
}
export function safeHouseConfig(value: unknown): HouseConfig {
  try { return parseHouseConfig(value); } catch { return defaultHouseConfig(); }
}
function displayCampaign(campaign: AdCampaign, source: 'campaign' | 'legacy'): HouseCampaign {
  return { id: `${source}:${campaign.id}`, schedule: campaign.schedule, weight: campaign.weight, frequencyCap: campaign.frequencyCap, creative: campaign.creative, linkUrl: campaign.linkUrl };
}
export function buildHouseDelivery(rawConfig: unknown, rawSettings: unknown): HouseDelivery {
  const config = safeHouseConfig(rawConfig);
  const result: HouseDelivery = { version: 1, enabled: config.enabled, placements: config.placements, campaigns: [], legacyCampaigns: [] };
  if (!config.enabled || !record(rawSettings)) return result;
  const website = safeParseAdsConfig(rawSettings.adsConfig);
  // Android opts in independently; web's master/placement switches remain web-only.
  result.campaigns = (website?.campaigns ?? []).filter(c => c.active && c.deliveryMode === 'house' && c.placementIds.includes('dashboard.overview')).map(c => displayCampaign(c, 'campaign'));
  if (config.includeLegacy) {
    result.legacyCampaigns = (legacyBannersToAdsConfig(rawSettings.advertBanners)?.campaigns ?? []).slice(0, 24).map(c => displayCampaign(c, 'legacy'));
  }
  return result;
}
