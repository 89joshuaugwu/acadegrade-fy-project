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
      warnings: [],
    });
  });

  it('keeps valid stored campaigns and reports any that cannot be served', async () => {
    const stored = createDefaultAdsConfig();
    const valid = {
      id: 'valid', name: 'Valid', placementIds: ['dashboard.overview'], deliveryMode: 'house', active: true,
      schedule: { startsAt: null, endsAt: null }, weight: 1, frequencyCap: { maxImpressions: 1, windowHours: 6 },
      creative: { imageUrl: '', altText: '', headline: 'Valid', body: '', ctaLabel: '' }, linkUrl: '',
    };
    firebase.settingsGet.mockResolvedValue({
      exists: true,
      data: () => ({ adsConfig: { ...stored, campaigns: [valid, { ...valid, id: 'bad', name: 'Credentialed', linkUrl: 'https://u:p@example.com/' }] } }),
    });
    const response = await GET(new Request('https://acadegrade.example/api/admin/ads', { headers: { Authorization: 'Bearer valid-token' } }));
    const body = await response.json();
    expect(body.config.campaigns.map((campaign: { id: string }) => campaign.id)).toEqual(['valid']);
    expect(body.warnings).toEqual([expect.stringMatching(/Credentialed.*username or password/)]);
  });

  it('warns instead of silently showing defaults when the stored configuration is unreadable', async () => {
    firebase.settingsGet.mockResolvedValue({ exists: true, data: () => ({ adsConfig: { version: 2 } }) });
    const response = await GET(new Request('https://acadegrade.example/api/admin/ads', { headers: { Authorization: 'Bearer valid-token' } }));
    const body = await response.json();
    expect(body.config).toEqual(createDefaultAdsConfig());
    expect(body.warnings).toEqual([expect.stringMatching(/could not be read/i)]);
  });

  it('rejects campaign URLs with embedded credentials on save', async () => {
    const config = createDefaultAdsConfig();
    const response = await PUT(new Request('https://acadegrade.example/api/admin/ads', {
      method: 'PUT',
      headers: { Authorization: 'Bearer valid-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ config: { ...config, campaigns: [{
        id: 'bad', name: 'Bad', placementIds: ['dashboard.overview'], deliveryMode: 'house', active: false,
        schedule: { startsAt: null, endsAt: null }, weight: 1, frequencyCap: { maxImpressions: 1, windowHours: 6 },
        creative: { imageUrl: '', altText: '', headline: 'Bad', body: '', ctaLabel: '' }, linkUrl: 'https://u:p@example.com/',
      }] } }),
    }));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'Campaign 1 linkUrl must not include a username or password' });
    expect(firebase.settingsSet).not.toHaveBeenCalled();
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
