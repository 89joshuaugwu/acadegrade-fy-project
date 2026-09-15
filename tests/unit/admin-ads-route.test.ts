import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultAdsConfig } from '@/lib/ads/config';

const firebase = vi.hoisted(() => ({
  verifyIdToken: vi.fn(),
  adminsGet: vi.fn(),
  settingsGet: vi.fn(),
  settingsSet: vi.fn(),
}));

vi.mock('@/lib/firebase/admin', () => ({
  adminAuth: { verifyIdToken: firebase.verifyIdToken },
  adminDb: {
    collection: () => ({
      doc: (name: string) => ({
        get: name === 'admins' ? firebase.adminsGet : firebase.settingsGet,
        set: firebase.settingsSet,
      }),
    }),
  },
}));

import { GET, PUT } from '@/app/api/admin/ads/route';

describe('/api/admin/ads', () => {
  beforeEach(() => {
    firebase.verifyIdToken.mockResolvedValue({ email: 'admin@acadegrade.example' });
    firebase.adminsGet.mockResolvedValue({
      data: () => ({ emails: ['admin@acadegrade.example'] }),
    });
    firebase.settingsGet.mockResolvedValue({
      exists: true,
      data: () => ({ adsConfig: createDefaultAdsConfig(), advertBanners: [{}, {}] }),
    });
    firebase.settingsSet.mockResolvedValue(undefined);
  });

  it('does not disclose ads configuration without an admin token', async () => {
    const response = await GET(new Request('https://acadegrade.example/api/admin/ads'));
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: 'Unauthorized' });
  });

  it('returns validated ads data and only a count for legacy banners', async () => {
    const response = await GET(new Request('https://acadegrade.example/api/admin/ads', {
      headers: { Authorization: 'Bearer valid-token' },
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      config: createDefaultAdsConfig(),
      legacyBannerCount: 2,
    });
  });

  it('validates and stores an additive adsConfig field without replacing settings', async () => {
    const config = { ...createDefaultAdsConfig(), enabled: true };
    const response = await PUT(new Request('https://acadegrade.example/api/admin/ads', {
      method: 'PUT',
      headers: {
        Authorization: 'Bearer valid-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ config }),
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ config });
    expect(firebase.settingsSet).toHaveBeenCalledWith(
      { adsConfig: config, updatedAt: expect.any(Date) },
      { merge: true }
    );
  });
});
