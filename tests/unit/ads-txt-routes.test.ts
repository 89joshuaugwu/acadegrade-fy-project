import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryTestDb } from './query-test-db';

const state = vi.hoisted(() => ({ db: null as any }));
vi.mock('@/lib/firebase/admin', () => ({ get adminDb() { return state.db; } }));

import { GET as adsTxt } from '@/app/ads.txt/route';
import { GET as appAdsTxt } from '@/app/app-ads.txt/route';
import { admobPublisherId, sellerLine } from '@/lib/platform/ads-txt';

let store: ReturnType<typeof queryTestDb>;
const providerConfig = (publisherId: string) => ({ version: 1, adsense: { enabled: false, publisherId, slotId: '' }, adsterra: { enabled: false, smartLinkUrl: 'https://secret.example/smartlink?key=PRIVATE' } });
beforeEach(() => { store = queryTestDb(); state.db = store.db; });
afterEach(() => { vi.unstubAllEnvs(); });

describe('seller lines', () => {
  it('formats the Google line and derives the AdMob publisher id from an App ID or ad unit', () => {
    expect(sellerLine('pub-1234567890123456')).toBe('google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0');
    expect(admobPublisherId({ settings: { admobAndroidAppId: 'ca-app-pub-2745430575041686~2976964736' } })).toBe('pub-2745430575041686');
    expect(admobPublisherId({ mobileAds: { rewardedUnitId: 'ca-app-pub-1111222233334444/1234567890' } })).toBe('pub-1111222233334444');
    // Google's public test publisher is never declared.
    expect(admobPublisherId({ mobileAds: { rewardedUnitId: 'ca-app-pub-3940256099942544/5224354917' } })).toBeNull();
    expect(admobPublisherId({})).toBeNull();
  });
});

describe('/ads.txt', () => {
  it('returns an empty plain-text 200 when nothing is configured', async () => {
    const response = await adsTxt();
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/plain; charset=utf-8');
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=300, s-maxage=300');
    expect(await response.text()).toBe('');
  });

  it('declares the AdSense publisher from stored provider settings without exposing anything else', async () => {
    store.docs.set('config/settings', { adsProviderConfig: providerConfig('ca-pub-1234567890123456') });
    const body = await (await adsTxt()).text();
    expect(body).toBe('google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0\n');
    expect(body).not.toContain('PRIVATE');
  });

  it('returns 503 without caching when storage is unavailable', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    state.db = { collection: () => ({ doc: () => ({ get: async () => { throw new Error('down'); } }) }) };
    const response = await adsTxt();
    expect(response.status).toBe(503);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    error.mockRestore();
  });
});

describe('/app-ads.txt', () => {
  it('uses the stored AdMob Android App ID first', async () => {
    store.docs.set('config/settings', { admobAndroidAppId: 'ca-app-pub-2745430575041686~2976964736' });
    store.docs.set('config/mobileAds', { rewardedUnitId: 'ca-app-pub-1111222233334444/1234567890' });
    expect(await (await appAdsTxt()).text()).toBe('google.com, pub-2745430575041686, DIRECT, f08c47fec0942fa0\n');
  });

  it('falls back to the ADMOB_ANDROID_APP_ID environment variable, then to live ad unit IDs', async () => {
    vi.stubEnv('ADMOB_ANDROID_APP_ID', 'ca-app-pub-5555666677778888~1234567890');
    expect(await (await appAdsTxt()).text()).toBe('google.com, pub-5555666677778888, DIRECT, f08c47fec0942fa0\n');
    vi.stubEnv('ADMOB_ANDROID_APP_ID', '');
    store.docs.set('config/mobileAds', { bannerUnitId: 'ca-app-pub-1111222233334444/1234567890', rewardedUnitId: '' });
    expect(await (await appAdsTxt()).text()).toBe('google.com, pub-1111222233334444, DIRECT, f08c47fec0942fa0\n');
  });

  it('returns an empty 200 when nothing is configured', async () => {
    const response = await appAdsTxt();
    expect(response.status).toBe(200);
    expect(await response.text()).toBe('');
  });
});
