import { beforeEach, describe, expect, it, vi } from 'vitest';
import { queryTestDb } from './query-test-db';

const state = vi.hoisted(() => ({ db: null as any, verify: vi.fn(), updateUser: vi.fn() }));
vi.mock('@/lib/firebase/admin', () => ({
  get adminDb() { return state.db; },
  adminAuth: { verifyIdToken: state.verify, updateUser: state.updateUser },
}));

import { sanitizeAuditValue, writeAdminAudit } from '@/lib/api/admin-audit';
import { GET as auditGet } from '@/app/api/admin/audit/route';
import { GET as legalGet, PUT as legalPut } from '@/app/api/admin/legal/route';
import { POST as settingsPost } from '@/app/api/admin/settings/route';
import { GET as usersGet, POST as usersPost } from '@/app/api/admin/users/route';
import { PUT as usagePut } from '@/app/api/admin/usage/route';
import { PUT as releasePut } from '@/app/api/admin/mobile-release/route';
import { PATCH as catalogPatch } from '@/app/api/admin/academic-catalog/route';
import { PATCH as suggestionPatch } from '@/app/api/admin/academic-catalog/suggestions/route';
import { DELETE as courseDelete, POST as coursePost, PUT as coursePut } from '@/app/api/admin/courses/route';
import { POST as emailPost } from '@/app/api/admin/email/route';
import { GET as aiGet, POST as aiPost } from '@/app/api/admin/ai/route';
import { getPlatformSettings, invalidatePlatformSettingsCache } from '@/lib/platform/settings-server';
import { defaultUsagePolicy } from '@/lib/usage/policy';
import { DEFAULT_LEGAL_VERSION } from '@/lib/user/requirements';

let store: ReturnType<typeof queryTestDb>;
const audits = () => store.paths('_admin_audit/').map((path) => store.docs.get(path));
const req = (method: string, body?: unknown, url = 'https://app.test/api/admin/x') => new Request(url, {
  method, headers: { Authorization: 'Bearer admin-token', 'Content-Type': 'application/json' },
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});

beforeEach(() => {
  store = queryTestDb(); state.db = store.db;
  invalidatePlatformSettingsCache();
  store.docs.set('config/admins', { emails: ['boss@test.example'] });
  state.verify.mockReset().mockResolvedValue({ uid: 'boss-uid', email: 'boss@test.example' });
  state.updateUser.mockReset().mockResolvedValue(undefined);
  process.env.AI_SECRETS_MASTER_KEY = Buffer.alloc(32, 5).toString('base64');
});

describe('writeAdminAudit', () => {
  it('writes one append-only record with actor, action, target and summaries', async () => {
    await writeAdminAudit({ actorUid: 'u', actorEmail: 'Boss@Test.example', action: 'settings.update', target: 'config/settings.maintenanceMode', summary: 'Turned maintenance on', before: false, after: true });
    expect(audits()).toEqual([{
      actorUid: 'u', actorEmail: 'boss@test.example', action: 'settings.update', target: 'config/settings.maintenanceMode',
      summary: 'Turned maintenance on', before: false, after: true, createdAt: expect.any(Date), createdAtMs: expect.any(Number),
    }]);
  });

  it('strips secrets and bounds large values', () => {
    expect(sanitizeAuditValue({ email: 'a@b.c', appPassword: 'p', apiKey: 'k', ciphertext: 'c', iv: 'i', tag: 't', nested: { password: 'x', token: 'y', keep: 1 } }))
      .toEqual({ email: 'a@b.c', nested: { keep: 1 } });
    expect((sanitizeAuditValue('x'.repeat(2000)) as string).length).toBeLessThanOrEqual(501);
    expect((sanitizeAuditValue(Array.from({ length: 100 }, (_, index) => index)) as unknown[]).length).toBe(50);
  });

  it('never throws when storage fails', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    state.db = { collection: () => ({ doc: () => ({ create: async () => { throw new Error('down'); } }) }) };
    await expect(writeAdminAudit({ actorEmail: 'a@b.c', action: 'x', target: 'y' })).resolves.toBeUndefined();
    warn.mockRestore();
  });
});

