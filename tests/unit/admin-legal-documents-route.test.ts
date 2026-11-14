import { beforeEach, describe, expect, it, vi } from 'vitest';
import { queryTestDb } from './query-test-db';
import { pendingRequirements, readLegalVersions } from '@/lib/user/requirements';

const state = vi.hoisted(() => ({
  db: null as any,
  requireAdmin: vi.fn(),
  audit: vi.fn(),
  revalidate: vi.fn(),
}));

vi.mock('@/lib/firebase/admin', () => ({ get adminDb() { return state.db; } }));
vi.mock('@/lib/api/admin-audit', () => ({ writeAdminAudit: state.audit }));
vi.mock('next/cache', () => ({ revalidatePath: state.revalidate }));
vi.mock('@/lib/api/admin-auth', () => ({
  requireAdmin: state.requireAdmin,
  AdminAuthorizationError: class extends Error { status = 403; },
}));

import { GET, PUT } from '@/app/api/admin/legal/documents/[doc]/route';
import { POST } from '@/app/api/admin/legal/documents/[doc]/publish/route';
import { getPublishedLegal } from '@/lib/legal/server';
import { BUILTIN_LEGAL } from '@/lib/legal/builtin';

let store: ReturnType<typeof queryTestDb>;
const ADMIN = { uid: 'admin-1', email: 'admin@test.example' };
const ctx = (doc: string) => ({ params: Promise.resolve({ doc }) });
const today = () => new Date().toISOString().slice(0, 10);

const GOOD = {
  title: 'Terms of use',
  summary: 'The rules.',
  effectiveDate: today(),
  body: '## Agreement {#agreement}\n\nYou agree. Contact {{contact:Terms}}.',
  changeNote: 'Clarified coins',
};
const put = (doc: string, payload: unknown) => PUT(new Request('https://app.test/x', { method: 'PUT', body: JSON.stringify(payload) }), ctx(doc));
const publish = (doc: string, payload: unknown) => POST(new Request('https://app.test/x', { method: 'POST', body: JSON.stringify(payload) }), ctx(doc));

beforeEach(() => {
  store = queryTestDb();
  state.db = store.db;
  state.requireAdmin.mockReset().mockResolvedValue(ADMIN);
  state.audit.mockReset().mockResolvedValue(undefined);
  state.revalidate.mockReset();
});

describe('PUT /api/admin/legal/documents/[doc] (save draft)', () => {
  it('validates, stores the draft and audits without the text', async () => {
    const response = await put('terms', GOOD);
    expect(response.status).toBe(200);
    expect(store.docs.get('legal_documents/terms').draft).toMatchObject({ title: 'Terms of use', body: GOOD.body, updatedBy: ADMIN.email });
    expect(state.audit).toHaveBeenCalledWith(expect.objectContaining({ action: 'legal.draft.save', actorEmail: ADMIN.email, target: 'legal_documents/terms' }));
    expect(JSON.stringify(state.audit.mock.calls[0][0])).not.toContain('You agree');
  });

  it('rejects markup problems with the list of issues, and saves nothing', async () => {
    const response = await put('terms', { ...GOOD, body: '## A {#a}\n\n[bad](javascript:alert(1))' });
    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.code).toBe('INVALID_LEGAL_DRAFT');
    expect(json.issues.length).toBeGreaterThan(0);
    expect(store.docs.has('legal_documents/terms')).toBe(false);
  });

  it('rejects an invalid title, date, oversized text, unknown fields and unknown documents', async () => {
    expect((await put('terms', { ...GOOD, title: 'x' })).status).toBe(400);
    expect((await put('terms', { ...GOOD, effectiveDate: '2026-02-31' })).status).toBe(400);
    expect((await put('terms', { ...GOOD, effectiveDate: '2001-01-01' })).status).toBe(400);
    expect((await put('terms', { ...GOOD, body: 'x'.repeat(60_001) })).status).toBe(400);
    expect((await put('terms', { ...GOOD, admin: true })).status).toBe(400);
    expect((await put('cookies', GOOD)).status).toBe(404);
  });

  it('returns 403 for a non-admin', async () => {
    const { AdminAuthorizationError } = await import('@/lib/api/admin-auth');
    state.requireAdmin.mockRejectedValue(new AdminAuthorizationError(403));
    expect((await put('terms', GOOD)).status).toBe(403);
    expect(store.docs.size).toBe(0);
  });
});

