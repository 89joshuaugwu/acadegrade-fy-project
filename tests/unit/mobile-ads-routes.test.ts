import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ authorize: vi.fn(), get: vi.fn(), set: vi.fn() }));
vi.mock('@/lib/api/admin-auth', () => ({ requireAdmin: state.authorize }));
vi.mock('@/lib/firebase/admin', () => ({ adminDb: { collection: () => ({ doc: () => ({ get: state.get, set: state.set }) }) } }));

import { GET as publicGet } from '@/app/api/ads/mobile/route';
import { GET as adminGet, PUT as adminPut } from '@/app/api/admin/ads/mobile/route';

describe('Android ads routes', () => {
  beforeEach(() => {
    state.authorize.mockReset().mockResolvedValue({ uid: 'admin' });
    state.get.mockReset().mockResolvedValue({ exists: false, data: () => undefined });
    state.set.mockReset().mockResolvedValue(undefined);
  });

  it('serves no ads by default', async () => {
    expect(await (await publicGet()).json()).toMatchObject({ enabled: false, placements: { dashboard: false, results: false } });
  });

  it('fails closed when storage is unavailable', async () => {
    state.get.mockRejectedValueOnce(new Error('offline'));
    expect(await (await publicGet()).json()).toMatchObject({ enabled: false });
  });

  it('requires admin access to read and save', async () => {
    state.authorize.mockRejectedValue(Object.assign(new Error('Unauthorized'), { status: 401 }));
    expect((await adminGet(new Request('https://example.com/api/admin/ads/mobile'))).status).toBe(401);
    expect((await adminPut(new Request('https://example.com/api/admin/ads/mobile', { method: 'PUT', body: '{}' }))).status).toBe(401);
  });

  it('rejects live delivery without a unit', async () => {
    const response = await adminPut(new Request('https://example.com/api/admin/ads/mobile', { method: 'PUT', body: JSON.stringify({ config: {
      version: 1, enabled: true, testMode: false, placements: { dashboard: true, results: false }, bannerUnitId: '', rewardedUnitId: '',
    } }) }));
    expect(response.status).toBe(400);
    expect(state.set).not.toHaveBeenCalled();
  });

  it('saves explicit test delivery', async () => {
    const response = await adminPut(new Request('https://example.com/api/admin/ads/mobile', { method: 'PUT', body: JSON.stringify({ config: {
      version: 1, enabled: true, testMode: true, placements: { dashboard: true, results: false }, bannerUnitId: '', rewardedUnitId: '',
    } }) }));
    expect(response.status).toBe(200);
    expect(state.set).toHaveBeenCalledWith(expect.objectContaining({ enabled: true, testMode: true }));
  });
});
