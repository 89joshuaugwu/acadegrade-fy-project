import { describe, expect, it } from 'vitest';
import { createDefaultAdsConfig } from '@/lib/ads/config';
import { buildHouseDelivery, defaultHouseConfig, parseHouseConfig } from '@/lib/ads/house';

export const campaign = { id: 'offer', name: 'Private campaign name', placementIds: ['dashboard.overview'], deliveryMode: 'house', active: true,
  schedule: { startsAt: '2026-01-01T00:00:00.000Z', endsAt: '2027-01-01T00:00:00.000Z' }, weight: 7,
  frequencyCap: { maxImpressions: 2, windowHours: 6 }, creative: { imageUrl: '', headline: 'Study offer', body: '', altText: '', ctaLabel: 'Read' }, linkUrl: 'https://example.com/' };
describe('Android house bridge', () => {
  it('is opt-in and rejects foreign fields and nonboolean switches', () => {
    expect(buildHouseDelivery(null, { advertBanners: [] }).campaigns).toEqual([]);
    expect(defaultHouseConfig()).toEqual({ version: 1, enabled: false, placements: { dashboard: true, results: false }, includeLegacy: true });
    expect(() => parseHouseConfig({ ...defaultHouseConfig(), testMode: true })).toThrow();
    expect(() => parseHouseConfig({ ...defaultHouseConfig(), includeLegacy: 'yes' })).toThrow();
    expect(() => parseHouseConfig({ ...defaultHouseConfig(), placements: { dashboard: true, results: false, ios: true } })).toThrow();
  });
  it('shares active safe creatives independently of web enablement without leaking settings', () => {
    const result = buildHouseDelivery({ ...defaultHouseConfig(), enabled: true }, { secret: 'secret', adsConfig: { ...createDefaultAdsConfig(), campaigns: [campaign] } });
    expect(result.campaigns).toHaveLength(1);
    expect(result.campaigns[0]).toEqual({ id: 'campaign:offer', schedule: campaign.schedule, weight: 7, frequencyCap: campaign.frequencyCap, creative: campaign.creative, linkUrl: campaign.linkUrl });
    expect(JSON.stringify(result)).not.toMatch(/Private campaign name|secret|placementIds|deliveryMode/);
  });
  it('keeps legacy as a separate safe fallback and honors its opt-out', () => {
    const settings = { adsConfig: { ...createDefaultAdsConfig(), campaigns: [campaign] }, advertBanners: [
      { id: 'offer', isActive: true, imageUrl: 'https://example.com/a.png', linkUrl: '' },
      { id: 'unsafe', isActive: true, imageUrl: 'http://example.com/a.png', linkUrl: 'javascript:alert(1)' },
    ] };
    expect(buildHouseDelivery({ ...defaultHouseConfig(), enabled: true }, settings).legacyCampaigns.map(c => c.id)).toEqual(['legacy:offer']);
    expect(buildHouseDelivery({ ...defaultHouseConfig(), enabled: true, includeLegacy: false }, settings).legacyCampaigns).toEqual([]);
    settings.adsConfig.campaigns[0] = { ...campaign, linkUrl: 'javascript:alert(1)' };
    expect(buildHouseDelivery({ ...defaultHouseConfig(), enabled: true }, settings).campaigns).toEqual([]);
  });
});
