import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { queryTestDb } from './query-test-db';

const state = vi.hoisted(() => ({ db: null as any, verify: vi.fn() }));
vi.mock('@/lib/firebase/admin', () => ({ get adminDb() { return state.db; }, adminAuth: { verifyIdToken: state.verify } }));

import { POST as postAge } from '@/app/api/user/age/route';
import { GET as getRequirements, POST as postRequirements } from '@/app/api/user/requirements/route';
import { invalidatePlatformSettingsCache } from '@/lib/platform/settings-server';
import { AI_CONSENT_VERSION, DEFAULT_LEGAL_VERSION } from '@/lib/user/requirements';

let store: ReturnType<typeof queryTestDb>;
const call = (handler: (r: NextRequest) => Promise<Response>, body?: unknown, token = 'good', method = 'POST') =>
  handler(new NextRequest('https://app.test/api/user/x', {
    method,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    ...(body === undefined ? {} : { body: typeof body === 'string' ? body : JSON.stringify(body) }),
  }));
const user = () => store.docs.get('users/alice');

beforeEach(() => {
  store = queryTestDb(); state.db = store.db;
  invalidatePlatformSettingsCache();
  state.verify.mockReset().mockResolvedValue({ uid: 'alice', email: 'alice@test.example' });
});

describe('POST /api/user/age', () => {
  it('requires a bearer token and a valid status', async () => {
    expect((await call(postAge, { status: 'adult' }, '')).status).toBe(401);
    expect((await call(postAge, { status: 'teen' })).status).toBe(400);
    expect((await call(postAge, 'not json')).status).toBe(400);
    expect(user()).toBeUndefined();
  });

  it('records a first declaration on an old account with no fields and returns the contract', async () => {
    store.docs.set('users/alice', { fullName: 'Alice', matric: 'M1' });
    const response = await call(postAge, { status: 'minor' });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ageStatus: 'minor', aiAllowed: false });
    expect(user()).toMatchObject({ fullName: 'Alice', ageStatus: 'minor', ageDeclaredAt: expect.any(Date) });
    expect(user().ageUpgradedAt).toBeUndefined();
  });

  it('upgrades minor -> adult once with ageUpgradedAt, and is idempotent', async () => {
    const declared = new Date('2026-01-01');
    store.docs.set('users/alice', { ageStatus: 'minor', ageDeclaredAt: declared });
    expect(await (await call(postAge, { status: 'adult' })).json()).toEqual({ ageStatus: 'adult', aiAllowed: false });
    expect(user()).toMatchObject({ ageStatus: 'adult', ageDeclaredAt: declared, ageUpgradedAt: expect.any(Date) });
    const upgradedAt = user().ageUpgradedAt;
    const again = await call(postAge, { status: 'adult' });
    expect(again.status).toBe(200);
    expect(user().ageUpgradedAt).toBe(upgradedAt);
  });

  it('reports aiAllowed true for an adult who already consented to AI processing', async () => {
    store.docs.set('users/alice', { consents: { ai: { granted: true, version: AI_CONSENT_VERSION, at: new Date() } } });
    expect(await (await call(postAge, { status: 'adult' })).json()).toEqual({ ageStatus: 'adult', aiAllowed: true });
  });

  it('refuses adult -> minor with 409 and tells the user to contact support', async () => {
    store.docs.set('users/alice', { ageStatus: 'adult' });
    const response = await call(postAge, { status: 'minor' });
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: expect.stringMatching(/support/i), code: 'AGE_CHANGE_REQUIRES_SUPPORT' });
    expect(user().ageStatus).toBe('adult');
  });

  it('is rate limited with the shared limiter', async () => {
    for (let index = 0; index < 10; index += 1) expect((await call(postAge, { status: 'adult' })).status).toBe(200);
    const limited = await call(postAge, { status: 'adult' });
    expect(limited.status).toBe(429);
    expect(store.paths('_api_rate_limits/alice_user_age')).not.toHaveLength(0);
  });

  it('returns 503 MAINTENANCE for students during maintenance, before touching the user', async () => {
    store.docs.set('config/settings', { maintenanceMode: true });
    const response = await call(postAge, { status: 'adult' });
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ code: 'MAINTENANCE' });
    expect(user()).toBeUndefined();
    expect(store.paths('_api_rate_limits')).toHaveLength(0);
  });
});

