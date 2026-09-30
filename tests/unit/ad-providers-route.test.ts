import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultProviderConfig } from '@/lib/ads/providers';

const firebase = vi.hoisted(() => ({ verify: vi.fn(), admins: vi.fn(), settings: vi.fn(), set: vi.fn() }));
vi.mock('@/lib/firebase/admin', () => ({
  adminAuth: { verifyIdToken: firebase.verify },
  adminDb: { collection: () => ({ doc: (name: string) => ({ get: name === 'admins' ? firebase.admins : firebase.settings, set: firebase.set }) }) },
}));
import { GET as adminGet, PUT } from '@/app/api/admin/ads/providers/route';
import { GET as publicGet } from '@/app/api/ads/providers/route';

describe('provider routes', () => {
  beforeEach(() => {
    firebase.verify.mockResolvedValue({ email: 'admin@example.com' });
    firebase.admins.mockResolvedValue({ data: () => ({ emails: ['admin@example.com'] }) });
    firebase.settings.mockResolvedValue({ data: () => ({}) });
    firebase.set.mockResolvedValue(undefined);
  });
  it('requires admin authentication for settings', async () => {
    expect((await adminGet(new Request('https://example.com/api/admin/ads/providers'))).status).toBe(401);
  });
  it('returns safe defaults publicly', async () => {
    await expect((await publicGet()).json()).resolves.toEqual({ config: createDefaultProviderConfig() });
  });
  it('saves only the separate provider field', async () => {
    const config = createDefaultProviderConfig();
    const response = await PUT(new Request('https://example.com/api/admin/ads/providers', { method: 'PUT', headers: { Authorization: 'Bearer token' }, body: JSON.stringify({ config }) }));
    expect(response.status).toBe(200);
    expect(firebase.set).toHaveBeenCalledWith({ adsProviderConfig: config, updatedAt: expect.any(Date) }, { merge: true });
  });
  it('rejects unsafe SmartLinks', async () => {
    const config = createDefaultProviderConfig();
    config.adsterra.smartLinkUrl = 'javascript:alert(1)';
    const response = await PUT(new Request('https://example.com/api/admin/ads/providers', { method: 'PUT', headers: { Authorization: 'Bearer token' }, body: JSON.stringify({ config }) }));
    expect(response.status).toBe(400);
    expect(firebase.set).not.toHaveBeenCalled();
  });
});
