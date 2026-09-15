import type {
  AdCampaign,
  AdImpressionHistory,
  AdPlacementId,
  AdsConfig,
} from './types';

interface EligibilityContext {
  now?: number;
  impressionHistory?: AdImpressionHistory;
}

export function pruneImpressionHistory(timestamps: number[], now: number, windowHours: number) {
  const cutoff = now - (windowHours * 60 * 60 * 1_000);
  return timestamps.filter((timestamp) => (
    Number.isFinite(timestamp) && timestamp >= cutoff && timestamp <= now
  ));
}

export function getEligibleCampaigns(
  config: AdsConfig,
  placementId: AdPlacementId,
  context: EligibilityContext = {}
) {
  const now = context.now ?? Date.now();
  const placement = config.placements.find((item) => item.id === placementId);
  if (!config.enabled || !config.deliveryModes.house || !placement?.enabled) return [];

  return config.campaigns.filter((campaign) => {
    if (!campaign.active || campaign.deliveryMode !== 'house') return false;
    if (!campaign.placementIds.includes(placementId)) return false;

    const startsAt = campaign.schedule.startsAt ? Date.parse(campaign.schedule.startsAt) : null;
    const endsAt = campaign.schedule.endsAt ? Date.parse(campaign.schedule.endsAt) : null;
    if (startsAt !== null && now < startsAt) return false;
    if (endsAt !== null && now >= endsAt) return false;

    const recentImpressions = pruneImpressionHistory(
      context.impressionHistory?.[campaign.id] ?? [],
      now,
      campaign.frequencyCap.windowHours
    );
    return recentImpressions.length < campaign.frequencyCap.maxImpressions;
  });
}

function stableSeedValue(seed: string) {
  let value = 0;
  for (const character of seed) value = (value + character.charCodeAt(0)) >>> 0;
  return value;
}

export function selectWeightedCampaign(campaigns: AdCampaign[], seed: string): AdCampaign | null {
  if (campaigns.length === 0) return null;
  const sorted = [...campaigns].sort((left, right) => left.id.localeCompare(right.id));
  const totalWeight = sorted.reduce((total, campaign) => total + campaign.weight, 0);
  let selectedPoint = stableSeedValue(seed) % totalWeight;

  for (const campaign of sorted) {
    if (selectedPoint < campaign.weight) return campaign;
    selectedPoint -= campaign.weight;
  }
  return sorted.at(-1) ?? null;
}