describe('GET /api/admin/audit', () => {
  beforeEach(() => {
    for (let index = 0; index < 5; index += 1) {
      store.docs.set(`_admin_audit/e${index}`, { action: index % 2 ? 'users.disable' : 'settings.update', target: `t${index}`, createdAtMs: 1000 + index, actorEmail: 'boss@test.example' });
    }
  });

  it('requires an admin', async () => {
    state.verify.mockResolvedValue({ uid: 's', email: 'student@test.example' });
    expect((await auditGet(req('GET'))).status).toBe(403);
  });

  it('pages newest first with a cursor', async () => {
    const first = await (await auditGet(req('GET', undefined, 'https://app.test/api/admin/audit?limit=2'))).json();
    expect(first.entries.map((entry: { id: string }) => entry.id)).toEqual(['e4', 'e3']);
    expect(first.nextCursor).toBe(1003);
    const second = await (await auditGet(req('GET', undefined, `https://app.test/api/admin/audit?limit=2&cursor=${first.nextCursor}`))).json();
    expect(second.entries.map((entry: { id: string }) => entry.id)).toEqual(['e2', 'e1']);
    const last = await (await auditGet(req('GET', undefined, 'https://app.test/api/admin/audit?limit=2&cursor=1001'))).json();
    expect(last).toEqual({ entries: [expect.objectContaining({ id: 'e0' })], nextCursor: null });
  });

  it('filters by action and rejects bad parameters', async () => {
    const filtered = await (await auditGet(req('GET', undefined, 'https://app.test/api/admin/audit?action=users.disable'))).json();
    expect(filtered.entries.map((entry: { id: string }) => entry.id)).toEqual(['e3', 'e1']);
    expect((await auditGet(req('GET', undefined, 'https://app.test/api/admin/audit?action=bad action!'))).status).toBe(400);
    expect((await auditGet(req('GET', undefined, 'https://app.test/api/admin/audit?cursor=abc'))).status).toBe(400);
  });

  it('filters by actor email (case-insensitive input), alone or with an action', async () => {
    store.docs.set('_admin_audit/x1', { action: 'users.disable', target: 'users/a', createdAtMs: 2000, actorEmail: 'helper@test.example' });
    const byActor = await (await auditGet(req('GET', undefined, 'https://app.test/api/admin/audit?actor=Helper@Test.example'))).json();
    expect(byActor.entries.map((entry: { id: string }) => entry.id)).toEqual(['x1']);
    const both = await (await auditGet(req('GET', undefined, 'https://app.test/api/admin/audit?actor=boss@test.example&action=users.disable'))).json();
    expect(both.entries.map((entry: { id: string }) => entry.id)).toEqual(['e3', 'e1']);
    expect((await auditGet(req('GET', undefined, 'https://app.test/api/admin/audit?actor=not-an-email'))).status).toBe(400);
  });
});

describe('admin routes write audit records', () => {
  it('settings: records before/after and refreshes the server settings cache', async () => {
    store.docs.set('config/settings', { maintenanceMode: false });
    expect((await getPlatformSettings()).maintenanceMode).toBe(false);
    expect((await settingsPost(req('POST', { field: 'maintenanceMode', value: true }))).status).toBe(200);
    expect((await getPlatformSettings()).maintenanceMode).toBe(true);
    expect(audits()).toEqual([expect.objectContaining({ actorEmail: 'boss@test.example', action: 'settings.update', target: 'config/settings.maintenanceMode', before: false, after: true })]);
  });

  it('users: records disable/enable and support age corrections', async () => {
    store.docs.set('users/stu', { disabled: false, ageStatus: 'adult' });
    expect((await usersPost(req('POST', { action: 'disable', uid: 'stu' }))).status).toBe(200);
    const corrected = await usersPost(req('POST', { action: 'set-age', uid: 'stu', ageStatus: 'minor', reason: '  Parent emailed support with proof of age  ' }));
    expect(corrected.status).toBe(200);
    expect(store.docs.get('users/stu')).toMatchObject({ ageStatus: 'minor', ageCorrectedAt: expect.any(Date), ageCorrectedBy: 'boss@test.example' });
    expect((await usersPost(req('POST', { action: 'set-age', uid: 'stu', ageStatus: 'teen', reason: 'x' }))).status).toBe(400);
    expect(audits().find((entry) => entry.action === 'users.set-age')?.summary).toBe('Support age correction: Parent emailed support with proof of age');
    expect(audits().map((entry) => [entry.action, entry.target, entry.before, entry.after])).toEqual(expect.arrayContaining([
      ['users.disable', 'users/stu', { disabled: false }, { disabled: true }],
      ['users.set-age', 'users/stu', { ageStatus: 'adult' }, { ageStatus: 'minor' }],
    ]));
  });

  it('usage, mobile release, catalogue, suggestions and courses each write one record', async () => {
    expect((await usagePut(req('PUT', { dailyLimits: defaultUsagePolicy().dailyLimits }))).status).toBe(200);
    expect((await releasePut(req('PUT', { enabled: false, latestVersion: '1.0.0', latestBuild: 1, allowIgnore: true, headline: '', message: '', imageUrl: '', downloadUrl: '' }))).status).toBe(200);
    expect((await catalogPatch(req('PATCH', { action: 'add', kind: 'university', name: 'Audit University' }))).status).toBe(200);
    store.docs.set('_academic_catalog_suggestions/s1', { uid: 'stu', kind: 'department', name: 'Audit Dept', status: 'pending' });
    expect((await suggestionPatch(req('PATCH', { id: 's1', action: 'reject' }))).status).toBe(200);
    expect((await coursePost(req('POST', { code: 'csc101', title: 'Intro', units: 3 }))).status).toBe(200);
    const courseId = store.paths('courseCatalog/')[0].split('/')[1];
    expect((await coursePut(req('PUT', { id: courseId, code: 'csc101', title: 'Intro 2', units: 3 }))).status).toBe(200);
    expect((await courseDelete(req('DELETE', undefined, `https://app.test/api/admin/courses?id=${courseId}`))).status).toBe(200);
    expect(audits().map((entry) => entry.action).sort()).toEqual([
      'academic-catalog.add', 'academic-catalog.suggestion.reject', 'courses.create', 'courses.delete', 'courses.update', 'mobile-release.update', 'usage.update',
    ]);
  });

  it('email: records the sender change without the app password', async () => {
    expect((await emailPost(req('POST', { operation: 'save', kind: 'otp', email: 'otp@test.example', appPassword: 'SUPERSECRETPW' }))).status).toBe(200);
    expect(audits()).toEqual([expect.objectContaining({ action: 'email.save', target: '_email_secrets/email-otp', after: { email: 'otp@test.example' } })]);
    expect(JSON.stringify(audits())).not.toContain('SUPERSECRETPW');
  });

  it('ai: records key writes without the key, and the Gemini billing acknowledgement', async () => {
    expect((await aiPost(req('POST', { operation: 'upsert-secret', providerId: 'groq', secretId: 'groq-main', value: 'gsk_PRIVATE' }))).status).toBe(200);
    expect(JSON.stringify(audits())).not.toContain('gsk_PRIVATE');
    expect(audits()).toEqual([expect.objectContaining({ action: 'ai.upsert-secret', target: '_ai_secrets/groq-main' })]);
    expect(store.paths('_ai_audit')).toEqual([]);

    expect((await (await aiGet(req('GET'))).json()).geminiBilling).toBe('unconfirmed');
    expect((await aiPost(req('POST', { operation: 'set-gemini-billing', geminiBilling: 'confirmed' }))).status).toBe(200);
    expect((await (await aiGet(req('GET'))).json()).geminiBilling).toBe('confirmed');
    expect((await aiPost(req('POST', { operation: 'set-gemini-billing', geminiBilling: 'maybe' }))).status).toBe(400);
    expect(audits().map((entry) => entry.action)).toContain('ai.set-gemini-billing');
  });
});

