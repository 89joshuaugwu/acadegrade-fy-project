import { describe, expect, it } from 'vitest';
import {
  createDefaultAdsConfig,
  parseAdsConfig,
  safeParseAdsConfig,
} from '@/lib/ads/config';
import { parseAdminSettingsMutation } from '@/lib/admin/settings-schema';

function validConfig() {
  return {
    version: 1 as const,
    enabled: true,
    deliveryModes: {
      house: true,
      rewarded: false,
      thirdParty: false,
    },
    placements: [
      { id: 'dashboard.overview' as const, name: 'Dashboard overview', enabled: true },
      { id: 'results.summary' as const, name: 'Results summary', enabled: false },
    ],
    campaigns: [
      {
        id: 'study-planner',
        name: 'Study planner',
        placementIds: ['dashboard.overview' as const],
        deliveryMode: 'house' as const,
        active: true,
        schedule: { startsAt: '2026-09-01T00:00:00.000Z', endsAt: null },
        weight: 3,
        frequencyCap: { maxImpressions: 2, windowHours: 24 },
        creative: {
          imageUrl: 'https://cdn.example.com/study-planner.png',
          altText: 'A weekly academic planner',
          headline: 'Plan the week before it plans you',
          body: 'Build a focused study plan from your current courses.',
          ctaLabel: 'Open planner',
        },
        linkUrl: 'https://acadegrade.example/planner',
      },
    ],
  };
}

describe('ads configuration validation', () => {
  it('accepts and normalizes a safe house-ad configuration', () => {
    const parsed = parseAdsConfig(validConfig());

    expect(parsed.campaigns[0]).toMatchObject({
      id: 'study-planner',
      deliveryMode: 'house',
      linkUrl: 'https://acadegrade.example/planner',
    });
    expect(parsed.deliveryModes).toEqual({
      house: true,
      rewarded: false,
      thirdParty: false,
    });
  });

  it('rejects unsafe links, unknown fields, and duplicate campaign IDs', () => {
    const unsafe = validConfig();
    unsafe.campaigns[0].linkUrl = 'javascript:alert(1)';
    expect(() => parseAdsConfig(unsafe)).toThrow('linkUrl must be an HTTPS URL');

    expect(() => parseAdsConfig({ ...validConfig(), secretApiKey: 'do-not-store-here' }))
      .toThrow('Unsupported ads configuration field: secretApiKey');

    const duplicate = validConfig();
    duplicate.campaigns.push({ ...duplicate.campaigns[0] });
    expect(() => parseAdsConfig(duplicate)).toThrow('Campaign IDs must be unique');
  });

  it('keeps rewarded and third-party delivery disabled', () => {
    const futureMode: any = validConfig();
    futureMode.deliveryModes.rewarded = true;
    expect(() => parseAdsConfig(futureMode)).toThrow('Rewarded delivery is not available yet');

    const futureCampaign: any = validConfig();
    futureCampaign.campaigns[0].deliveryMode = 'rewarded';
    expect(() => parseAdsConfig(futureCampaign)).toThrow('Only house campaigns can be enabled');
  });

  it('rejects invalid placement references, schedules, weights, and caps', () => {
    const missingPlacement: any = validConfig();
    missingPlacement.campaigns[0].placementIds = ['ocr.result'];
    expect(() => parseAdsConfig(missingPlacement)).toThrow('references a disabled or missing placement');

    const reversedSchedule: any = validConfig();
    reversedSchedule.campaigns[0].schedule = {
      startsAt: '2026-09-02T00:00:00.000Z',
      endsAt: '2026-09-01T00:00:00.000Z',
    };
    expect(() => parseAdsConfig(reversedSchedule)).toThrow('must end after it starts');

    const zeroWeight = validConfig();
    zeroWeight.campaigns[0].weight = 0;
    expect(() => parseAdsConfig(zeroWeight)).toThrow('weight must be between 1 and 100');

    const invalidCap = validConfig();
    invalidCap.campaigns[0].frequencyCap.maxImpressions = 0;
    expect(() => parseAdsConfig(invalidCap)).toThrow('maxImpressions must be between 1 and 100');
  });

  it('fails closed at the public runtime boundary', () => {
    expect(safeParseAdsConfig({ enabled: true, campaigns: 'all' })).toBeNull();
    expect(safeParseAdsConfig(null)).toBeNull();
  });

  it('creates an inert default and allows the safe settings endpoint to store adsConfig', () => {
    const config = createDefaultAdsConfig();
    expect(config.enabled).toBe(false);
    expect(config.campaigns).toEqual([]);

    expect(parseAdminSettingsMutation({ field: 'adsConfig', value: config })).toEqual({
      target: 'settings',
      data: { adsConfig: config },
    });
  });
});
