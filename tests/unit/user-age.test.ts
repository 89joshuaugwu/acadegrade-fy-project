import { beforeEach, describe, expect, it, vi } from 'vitest';
import { queryTestDb } from './query-test-db';

const state = vi.hoisted(() => ({ db: null as any }));
vi.mock('@/lib/firebase/admin', () => ({ get adminDb() { return state.db; } }));

import { invalidatePlatformSettingsCache } from '@/lib/platform/settings-server';
import { ageBlockResponse, getAiEligibility, readAgeStatus, resolveAgeTransition } from '@/lib/user/age';

let store: ReturnType<typeof queryTestDb>;
const consented = { consents: { ai: { granted: true, version: '2026-11-13', at: new Date() } } };
const refused = { consents: { ai: { granted: false, version: '2026-11-13', at: new Date() } } };
beforeEach(() => {
  store = queryTestDb(); state.db = store.db;
  invalidatePlatformSettingsCache();
});

describe('age transitions', () => {
  it.each([
    [null, 'adult', { ok: true, changed: true, upgrade: false }],
    [null, 'minor', { ok: true, changed: true, upgrade: false }],
    ['minor', 'adult', { ok: true, changed: true, upgrade: true }],
    ['adult', 'adult', { ok: true, changed: false, upgrade: false }],
    ['minor', 'minor', { ok: true, changed: false, upgrade: false }],
    ['adult', 'minor', { ok: false }],
  ] as const)('%s -> %s', (current, next, expected) => {
    expect(resolveAgeTransition(current, next)).toEqual(expected);
  });

  it('reads only the two valid stored values', () => {
    expect(readAgeStatus({ ageStatus: 'adult' })).toBe('adult');
    expect(readAgeStatus({ ageStatus: 'minor' })).toBe('minor');
    expect(readAgeStatus({ ageStatus: 'child' })).toBeNull();
    expect(readAgeStatus(undefined)).toBeNull();
  });
});

describe('AI eligibility (age + AI consent)', () => {
  it('allows adults who opted in to AI processing', async () => {
    store.docs.set('users/a', { ageStatus: 'adult', ...consented });
    expect(await getAiEligibility('a')).toEqual({ status: 'adult', aiAllowed: true, aiConsent: true });
  });

  it('asks adults without an AI answer for consent while enforced', async () => {
    store.docs.set('users/a', { ageStatus: 'adult' });
    expect(await getAiEligibility('a')).toEqual({ status: 'adult', aiAllowed: false, aiConsent: null, code: 'AI_CONSENT_REQUIRED' });
  });

  it('restricts minors with AGE_RESTRICTED even with a stored consent and a relaxed gate', async () => {
    store.docs.set('config/settings', { ageGate: { enforceUnknown: false } });
    store.docs.set('users/m', { ageStatus: 'minor', ...consented });
    expect(await getAiEligibility('m')).toEqual({ status: 'minor', aiAllowed: false, aiConsent: true, code: 'AGE_RESTRICTED' });
  });

  it('always blocks an explicit AI consent withdrawal', async () => {
    store.docs.set('config/settings', { ageGate: { enforceUnknown: false } });
    store.docs.set('users/a', { ageStatus: 'adult', ...refused });
    expect(await getAiEligibility('a')).toEqual({ status: 'adult', aiAllowed: false, aiConsent: false, code: 'AI_CONSENT_REQUIRED' });
  });

  it('asks old accounts with no fields at all to confirm their age first (the default)', async () => {
    store.docs.set('users/old', { fullName: 'Legacy', matric: 'X1' });
    expect(await getAiEligibility('old')).toEqual({ status: 'unknown', aiAllowed: false, aiConsent: null, code: 'AGE_CONFIRMATION_REQUIRED' });
    expect(await getAiEligibility('missing-doc')).toMatchObject({ status: 'unknown', code: 'AGE_CONFIRMATION_REQUIRED' });
  });

  it('lets unknown age and missing consent through when the operator relaxes the gate', async () => {
    store.docs.set('config/settings', { ageGate: { enforceUnknown: false } });
    store.docs.set('users/old', {});
    expect(await getAiEligibility('old')).toEqual({ status: 'unknown', aiAllowed: true, aiConsent: null });
    store.docs.set('users/a', { ageStatus: 'adult' });
    expect(await getAiEligibility('a')).toEqual({ status: 'adult', aiAllowed: true, aiConsent: null });
  });

  it('builds the documented 403 bodies', async () => {
    const restricted = ageBlockResponse({ status: 'minor', aiAllowed: false, aiConsent: null, code: 'AGE_RESTRICTED' });
    expect(restricted.status).toBe(403);
    expect(await restricted.json()).toEqual({ error: expect.stringMatching(/18/), code: 'AGE_RESTRICTED' });
    const confirm = ageBlockResponse({ status: 'unknown', aiAllowed: false, aiConsent: null, code: 'AGE_CONFIRMATION_REQUIRED' });
    expect(await confirm.json()).toEqual({ error: 'Confirm your age in AcadeGrade to use AI features', code: 'AGE_CONFIRMATION_REQUIRED' });
    const consent = ageBlockResponse({ status: 'adult', aiAllowed: false, aiConsent: null, code: 'AI_CONSENT_REQUIRED' });
    expect(await consent.json()).toEqual({ error: expect.stringMatching(/AI/), code: 'AI_CONSENT_REQUIRED' });
  });
});
