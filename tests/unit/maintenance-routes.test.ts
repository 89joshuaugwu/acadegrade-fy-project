import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { queryTestDb } from './query-test-db';

const state = vi.hoisted(() => ({ db: null as any, verify: vi.fn(), getUser: vi.fn(), sendEmail: vi.fn(), rtdb: vi.fn() }));
vi.mock('@/lib/firebase/admin', () => ({
  get adminDb() { return state.db; },
  adminAuth: { verifyIdToken: state.verify, getUser: state.getUser },
  adminRtdb: { ref: () => ({ transaction: state.rtdb }) },
  adminMessaging: { sendEachForMulticast: vi.fn() },
}));
vi.mock('@/lib/email/mailer', () => ({ sendEmail: state.sendEmail, welcomeEmail: () => '<p>hi</p>' }));
vi.mock('@/lib/api/logger', () => ({ apiTimer: () => () => 0, logApiCall: vi.fn() }));

import { POST as finalize } from '@/app/api/auth/register/finalize/route';
import { POST as notify } from '@/app/api/notifications/send/route';
import { POST as generate } from '@/app/api/transcript/generate/route';
import { GET as readShare, POST as share } from '@/app/api/transcript/share/route';
import { invalidatePlatformSettingsCache } from '@/lib/platform/settings-server';
import { DEFAULT_LEGAL_VERSION } from '@/lib/user/requirements';

let store: ReturnType<typeof queryTestDb>;
const request = (body: unknown, token = 'good', url = 'https://app.test/api/x') => new NextRequest(url, {
  method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});
const maintenance = () => store.docs.set('config/settings', { maintenanceMode: true });

beforeEach(() => {
  store = queryTestDb(); state.db = store.db;
  invalidatePlatformSettingsCache();
  store.docs.set('config/admins', { emails: ['boss@test.example'] });
  state.verify.mockReset().mockResolvedValue({ uid: 'alice', email: 'alice@test.example', email_verified: true });
  state.getUser.mockReset().mockResolvedValue({ providerData: [{ providerId: 'google.com' }], photoURL: null });
  state.sendEmail.mockReset().mockResolvedValue(undefined);
  state.rtdb.mockReset().mockResolvedValue(undefined);
});

describe('transcript routes', () => {
  it('generate returns 503 MAINTENANCE for students and FEATURE_DISABLED for transcript_pdf', async () => {
    maintenance();
    expect(await (await generate(request({}))).json()).toMatchObject({ code: 'MAINTENANCE' });
    store.docs.set('config/settings', { disabledFeatures: ['transcript_pdf'] });
    invalidatePlatformSettingsCache();
    const response = await generate(request({}));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: expect.any(String), code: 'FEATURE_DISABLED', feature: 'transcript_pdf' });
  });

  it('share creation honours maintenance and transcript_share, while reading a share stays public', async () => {
    maintenance();
    expect(await (await share(request({}))).json()).toMatchObject({ code: 'MAINTENANCE' });
    store.docs.set('config/settings', { maintenanceMode: true, disabledFeatures: ['transcript_share'] });
    invalidatePlatformSettingsCache();
    state.verify.mockResolvedValue({ uid: 'boss', email: 'boss@test.example' });
    expect(await (await share(request({}))).json()).toMatchObject({ code: 'FEATURE_DISABLED', feature: 'transcript_share' });
    store.docs.set('shared_transcripts/abc', { uid: 'alice', studentName: 'A', expiresAt: new Date(Date.now() + 60_000) });
    expect((await readShare(new NextRequest('https://app.test/api/transcript/share?id=abc'))).status).not.toBe(503);
    expect(store.paths('shared_transcripts')).toEqual(['shared_transcripts/abc']);
  });
});

describe('notifications send', () => {
  it('blocks a student sending to themselves during maintenance but lets admins send', async () => {
    maintenance();
    const blocked = await notify(request({ uid: 'alice', title: 'T', message: 'M', type: 'info' }));
    expect(blocked.status).toBe(503);
    expect(store.paths('notifications')).toEqual([]);
    state.verify.mockResolvedValue({ uid: 'boss', email: 'boss@test.example' });
    const allowed = await notify(request({ uid: 'alice', title: 'T', message: 'M', type: 'info' }));
    expect(allowed.status).toBe(200);
    expect(store.paths('notifications/alice/items')).toHaveLength(1);
  });
});

describe('registration finalize', () => {
  const body = (extra: Record<string, unknown> = {}) => ({
    authMethod: 'google',
    profile: {
      fullName: 'Alice Ade', matric: 'ABC/123', email: 'alice@test.example', university: 'Test University',
      department: 'Computer Science', programme: 'B.Sc Computer Science', courseDuration: 4, currentLevel: 100,
      entrySession: '2025/2026', recordMode: 'fromScratch',
    },
    ...extra,
  });

  it('returns 503 MAINTENANCE before creating anything', async () => {
    maintenance();
    const response = await finalize(request(body()));
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ code: 'MAINTENANCE' });
    expect(store.paths('users')).toEqual([]);
  });

  it('keeps old clients working: no age or answers leaves the account unknown', async () => {
    const response = await finalize(request(body()));
    expect(response.status).toBe(201);
    expect(store.docs.get('users/alice')).toMatchObject({ fullName: 'Alice Ade', setupComplete: true });
    expect(store.docs.get('users/alice').ageStatus).toBeUndefined();
    expect(store.docs.get('users/alice').consents).toBeUndefined();
  });

  it('records ageStatus and the requirements answers when sent', async () => {
    const response = await finalize(request(body({
      ageStatus: 'adult',
      answers: { terms: { version: DEFAULT_LEGAL_VERSION }, privacy: { version: DEFAULT_LEGAL_VERSION }, aiConsent: true, marketingConsent: false },
    })));
    expect(response.status).toBe(201);
    expect(store.docs.get('users/alice')).toMatchObject({
      ageStatus: 'adult', ageDeclaredAt: expect.any(Date),
      consents: { terms: { version: DEFAULT_LEGAL_VERSION }, privacy: { version: DEFAULT_LEGAL_VERSION }, ai: { granted: true }, marketing: { granted: false } },
    });
  });

  it('rejects an invalid ageStatus and AI consent from a minor', async () => {
    expect((await finalize(request(body({ ageStatus: 'teen' })))).status).toBe(400);
    const minor = await finalize(request(body({ ageStatus: 'minor', answers: { aiConsent: true } })));
    expect(minor.status).toBe(403);
    expect(await minor.json()).toMatchObject({ code: 'AGE_RESTRICTED' });
    expect(store.paths('users')).toEqual([]);
  });

  it('keeps an earlier age declaration when an incomplete profile is finalised', async () => {
    const declared = new Date('2026-01-01');
    store.docs.set('users/alice', { ageStatus: 'minor', ageDeclaredAt: declared });
    expect((await finalize(request(body()))).status).toBe(201);
    expect(store.docs.get('users/alice')).toMatchObject({ ageStatus: 'minor', ageDeclaredAt: declared });
  });
});
