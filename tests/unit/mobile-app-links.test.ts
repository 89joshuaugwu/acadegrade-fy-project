import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ settings: undefined as unknown, fail: false }));
vi.mock('@/lib/firebase/admin', () => ({
  adminDb: {
    collection: () => ({
      doc: () => ({
        get: async () => {
          if (state.fail) throw new Error('firestore down');
          return { data: () => state.settings };
        },
      }),
    }),
  },
}));

import {
  DEFAULT_ANDROID_DOWNLOAD_URL, androidDownloadResponse, getAndroidDownloadUrl, getMobileAppLinksSafe, resolveMobileAppLinks,
} from '@/lib/mobile-app-links';

beforeEach(() => { state.settings = undefined; state.fail = false; });

describe('resolveMobileAppLinks', () => {
  it('returns trimmed links, the size and the Play link', () => {
    expect(resolveMobileAppLinks({ androidUrl: ' https://x.example/a.apk ', iosUrl: '', androidSizeMb: 45, playUrl: 'https://play.google.com/store/apps/details?id=a' }))
      .toEqual({ androidUrl: 'https://x.example/a.apk', iosUrl: '', androidSizeMb: 45, playUrl: 'https://play.google.com/store/apps/details?id=a' });
  });

  it('treats missing or malformed values as unset', () => {
    expect(resolveMobileAppLinks({ androidSizeMb: '45', playUrl: 'https://evil.example/x' }))
      .toEqual({ androidUrl: DEFAULT_ANDROID_DOWNLOAD_URL, iosUrl: '', androidSizeMb: null, playUrl: '' });
    expect(resolveMobileAppLinks(null).androidUrl).toBe(DEFAULT_ANDROID_DOWNLOAD_URL);
  });
});

describe('/app/download/android helper', () => {
  it('redirects to the admin-set APK with no-store', async () => {
    state.settings = { mobileAppLinks: { androidUrl: 'https://x.example/v2.apk' } };
    const response = await androidDownloadResponse();
    expect(response.status).toBe(307);
    expect(response.headers.get('Location')).toBe('https://x.example/v2.apk');
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });

  it('falls back to the default APK when Firestore cannot be read', async () => {
    state.fail = true;
    expect(await getAndroidDownloadUrl()).toBe(DEFAULT_ANDROID_DOWNLOAD_URL);
    expect((await getMobileAppLinksSafe()).androidSizeMb).toBeNull();
    const response = await androidDownloadResponse();
    expect(response.status).toBe(307);
    expect(response.headers.get('Location')).toBe(DEFAULT_ANDROID_DOWNLOAD_URL);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });
});
