import { describe, expect, it } from 'vitest';
import { createDefaultMobileAdsConfig, parseMobileAdsConfig, deliveryMobileAdsConfig } from '@/lib/ads/mobile';

describe('Android ad configuration', () => {
  const dashboard = 'ca-app-pub-1111111111111111/1111111111';
  const results = 'ca-app-pub-1111111111111111/2222222222';

  it('preserves distinct placement IDs and the shared field for older apps', () => {
    const config = parseMobileAdsConfig({ ...createDefaultMobileAdsConfig(), enabled: true, testMode: false,
      placements: { dashboard: true, results: true }, dashboardBannerUnitId: dashboard, resultsBannerUnitId: results });
    expect(config).toMatchObject({ dashboardBannerUnitId: dashboard, resultsBannerUnitId: results, bannerUnitId: dashboard });
  });

  it('migrates an existing shared unit to both placements', () => {
    const { dashboardBannerUnitId, resultsBannerUnitId, ...legacy } = createDefaultMobileAdsConfig();
    expect(parseMobileAdsConfig({ ...legacy, bannerUnitId: dashboard })).toMatchObject({ dashboardBannerUnitId: dashboard, resultsBannerUnitId: dashboard });
  });

  it('requires a unit for each selected live placement but permits disabled placements to be empty', () => {
    const config = { ...createDefaultMobileAdsConfig(), enabled: true, testMode: false, dashboardBannerUnitId: dashboard };
    expect(() => parseMobileAdsConfig({ ...config, placements: { dashboard: true, results: true } })).toThrow('Results');
    expect(() => parseMobileAdsConfig({ ...config, placements: { dashboard: true, results: false } })).not.toThrow();
    expect(() => parseMobileAdsConfig({ ...config, resultsBannerUnitId: 'bad' })).toThrow('Results');
  });
  it('defaults to no delivery and test units', () => {
    const config = createDefaultMobileAdsConfig();
    expect(config.enabled).toBe(false);
    expect(config.testMode).toBe(true);
    expect(deliveryMobileAdsConfig(config).placements).toEqual({ dashboard: false, results: false });
  });

  it('cannot activate live ads without a production banner unit', () => {
    expect(() => parseMobileAdsConfig({ ...createDefaultMobileAdsConfig(), enabled: true, testMode: false, placements: { dashboard: true, results: false } })).toThrow();
  });

  it('accepts explicit test delivery and validates unit format', () => {
    const config = parseMobileAdsConfig({ ...createDefaultMobileAdsConfig(), enabled: true, placements: { dashboard: true, results: false } });
    expect(deliveryMobileAdsConfig(config).placements.dashboard).toBe(true);
    expect(() => parseMobileAdsConfig({ ...config, bannerUnitId: 'javascript:alert(1)' })).toThrow();
  });

  it('rejects unknown fields', () => {
    expect(() => parseMobileAdsConfig({ ...createDefaultMobileAdsConfig(), secret: 'x' })).toThrow();
  });
  it('requires an explicit rewarded opt-in and a unit for live rewards', () => {
    const defaults = createDefaultMobileAdsConfig();
    expect(defaults.rewardedEnabled).toBe(false);
    expect(() => parseMobileAdsConfig({ ...defaults, rewardedEnabled: 'true' })).toThrow();
    expect(() => parseMobileAdsConfig({ ...defaults, enabled: true, testMode: false, rewardedEnabled: true })).toThrow('Rewarded');
    expect(parseMobileAdsConfig({ ...defaults, enabled: true, testMode: false, rewardedEnabled: true, rewardedUnitId: results }).rewardedEnabled).toBe(true);
  });
});
