import { describe, expect, it } from 'vitest';
import { createDefaultMobileAdsConfig, parseMobileAdsConfig, deliveryMobileAdsConfig } from '@/lib/ads/mobile';

describe('Android ad configuration', () => {
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
});
