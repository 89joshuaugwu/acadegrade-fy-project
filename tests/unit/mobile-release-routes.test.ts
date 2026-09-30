import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ authorize: vi.fn(), get: vi.fn(), set: vi.fn() }));
vi.mock('@/lib/api/admin-auth', () => ({ requireAdmin: state.authorize }));
vi.mock('@/lib/firebase/admin', () => ({ adminDb: { collection: () => ({ doc: () => ({ get: state.get, set: state.set }) }) } }));

import { GET as publicGet } from '@/app/api/mobile-release/route';
import { GET as adminGet, PUT as adminPut } from '@/app/api/admin/mobile-release/route';

describe('Android release routes', () => {
  beforeEach(() => {
    state.authorize.mockReset().mockResolvedValue({ uid: 'admin' });
    state.get.mockReset().mockResolvedValue({ exists: false });
    state.set.mockReset().mockResolvedValue(undefined);
  });

  it('serves disabled defaults to the app', async () => {
    const response = await publicGet();
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ enabled: false, latestBuild: 0 });
  });

  it('requires admin access to read settings', async () => {
    state.authorize.mockRejectedValueOnce(Object.assign(new Error('Unauthorized'), { status: 401 }));
    expect((await adminGet(new Request('https://example.com/api/admin/mobile-release'))).status).toBe(401);
  });

  it('refuses an enabled release with an HTTP download link', async () => {
    const response = await adminPut(new Request('https://example.com/api/admin/mobile-release', { method: 'PUT', body: JSON.stringify({
      enabled: true, latestVersion: '1.1.0', latestBuild: 2, allowIgnore: false, headline: 'Update', message: 'New', imageUrl: '', downloadUrl: 'http://example.com/app.apk',
    }) }));
    expect(response.status).toBe(400);
    expect(state.set).not.toHaveBeenCalled();
  });

  it('saves a valid optional release without enabling it automatically', async () => {
    const response = await adminPut(new Request('https://example.com/api/admin/mobile-release', { method: 'PUT', body: JSON.stringify({
      enabled: false, latestVersion: '1.1.0', latestBuild: 2, allowIgnore: true, headline: 'Update', message: 'New', imageUrl: '', downloadUrl: 'https://example.com/app.apk',
    }) }));
    expect(response.status).toBe(200);
    expect(state.set).toHaveBeenCalledWith(expect.objectContaining({ enabled: false, latestBuild: 2 }));
  });
});
