import { describe, expect, it } from 'vitest';
import { createDefaultAdsConfig } from '@/lib/ads/config';
import { diagnoseAndroidHousePlacements, diagnoseWebPlacements } from '@/lib/ads/diagnostics';
import { defaultHouseConfig, type HouseConfig } from '@/lib/ads/house';
import { createDefaultProviderConfig } from '@/lib/ads/providers';
import type { AdCampaign, AdsConfig } from '@/lib/ads/types';

const NOW = Date.parse('2026-11-13T12:00:00.000Z');

function campaign(overrides: Partial<AdCampaign> = {}): AdCampaign {
  return {
    id: 'planner',
    name: 'Planner',
    placementIds: ['dashboard.overview'],
    deliveryMode: 'house',
    active: true,
    schedule: { startsAt: null, endsAt: null },
    weight: 1,
    frequencyCap: { maxImpressions: 3, windowHours: 24 },
    creative: { imageUrl: 'https://cdn.example.com/a.png', altText: 'Planner', headline: 'Plan', body: '', ctaLabel: 'Open' },
    linkUrl: 'https://example.com/planner',
    ...overrides,
  };
}

function ads(campaigns: AdCampaign[] = [campaign()], patch: Partial<AdsConfig> = {}): AdsConfig {
  return { ...createDefaultAdsConfig(), enabled: true, campaigns, ...patch };
}

const legacy = [{ id: 'old', imageUrl: 'https://cdn.example.com/old.png', linkUrl: '', isActive: true }];

function web(adsConfig: AdsConfig | null, legacyBanners: unknown[] | null = [], providerConfig = createDefaultProviderConfig()) {
  return diagnoseWebPlacements({ adsConfig, legacyBanners, providerConfig, now: NOW });
}
const dashboard = (result: ReturnType<typeof web>) => result.find((item) => item.placementId === 'dashboard.overview')!;

describe('web placement diagnostics', () => {
  it('reports the eligible house campaigns with weighted shares and per-browser visible-view caps', () => {
    const result = dashboard(web(ads([campaign(), campaign({ id: 'scanner', name: 'Scanner', weight: 3 })])));
    expect(result.outcome).toBe('house');
    expect(result.candidates.map(({ name, share }) => [name, share])).toEqual([['Planner', 25], ['Scanner', 75]]);
    expect(result.notes.join(' ')).toMatch(/3 views per 24 h/);
    expect(result.notes.join(' ')).toMatch(/at least half/i);
  });

  it('explains switch-level blockers even when campaigns would otherwise be eligible', () => {
    const off = dashboard(web(ads([campaign()], { enabled: false })));
    expect(off.outcome).toBe('none');
    expect(off.reasons.join(' ')).toMatch(/master switch is off/i);
    const placementOff = ads();
    placementOff.placements = placementOff.placements.map((item) => ({ ...item, enabled: false }));
    expect(dashboard(web(placementOff)).reasons.join(' ')).toMatch(/placement switch is off/i);
    expect(dashboard(web(ads([campaign()], { deliveryModes: { house: false, rewarded: false, thirdParty: false } }))).reasons.join(' '))
      .toMatch(/house \/ internal format is off/i);
  });

  it('treats a placement missing from an older saved configuration as off', () => {
    const older = ads([campaign({ placementIds: ['dashboard.overview'] })]);
    older.placements = older.placements.filter((item) => item.id === 'dashboard.overview');
    const results = web(older).find((item) => item.placementId === 'results.overview')!;
    expect(results.outcome).toBe('none');
    expect(results.reasons.join(' ')).toMatch(/not saved yet/i);
  });

  it('explains when no campaign is inside its schedule and reports the next change', () => {
    const result = dashboard(web(ads([
      campaign({ id: 'future', name: 'Future', schedule: { startsAt: '2026-11-20T00:00:00.000Z', endsAt: null } }),
      campaign({ id: 'past', name: 'Past', schedule: { startsAt: null, endsAt: '2026-11-01T00:00:00.000Z' } }),
      campaign({ id: 'draft', name: 'Draft', active: false }),
    ])));
    expect(result.outcome).toBe('none');
    const reasons = result.reasons.join(' ');
    expect(reasons).toMatch(/Future.*starts/);
    expect(reasons).toMatch(/Past.*ended/);
    expect(reasons).toMatch(/1 targeting campaign is not marked active/);
    expect(result.nextChangeAt).toBe('2026-11-20T00:00:00.000Z');
  });

  it('reports no eligible weight instead of claiming delivery when weights are zero', () => {
    const result = dashboard(web(ads([campaign({ weight: 0 })])));
    expect(result.outcome).toBe('none');
    expect(result.reasons.join(' ')).toMatch(/weight/i);
  });

  it('flags missing creative pieces on eligible campaigns', () => {
    const result = dashboard(web(ads([campaign({ linkUrl: '', creative: { imageUrl: '', altText: '', headline: 'Text only', body: '', ctaLabel: '' } })])));
    expect(result.candidates[0].warnings.join(' ')).toMatch(/no image/i);
    expect(result.candidates[0].warnings.join(' ')).toMatch(/no destination url/i);
    const noAlt = dashboard(web(ads([campaign({ creative: { ...campaign().creative, altText: '' } })])));
    expect(noAlt.candidates[0].warnings.join(' ')).toMatch(/alternative text/i);
  });

  it('uses legacy fallback when no campaign is eligible, independent of the house master switch', () => {
    const result = dashboard(web(ads([], { enabled: false }), legacy));
    expect(result.outcome).toBe('legacy');
    expect(result.summary).toMatch(/legacy/i);
    expect(result.notes.join(' ')).toMatch(/own active switches/i);
    expect(result.candidates).toEqual([expect.objectContaining({ source: 'legacy', share: 100 })]);
  });

  it('counts unsafe active legacy banners as skipped and keeps standby fallback separate', () => {
    const result = dashboard(web(ads(), [...legacy, { id: 'bad', imageUrl: 'http://cdn.example.com/x.png', linkUrl: '', isActive: true }]));
    expect(result.outcome).toBe('house');
    expect(result.notes.join(' ')).toMatch(/1 legacy banner .*standby/i);
    expect(result.warnings.join(' ')).toMatch(/1 active legacy banner is skipped/i);
  });

  it('never applies legacy banners to the Results placement', () => {
    const results = web(ads([], { enabled: true }), legacy).find((item) => item.placementId === 'results.overview')!;
    expect(results.outcome).toBe('none');
  });

  it('marks fallback status unknown when legacy banners or house settings are unavailable', () => {
    expect(dashboard(web(ads([], { enabled: false }), null)).warnings.join(' ')).toMatch(/legacy banners could not be checked/i);
    expect(dashboard(web(null, [])).outcome).toBe('unknown');
  });

  it('describes provider readiness without claiming approval or fill', () => {
    const providers = createDefaultProviderConfig();
    expect(dashboard(web(ads(), [], providers)).providers.map((item) => item.state)).toEqual(['off', 'off']);
    providers.adsense = { enabled: true, publisherId: 'ca-pub-1234567890123456', slotId: '123' };
    providers.adsterra = { enabled: true, smartLinkUrl: 'https://example.com/smart' };
    const enabled = dashboard(web(ads(), [], providers)).providers;
    expect(enabled.map((item) => item.state)).toEqual(['requested', 'requested']);
    expect(enabled[0].detail).toMatch(/cannot be verified/i);
    const incomplete = createDefaultProviderConfig();
    incomplete.adsense = { enabled: true, publisherId: '', slotId: '' };
    incomplete.adsterra = { enabled: true, smartLinkUrl: '' };
    const missing = dashboard(web(ads(), [], incomplete)).providers;
    expect(missing.map((item) => item.state)).toEqual(['incomplete', 'incomplete']);
    expect(missing[0].summary).toMatch(/publisher id/i);
    expect(missing[1].summary).toMatch(/smartlink/i);
    expect(dashboard(diagnoseWebPlacements({ adsConfig: ads(), legacyBanners: [], providerConfig: null, now: NOW })).providers[0].state).toBe('unavailable');
  });

  it('does not mount ad networks on the Results placement', () => {
    const providers = createDefaultProviderConfig();
    providers.adsterra = { enabled: true, smartLinkUrl: 'https://example.com/smart' };
    expect(web(ads(), [], providers).find((item) => item.placementId === 'results.overview')!.providers).toEqual([]);
  });
});

