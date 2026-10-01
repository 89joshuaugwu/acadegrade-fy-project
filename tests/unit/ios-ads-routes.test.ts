import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ authorize: vi.fn(), doc: vi.fn(), get: vi.fn(), set: vi.fn() }));
vi.mock('@/lib/api/admin-auth', () => ({ requireAdmin: state.authorize }));
vi.mock('@/lib/firebase/admin', () => ({ adminDb: { collection: () => ({ doc: state.doc }) } }));
import { GET as publicGet } from '@/app/api/ads/ios/route';
import { GET as adminGet, PUT as adminPut } from '@/app/api/admin/ads/ios/route';
import { createDefaultMobileAdsConfig } from '@/lib/ads/mobile';

describe('iOS ad settings', () => {
  beforeEach(() => {
    state.authorize.mockReset().mockResolvedValue({ uid: 'admin' });
    state.get.mockReset().mockResolvedValue({ exists: false, data: () => undefined });
    state.set.mockReset().mockResolvedValue(undefined);
    state.doc.mockReset().mockReturnValue({ get: state.get, set: state.set });
  });

  it('starts off and reads only the iOS record', async () => {
    expect(await (await publicGet()).json()).toMatchObject({ enabled: false, testMode: true, placements: { dashboard: false, results: false } });
    expect(state.doc).toHaveBeenCalledWith('iosAds');
    expect(state.doc).not.toHaveBeenCalledWith('mobileAds');
  });

  it('protects admin reads and writes', async () => {
    state.authorize.mockRejectedValue(Object.assign(new Error('Unauthorized'), { status: 401 }));
    expect((await adminGet(new Request('https://example.com/api/admin/ads/ios'))).status).toBe(401);
    expect((await adminPut(new Request('https://example.com/api/admin/ads/ios', { method: 'PUT', body: '{}' }))).status).toBe(401);
    expect(state.set).not.toHaveBeenCalled();
  });

  it('saves and delivers separate iOS placement units', async () => {
    const config = { ...createDefaultMobileAdsConfig(), enabled: true, testMode: false,
      placements: { dashboard: true, results: true }, dashboardBannerUnitId: 'ca-app-pub-1111111111111111/1111111111',
      resultsBannerUnitId: 'ca-app-pub-1111111111111111/2222222222' };
    expect((await adminPut(new Request('https://example.com/api/admin/ads/ios', { method: 'PUT', body: JSON.stringify({ config }) }))).status).toBe(200);
    const saved = state.set.mock.calls[0][0];
    expect(saved).toMatchObject({ dashboardBannerUnitId: config.dashboardBannerUnitId, resultsBannerUnitId: config.resultsBannerUnitId });
    expect(state.doc.mock.calls.every(([id]) => id === 'iosAds')).toBe(true);
    state.get.mockResolvedValue({ exists: true, data: () => saved });
    expect(await (await publicGet()).json()).toMatchObject({ resultsBannerUnitId: config.resultsBannerUnitId });
  });

  it('rejects incomplete live settings and returns no delivery when storage fails', async () => {
    const response = await adminPut(new Request('https://example.com/api/admin/ads/ios', { method: 'PUT', body: JSON.stringify({ config: {
      ...createDefaultMobileAdsConfig(), enabled: true, testMode: false, placements: { dashboard: false, results: true },
    } }) }));
    expect(response.status).toBe(400);
    expect(state.set).not.toHaveBeenCalled();
    state.get.mockRejectedValue(new Error('offline'));
    expect(await (await publicGet()).json()).toMatchObject({ enabled: false });
    expect((await adminGet(new Request('https://example.com/api/admin/ads/ios'))).status).toBe(500);
  });
});