describe('POST /api/admin/legal/documents/[doc]/publish', () => {
  it('versions the text, moves config/legal, clears the draft, revalidates and audits', async () => {
    await put('terms', GOOD);
    const response = await publish('terms', { expectedCurrentVersion: '2026-11-13' });
    expect(response.status).toBe(200);
    const { version } = await response.json();
    expect(version).toBe(today() === '2026-11-13' ? '2026-11-13.2' : today());

    expect(store.docs.get(`legal_documents/terms/versions/${version}`)).toMatchObject({ version, title: 'Terms of use', body: GOOD.body, publishedBy: ADMIN.email });
    expect(store.docs.get('config/legal').termsVersion).toBe(version);
    expect(store.docs.get('legal_documents/terms').draft).toBeNull();
    expect(state.revalidate).toHaveBeenCalledWith('/terms');
    expect(state.audit).toHaveBeenCalledWith(expect.objectContaining({ action: 'legal.publish', before: { version: '2026-11-13' }, after: { version } }));
  });

  it('only moves the version of the document that was published', async () => {
    store.docs.set('config/legal', { termsVersion: '2026-11-13', privacyVersion: '2026-11-13' });
    await put('privacy', { ...GOOD, title: 'Privacy notice' });
    const { version } = await (await publish('privacy', { expectedCurrentVersion: '2026-11-13' })).json();
    expect(store.docs.get('config/legal')).toMatchObject({ termsVersion: '2026-11-13', privacyVersion: version });
    expect(state.revalidate).toHaveBeenCalledWith('/privacy');
  });

  it('409 VERSION_MISMATCH when the version changed since the page loaded, and changes nothing', async () => {
    await put('terms', GOOD);
    const response = await publish('terms', { expectedCurrentVersion: '2026-01-01' });
    expect(response.status).toBe(409);
    expect((await response.json()).code).toBe('VERSION_MISMATCH');
    expect(store.paths('legal_documents/terms/versions/')).toHaveLength(0);
    expect(store.docs.get('legal_documents/terms').draft).not.toBeNull();
    expect(state.revalidate).not.toHaveBeenCalled();
  });

  it('409 NO_DRAFT when nothing was saved, and 400 without expectedCurrentVersion', async () => {
    const response = await publish('terms', { expectedCurrentVersion: '2026-11-13' });
    expect(response.status).toBe(409);
    expect((await response.json()).code).toBe('NO_DRAFT');
    expect((await publish('terms', {})).status).toBe(400);
  });

  it('403 for a non-admin and 404 for an unknown document', async () => {
    const { AdminAuthorizationError } = await import('@/lib/api/admin-auth');
    state.requireAdmin.mockRejectedValue(new AdminAuthorizationError(403));
    expect((await publish('terms', { expectedCurrentVersion: '2026-11-13' })).status).toBe(403);
    state.requireAdmin.mockResolvedValue(ADMIN);
    expect((await publish('cookies', { expectedCurrentVersion: '2026-11-13' })).status).toBe(404);
  });

  it('after publishing, the terms prompt is pending for a user who accepted the previous version', async () => {
    const user = { ageStatus: 'adult', consents: { terms: { version: '2026-11-13' }, privacy: { version: '2026-11-13' }, ai: { granted: true } } };
    expect(pendingRequirements(user, readLegalVersions(store.docs.get('config/legal'))).map((item) => item.id)).not.toContain('terms');

    await put('terms', GOOD);
    await publish('terms', { expectedCurrentVersion: '2026-11-13' });

    const pending = pendingRequirements(user, readLegalVersions(store.docs.get('config/legal')));
    expect(pending.map((item) => item.id)).toContain('terms');
    expect(pending.map((item) => item.id)).not.toContain('privacy');
  });
});

describe('GET /api/admin/legal/documents/[doc]', () => {
  it('returns the built-in text before anything is published, with no draft and no versions', async () => {
    const json = await (await GET(new Request('https://app.test/x'), ctx('terms'))).json();
    expect(json.current).toMatchObject({ source: 'builtin', version: BUILTIN_LEGAL.terms.version, title: 'Terms of use' });
    expect(json.configVersion).toBe('2026-11-13');
    expect(json.draft).toBeNull();
    expect(json.versions).toEqual([]);
  });

  it('returns the saved draft and the version history, newest first', async () => {
    await put('terms', GOOD);
    store.docs.set('legal_documents/terms/versions/2026-11-14', { version: '2026-11-14', publishedAt: new Date('2026-11-14T10:00:00Z'), publishedBy: 'a@test.example', changeNote: 'one' });
    store.docs.set('legal_documents/terms/versions/2026-11-15', { version: '2026-11-15', publishedAt: new Date('2026-11-15T10:00:00Z'), publishedBy: 'b@test.example', changeNote: 'two' });
    const json = await (await GET(new Request('https://app.test/x'), ctx('terms'))).json();
    expect(json.draft.body).toBe(GOOD.body);
    expect(json.versions.map((item: { version: string }) => item.version)).toEqual(['2026-11-15', '2026-11-14']);
  });

  it('404 for an unknown document', async () => {
    expect((await GET(new Request('https://app.test/x'), ctx('cookies'))).status).toBe(404);
  });
});

describe('getPublishedLegal', () => {
  it('serves the version named by config/legal, falls back to the latest, then to the built-in text', async () => {
    expect((await getPublishedLegal('terms')).source).toBe('builtin');

    store.docs.set('legal_documents/terms/versions/2026-12-01', { version: '2026-12-01', effectiveDate: '2026-12-01', title: 'Newest', summary: '', body: '## A {#a}\n\nNew.', publishedAt: new Date('2026-12-01T00:00:00Z') });
    store.docs.set('legal_documents/terms/versions/2026-11-20', { version: '2026-11-20', effectiveDate: '2026-11-20', title: 'Older', summary: '', body: '## A {#a}\n\nOld.', publishedAt: new Date('2026-11-20T00:00:00Z') });
    expect(await getPublishedLegal('terms')).toMatchObject({ source: 'published', version: '2026-12-01' });

    store.docs.set('config/legal', { termsVersion: '2026-11-20', privacyVersion: '2026-11-13' });
    expect(await getPublishedLegal('terms')).toMatchObject({ source: 'published', version: '2026-11-20', title: 'Older' });
    expect((await getPublishedLegal('privacy')).source).toBe('builtin');
  });

  it('never throws: a Firestore error shows the built-in text', async () => {
    state.db = { collection: () => { throw new Error('firestore down'); } };
    const result = await getPublishedLegal('privacy');
    expect(result.source).toBe('builtin');
    expect(result.title).toBe('Privacy notice');
  });

  it('ignores a malformed stored document', async () => {
    store.docs.set('legal_documents/terms/versions/2026-11-13', { version: 5, body: null });
    expect((await getPublishedLegal('terms')).source).toBe('builtin');
  });
});