describe('GET /api/user/requirements', () => {
  it('lists every pending item for an old account with no fields at all', async () => {
    store.docs.set('users/alice', {});
    const response = await call(getRequirements, undefined, 'good', 'GET');
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toContain('no-store');
    const body = await response.json();
    expect(body.checkedAt).toEqual(expect.any(Number));
    expect(body.items.map((item: { id: string }) => item.id)).toEqual(['age', 'terms', 'privacy', 'marketing_consent']);
    expect(body.items[1]).toMatchObject({ blocking: 'app', version: DEFAULT_LEGAL_VERSION });
  });

  it('uses config/legal versions so a bump re-prompts', async () => {
    store.docs.set('config/legal', { termsVersion: '2027-02-01', privacyVersion: DEFAULT_LEGAL_VERSION });
    store.docs.set('users/alice', { ageStatus: 'adult', consents: {
      terms: { version: DEFAULT_LEGAL_VERSION }, privacy: { version: DEFAULT_LEGAL_VERSION },
      ai: { granted: true }, marketing: { granted: false },
    } });
    const body = await (await call(getRequirements, undefined, 'good', 'GET')).json();
    expect(body.items).toEqual([expect.objectContaining({ id: 'terms', version: '2027-02-01' })]);
  });

  it('requires authentication', async () => {
    expect((await call(getRequirements, undefined, '', 'GET')).status).toBe(401);
  });

  it('reports the current answers for settings screens, with nulls for an old account', async () => {
    store.docs.set('users/alice', {});
    expect((await (await call(getRequirements, undefined, 'good', 'GET')).json()).current)
      .toEqual({ ageStatus: 'unknown', aiConsent: null, marketingConsent: null });

    store.docs.set('users/alice', { ageStatus: 'adult', consents: {
      terms: { version: '2026-01-01' }, privacy: { version: DEFAULT_LEGAL_VERSION },
      ai: { granted: false }, marketing: { granted: true },
    } });
    const body = await (await call(getRequirements, undefined, 'good', 'GET')).json();
    expect(body.current).toEqual({ ageStatus: 'adult', aiConsent: false, marketingConsent: true, termsVersion: '2026-01-01', privacyVersion: DEFAULT_LEGAL_VERSION });
    expect(body.items.map((item: { id: string }) => item.id)).toEqual(['terms']);
  });
});

describe('POST /api/user/requirements', () => {
  it('records every answer and returns the remaining items', async () => {
    store.docs.set('users/alice', { fullName: 'Alice' });
    const response = await call(postRequirements, { answers: {
      age: 'adult', terms: { version: DEFAULT_LEGAL_VERSION }, privacy: { version: DEFAULT_LEGAL_VERSION }, aiConsent: true,
    } });
    expect(response.status).toBe(200);
    expect((await response.json()).items.map((item: { id: string }) => item.id)).toEqual(['marketing_consent']);
    expect(user()).toMatchObject({
      fullName: 'Alice', ageStatus: 'adult', ageDeclaredAt: expect.any(Date),
      consents: {
        terms: { version: DEFAULT_LEGAL_VERSION, at: expect.any(Date) },
        privacy: { version: DEFAULT_LEGAL_VERSION, at: expect.any(Date) },
        ai: { granted: true, version: AI_CONSENT_VERSION, at: expect.any(Date) },
      },
    });
  });

  it('allows withdrawing AI consent without re-prompting', async () => {
    store.docs.set('users/alice', { ageStatus: 'adult', consents: { ai: { granted: true, version: AI_CONSENT_VERSION, at: new Date() }, marketing: { granted: true, at: new Date() } } });
    const body = await (await call(postRequirements, { answers: { aiConsent: false } })).json();
    expect(body.items.map((item: { id: string }) => item.id)).not.toContain('ai_consent');
    expect(user().consents).toMatchObject({ ai: { granted: false }, marketing: { granted: true } });
  });

  it('maps validation and rule failures to their status codes without writing', async () => {
    store.docs.set('users/alice', { ageStatus: 'adult' });
    expect((await call(postRequirements, { answers: { nope: 1 } })).status).toBe(400);
    const stale = await call(postRequirements, { answers: { terms: { version: 'old' } } });
    expect(stale.status).toBe(409);
    expect(await stale.json()).toMatchObject({ code: 'VERSION_MISMATCH' });
    const downgrade = await call(postRequirements, { answers: { age: 'minor' } });
    expect(await downgrade.json()).toMatchObject({ code: 'AGE_CHANGE_REQUIRES_SUPPORT' });
    expect(user()).toEqual({ ageStatus: 'adult' });
  });

  it('refuses AI consent from a minor', async () => {
    store.docs.set('users/alice', { ageStatus: 'minor' });
    const response = await call(postRequirements, { answers: { aiConsent: true } });
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ code: 'AGE_RESTRICTED' });
  });
});
