export const AD_PLACEMENT_IDS = [
  'dashboard.overview',
  'results.summary',
  'ocr.result',
  'insights.summary',
] as const;

export type AdPlacementId = typeof AD_PLACEMENT_IDS[number];
export type AdDeliveryMode = 'house' | 'rewarded' | 'third-party';

export interface AdPlacementConfig {
  id: AdPlacementId;
  name: string;
  enabled: boolean;
}

export interface AdCreative {
  imageUrl: string;
  altText: string;
  headline: string;
  body: string;
  ctaLabel: string;
}

export interface AdCampaign {
  id: string;
  name: string;
  placementIds: AdPlacementId[];
  deliveryMode: AdDeliveryMode;
  active: boolean;
  schedule: {
    startsAt: string | null;
    endsAt: string | null;
  };
  weight: number;
  frequencyCap: {
    maxImpressions: number;
    windowHours: number;
  };
  creative: AdCreative;
  linkUrl: string;
}

export interface AdsConfig {
  version: 1;
  enabled: boolean;
  deliveryModes: {
    house: boolean;
    rewarded: false;
    thirdParty: false;
  };
  placements: AdPlacementConfig[];
  campaigns: AdCampaign[];
}

export type AdImpressionHistory = Record<string, number[]>;
