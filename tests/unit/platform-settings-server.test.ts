import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryTestDb } from './query-test-db';

const state = vi.hoisted(() => ({ db: null as any }));
vi.mock('@/lib/firebase/admin', () => ({ get adminDb() { return state.db; } }));

import {
  checkPlatformAccess,
  getPlatformSettings,
  invalidatePlatformSettingsCache,
  normalizePlatformSettings,
  PLATFORM_SETTINGS_CACHE_MS,
} from '@/lib/platform/settings-server';

let store: ReturnType<typeof queryTestDb>;
beforeEach(() => {
  store = queryTestDb(); state.db = store.db;
  invalidatePlatformSettingsCache();
});
afterEach(() => { vi.useRealTimers(); });

describe('platform settings normalisation', () => {
  it('defaults to open access and enforcing the unknown-age gate', () => {
    expect(normalizePlatformSettings(undefined)).toEqual({
      maintenanceMode: false, disabledFeatures: [], announcementBanner: null, ageGate: { enforceUnknown: true },
    });
  });

  it('keeps only known feature ids and valid fields', () => {
    expect(normalizePlatformSettings({
      maintenanceMode: true, disabledFeatures: ['ai_forecast', 'nope', 3], announcementBanner: 'Hi', ageGate: { enforceUnknown: false },
    })).toEqual({ maintenanceMode: true, disabledFeatures: ['ai_forecast'], announcementBanner: 'Hi', ageGate: { enforceUnknown: false } });
    expect(normalizePlatformSettings({ maintenanceMode: 'yes', ageGate: { enforceUnknown: 'no' } })).toMatchObject({ maintenanceMode: false, ageGate: { enforceUnknown: true } });
  });
});

describe('cached platform settings reads', () => {
  it('reuses one read for the cache window and re-reads after it or after invalidation', async () => {
    vi.useFakeTimers({ now: 1_000_000 });
    store.docs.set('config/settings', { maintenanceMode: true });
    expect((await getPlatformSettings()).maintenanceMode).toBe(true);
    store.docs.set('config/settings', { maintenanceMode: false });
    expect((await getPlatformSettings()).maintenanceMode).toBe(true);
    vi.setSystemTime(1_000_000 + PLATFORM_SETTINGS_CACHE_MS + 1);
    expect((await getPlatformSettings()).maintenanceMode).toBe(false);
    store.docs.set('config/settings', { maintenanceMode: true });
    invalidatePlatformSettingsCache();
    expect((await getPlatformSettings()).maintenanceMode).toBe(true);
  });

  it('fails open to defaults when the first read fails, and to the last value afterwards', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const original = state.db;
    state.db = { collection: () => ({ doc: () => ({ get: async () => { throw new Error('offline'); } }) }) };
    expect(await getPlatformSettings()).toMatchObject({ maintenanceMode: false, disabledFeatures: [] });

    state.db = original;
    invalidatePlatformSettingsCache();
    store.docs.set('config/settings', { disabledFeatures: ['ai_whatif'] });
    expect((await getPlatformSettings()).disabledFeatures).toEqual(['ai_whatif']);
    vi.useFakeTimers({ now: Date.now() + PLATFORM_SETTINGS_CACHE_MS + 5 });
    state.db = { collection: () => ({ doc: () => ({ get: async () => { throw new Error('offline'); } }) }) };
    expect((await getPlatformSettings()).disabledFeatures).toEqual(['ai_whatif']);
    expect(JSON.stringify(warn.mock.calls)).not.toContain('offline');
    warn.mockRestore();
  });
});

describe('server access gate', () => {
  it('allows everything by default', async () => {
    expect(await checkPlatformAccess({ feature: 'ai_insights' })).toBeNull();
  });

  it('returns 503 MAINTENANCE for students and exempts admins', async () => {
    store.docs.set('config/settings', { maintenanceMode: true });
    store.docs.set('config/admins', { emails: ['admin@test.example'] });
    const blocked = await checkPlatformAccess({ email: 'student@test.example' });
    expect(blocked?.status).toBe(503);
    expect(blocked?.headers.get('Cache-Control')).toBe('no-store');
    expect(await blocked?.json()).toEqual({ error: expect.stringMatching(/maintenance/i), code: 'MAINTENANCE' });
    expect(await checkPlatformAccess({ email: 'ADMIN@test.example' })).toBeNull();
    expect((await checkPlatformAccess({}))?.status).toBe(503);
  });

  it('returns 503 FEATURE_DISABLED with the feature id, for admins too', async () => {
    store.docs.set('config/settings', { disabledFeatures: ['transcript_share'] });
    store.docs.set('config/admins', { emails: ['admin@test.example'] });
    const blocked = await checkPlatformAccess({ feature: 'transcript_share', email: 'admin@test.example' });
    expect(blocked?.status).toBe(503);
    expect(await blocked?.json()).toEqual({ error: expect.any(String), code: 'FEATURE_DISABLED', feature: 'transcript_share' });
    expect(await checkPlatformAccess({ feature: 'transcript_pdf' })).toBeNull();
  });

  it('can skip the maintenance check for routes that stay open', async () => {
    store.docs.set('config/settings', { maintenanceMode: true });
    expect(await checkPlatformAccess({ maintenance: false })).toBeNull();
  });
});
