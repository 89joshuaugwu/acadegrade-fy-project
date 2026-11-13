import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultAdsConfig } from '@/lib/ads/config';
import { safeHouseConfig } from '@/lib/ads/house';
import { createDefaultMobileAdsConfig } from '@/lib/ads/mobile';
import { safeParseProviderConfig } from '@/lib/ads/providers';

const state = vi.hoisted(() => ({
  verifyIdToken: vi.fn(),
  docs: new Map<string, Record<string, unknown> | undefined>(),
  set: vi.fn(),
  audit: vi.fn(),
  requireAdmin: vi.fn(),
}));

vi.mock('@/lib/firebase/admin', () => ({
  adminAuth: { verifyIdToken: state.verifyIdToken },
  adminDb: {
    collection: () => ({
      doc: (name: string) => ({
        get: async () => ({ exists: state.docs.has(name), data: () => state.docs.get(name) }),
        set: (...args: unknown[]) => state.set(name, ...args),
      }),
    }),
  },
}));
vi.mock('@/lib/api/admin-audit', () => ({ writeAdminAudit: state.audit }));
vi.mock('@/lib/api/admin-auth', () => ({ requireAdmin: state.requireAdmin }));

import { PUT as putAds } from '@/app/api/admin/ads/route';
import { PUT as putHouse } from '@/app/api/admin/ads/house/route';
import { PUT as putMobile } from '@/app/api/admin/ads/mobile/route';
import { PUT as putIos } from '@/app/api/admin/ads/ios/route';
import { PUT as putProviders } from '@/app/api/admin/ads/providers/route';

const ADMIN = { uid: 'admin-uid', email: 'admin@acadegrade.example' };

function put(body: unknown) {
  return new Request('https://acadegrade.example/api/admin/ads', {
    method: 'PUT',
    headers: { Authorization: 'Bearer token', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('admin ads routes write an audit entry on every successful save', () => {
  beforeEach(() => {
    state.docs.clear();
    state.set.mockReset().mockResolvedValue(undefined);
    state.audit.mockReset().mockResolvedValue(undefined);
    state.requireAdmin.mockReset().mockResolvedValue(ADMIN);
    state.verifyIdToken.mockReset().mockResolvedValue({ uid: ADMIN.uid, email: 'Admin@AcadeGrade.example' });
    state.docs.set('admins', { emails: [ADMIN.email] });
  });

  it('house campaigns (web)', async () => {
    const before = createDefaultAdsConfig();
    state.docs.set('settings', { adsConfig: before });
    const response = await putAds(put({ config: createDefaultAdsConfig() }));
    expect(response.status).toBe(200);
    expect(state.audit).toHaveBeenCalledWith(expect.objectContaining({
      actorEmail: ADMIN.email, actorUid: ADMIN.uid, action: 'ads.web-house.update', target: 'config/settings.adsConfig',
    }));
  });

  it('Android house promotions', async () => {
    const config = safeHouseConfig(undefined);
    const response = await putHouse(put({ config }));
    expect(response.status).toBe(200);
    expect(state.audit).toHaveBeenCalledWith(expect.objectContaining({
      actorEmail: ADMIN.email, action: 'ads.android-house.update', target: 'config/mobileHouseAds',
    }));
  });

  it('Android AdMob', async () => {
    const response = await putMobile(put({ config: createDefaultMobileAdsConfig() }));
    expect(response.status).toBe(200);
    expect(state.audit).toHaveBeenCalledWith(expect.objectContaining({
      actorEmail: ADMIN.email, action: 'ads.android-admob.update', target: 'config/mobileAds',
    }));
  });

  it('iOS ads', async () => {
    const response = await putIos(put({ config: createDefaultMobileAdsConfig() }));
    expect(response.status).toBe(200);
    expect(state.audit).toHaveBeenCalledWith(expect.objectContaining({
      actorEmail: ADMIN.email, action: 'ads.ios.update', target: 'config/iosAds',
    }));
  });

  it('web ad networks', async () => {
    const response = await putProviders(put({ config: safeParseProviderConfig(undefined) }));
    expect(response.status).toBe(200);
    expect(state.audit).toHaveBeenCalledWith(expect.objectContaining({
      actorEmail: ADMIN.email, actorUid: ADMIN.uid, action: 'ads.web-providers.update', target: 'config/settings.adsProviderConfig',
    }));
  });

  it('does not audit a rejected save', async () => {
    const response = await putMobile(put({ config: createDefaultMobileAdsConfig(), extra: true }));
    expect(response.status).toBe(400);
    expect(state.audit).not.toHaveBeenCalled();
  });
});