describe('support age corrections need a reason', () => {
  it('rejects a missing, blank or over-long reason without changing the user', async () => {
    store.docs.set('users/stu', { ageStatus: 'adult' });
    for (const reason of [undefined, '   ', 'x'.repeat(301), 42]) {
      const response = await usersPost(req('POST', { action: 'set-age', uid: 'stu', ageStatus: 'minor', ...(reason === undefined ? {} : { reason }) }));
      expect(response.status).toBe(400);
    }
    expect(store.docs.get('users/stu')).toEqual({ ageStatus: 'adult' });
    expect(audits()).toEqual([]);
  });
});

describe('GET /api/admin/users age fields', () => {
  it("adds each user's ageStatus and aiConsent, with unknown/null for old accounts", async () => {
    store.docs.set('users/old', { fullName: 'Old' });
    store.docs.set('users/kid', { fullName: 'Kid', ageStatus: 'minor' });
    store.docs.set('users/ada', { fullName: 'Ada', ageStatus: 'adult', consents: { ai: { granted: true } } });
    const body = await (await usersGet(req('GET'))).json();
    const byId = Object.fromEntries(body.users.map((user: { uid: string; ageStatus: string; aiConsent: boolean | null }) => [user.uid, [user.ageStatus, user.aiConsent]]));
    expect(byId).toEqual({ old: ['unknown', null], kid: ['minor', null], ada: ['adult', true] });
  });
});

describe('/api/admin/legal', () => {
  it('reads defaults, saves new versions with an audit record, and validates', async () => {
    expect(await (await legalGet(req('GET'))).json()).toEqual({ termsVersion: DEFAULT_LEGAL_VERSION, privacyVersion: DEFAULT_LEGAL_VERSION });
    const saved = await legalPut(req('PUT', { termsVersion: '2027-01-01', privacyVersion: DEFAULT_LEGAL_VERSION }));
    expect(saved.status).toBe(200);
    expect(store.docs.get('config/legal')).toMatchObject({ termsVersion: '2027-01-01', privacyVersion: DEFAULT_LEGAL_VERSION });
    expect(audits()).toEqual([expect.objectContaining({ action: 'legal.update', target: 'config/legal', before: { termsVersion: DEFAULT_LEGAL_VERSION, privacyVersion: DEFAULT_LEGAL_VERSION }, after: { termsVersion: '2027-01-01', privacyVersion: DEFAULT_LEGAL_VERSION } })]);
    expect((await legalPut(req('PUT', { termsVersion: 'bad version', privacyVersion: 'x' }))).status).toBe(400);
    state.verify.mockResolvedValue({ uid: 's', email: 'student@test.example' });
    expect((await legalPut(req('PUT', { termsVersion: 'a', privacyVersion: 'b' }))).status).toBe(403);
  });
});
