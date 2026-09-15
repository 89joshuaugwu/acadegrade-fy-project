import { describe, expect, it } from 'vitest';
import type { AdsConfig, AdCampaign } from '@/lib/ads/types';
import {
  getEligibleCampaigns,
  pruneImpressionHistory,
  selectWeightedCampaign,
} from '@/lib/ads/delivery';

const NOW = Date.parse('2026-09-15T12:00:00.000Z');

function campaign(overrides: Partial<AdCampaign> = {}): AdCampaign {
  return {
    id: 'campaign-a',
    name: 'Campaign A',
    placementIds: ['dashboard.overview'],
    deliveryMode: 'house',
    active: true,
    schedule: { startsAt: null, endsAt: null },
    weight: 1,
    frequencyCap: { maxImpressions: 2, windowHours: 24 },
    creative: {
      imageUrl: '',
      altText: '',
      headline: 'Use AcadeGrade insights',
      body: 'Turn your current results into a focused plan.',
      ctaLabel: 'View insights',
    },
    linkUrl: 'https://acadegrade.example/insights',
    ...overrides,
  };
}

function config(campaigns: AdCampaign[], enabled = true): AdsConfig {
  return {
    version: 1,
    enabled,
    deliveryModes: { house: true, rewarded: false, thirdParty: false },
    placements: [
      { id: 'dashboard.overview', name: 'Dashboard overview', enabled: true },
    ],
    campaigns,
  };
}

describe('ad eligibility', () => {
  it('returns nothing when global delivery or the placement is disabled', () => {
    expect(getEligibleCampaigns(config([campaign()], false), 'dashboard.overview', { now: NOW }))
      .toEqual([]);

    const placementOff = config([campaign()]);
    placementOff.placements[0].enabled = false;
    expect(getEligibleCampaigns(placementOff, 'dashboard.overview', { now: NOW }))
      .toEqual([]);
  });

  it('excludes inactive, out-of-schedule, future-mode, and capped campaigns', () => {
    const eligible = campaign({ id: 'eligible' });
    const inactive = campaign({ id: 'inactive', active: false });
    const future = campaign({
      id: 'future',
      schedule: { startsAt: '2026-09-16T00:00:00.000Z', endsAt: null },
    });
    const rewarded = campaign({ id: 'rewarded', deliveryMode: 'rewarded' });
    const capped = campaign({ id: 'capped' });

    expect(getEligibleCampaigns(
      config([eligible, inactive, future, rewarded, capped]),
      'dashboard.overview',
      {
        now: NOW,
        impressionHistory: { capped: [NOW - 1_000, NOW - 2_000] },
      }
    ).map((item) => item.id)).toEqual(['eligible']);
  });
});

describe('deterministic weighted delivery', () => {
  it('returns the same weighted campaign for the same seed', () => {
    const campaigns = [
      campaign({ id: 'a', weight: 1 }),
      campaign({ id: 'b', weight: 3 }),
    ];

    expect(selectWeightedCampaign(campaigns, 'a')?.id).toBe('b');
    expect(selectWeightedCampaign([...campaigns].reverse(), 'a')?.id).toBe('b');
  });

  it('returns null for an empty campaign list', () => {
    expect(selectWeightedCampaign([], 'student-1')).toBeNull();
  });
});

describe('frequency history', () => {
  it('removes impressions outside the campaign window', () => {
    expect(pruneImpressionHistory(
      [NOW - (25 * 60 * 60 * 1000), NOW - (2 * 60 * 60 * 1000), NOW - 1_000],
      NOW,
      24
    )).toEqual([NOW - (2 * 60 * 60 * 1000), NOW - 1_000]);
  });
});