describe('Android house-promotion diagnostics', () => {
  const house = (patch: Partial<HouseConfig> = {}): HouseConfig => ({ ...defaultHouseConfig(), enabled: true, placements: { dashboard: true, results: true }, ...patch });
  const android = (config: HouseConfig | null, adsConfig: AdsConfig | null = ads(), legacyBanners: unknown[] | null = []) =>
    diagnoseAndroidHousePlacements({ houseConfig: config, adsConfig, legacyBanners, now: NOW });

  it('is off until the independent Android sharing and placement switches are on', () => {
    expect(android(house({ enabled: false }))[0]).toMatchObject({ outcome: 'none' });
    expect(android(house({ enabled: false }))[0].reasons.join(' ')).toMatch(/sharing switch is off/i);
    const resultsOff = android(house({ placements: { dashboard: true, results: false } }));
    expect(resultsOff.map((item) => item.outcome)).toEqual(['house', 'none']);
    expect(resultsOff[1].reasons.join(' ')).toMatch(/placement switch is off/i);
  });

  it('shares active dashboard-targeting house campaigns regardless of web switches', () => {
    const result = android(house(), ads([campaign()], { enabled: false }));
    expect(result[0].outcome).toBe('house');
    expect(result[0].notes.join(' ')).toMatch(/website .*switches do not apply/i);
    expect(result[0].notes.join(' ')).toMatch(/installation/i);
  });

  it('reports active campaigns that are not shared because they do not target web Dashboard overview', () => {
    const result = android(house(), ads([campaign({ placementIds: ['results.overview'] })]));
    expect(result[0].outcome).toBe('none');
    expect(result[0].reasons.join(' ')).toMatch(/1 active campaign .*Dashboard overview/i);
  });

  it('falls back to legacy only when the Android legacy switch is on', () => {
    expect(android(house(), ads([]), legacy)[0].outcome).toBe('legacy');
    const noLegacy = android(house({ includeLegacy: false }), ads([]), legacy)[0];
    expect(noLegacy.outcome).toBe('none');
    expect(noLegacy.reasons.join(' ')).toMatch(/legacy fallback is off/i);
  });

  it('reports unknown status when its configuration could not be loaded', () => {
    expect(android(null)[0].outcome).toBe('unknown');
    expect(android(house(), null)[0].outcome).toBe('unknown');
  });
});
