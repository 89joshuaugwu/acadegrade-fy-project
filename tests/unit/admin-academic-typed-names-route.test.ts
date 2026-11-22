import { beforeEach, describe, expect, it, vi } from 'vitest';
import { queryTestDb } from './query-test-db';

const state = vi.hoisted(() => ({ db: null as any, verify: vi.fn() }));
vi.mock('@/lib/firebase/admin', () => ({
  get adminDb() { return state.db; },
  adminAuth: { verifyIdToken: state.verify },
  adminRtdb: { ref: () => ({ transaction: async () => undefined }) },
}));

import { GET, POST } from '@/app/api/admin/academic-catalog/typed-names/route';
import { POST as assign } from '@/app/api/admin/academic-catalog/assign/route';
import { computeTypedNames, invalidateTypedNamesCache } from '@/lib/academic-catalog/typed-names';

const ESUT = 'Enugu State University of Science and Technology, Enugu';
let store: ReturnType<typeof queryTestDb>;
const call = (handler: (request: Request) => Promise<Response>, url = '', body?: unknown) => handler(new Request(`https://app.test/api/admin/academic-catalog/typed-names${url}`, {
  method: body === undefined ? 'GET' : 'POST',
  headers: { Authorization: 'Bearer admin-token', 'Content-Type': 'application/json' },
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
}));

beforeEach(() => {
  store = queryTestDb(); state.db = store.db;
  invalidateTypedNamesCache();
  store.docs.set('config/admins', { emails: ['boss@test.example'] });
  state.verify.mockReset().mockResolvedValue({ uid: 'boss-uid', email: 'boss@test.example' });
  store.docs.set('config/academicCatalog', { revision: 3, entries: [
    { id: 'u-esut', kind: 'university', name: ESUT, status: 'active', source: 'default', aliases: ['ESUT'] },
    { id: 'd-cs', kind: 'department', name: 'Computer Science', status: 'active', source: 'default' },
  ] });
  const profiles: [string, Record<string, string>][] = [
    ['a', { fullName: 'Chidi Okafor', email: 'a@test.example', university: 'ESUT Agbani', department: 'Computer Science' }],
    ['b', { fullName: 'Ada Obi', email: 'b@test.example', university: 'esut agbani', department: 'Comp Sci' }],
    ['c', { fullName: 'Bola', university: 'ESUT Agbani', dept: 'Comp Sci' }],
    ['d', { fullName: 'x', university: 'ESUT', department: 'computer science' }],
    ['e', { fullName: 'y', university: ESUT, programme: 'B.Sc Computer Science' }],
  ];
  for (const [uid, data] of profiles) store.docs.set(`users/${uid}`, data);
});

describe('computeTypedNames', () => {
  it('counts distinct unknown values per kind, using the most common spelling', () => {
    const rows = computeTypedNames([
      { uid: '1', university: 'ESUT Agbani', department: '', programme: '' },
      { uid: '2', university: 'esut agbani', department: '', programme: '' },
      { uid: '3', university: 'ESUT Agbani', department: '', programme: '' },
    ], [], new Set());
    expect(rows).toEqual([{ kind: 'university', name: 'ESUT Agbani', normalizedName: 'esut agbani', count: 3 }]);
  });
});

describe('GET /api/admin/academic-catalog/typed-names', () => {
  it('lists names that are not catalogue names or aliases, with counts only', async () => {
    const response = await call(GET);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.rows).toEqual([
      { kind: 'university', name: 'ESUT Agbani', normalizedName: 'esut agbani', count: 3 },
      { kind: 'department', name: 'Comp Sci', normalizedName: 'comp sci', count: 2 },
      { kind: 'programme', name: 'B.Sc Computer Science', normalizedName: 'b.sc computer science', count: 1 },
    ]);
    expect(body).toMatchObject({ scanned: 5, truncated: false });
    expect(JSON.stringify(body)).not.toMatch(/@test\.example|Chidi/);
  });

  it('lists the students behind one name on demand, without emails', async () => {
    const body = await (await call(GET, '?kind=university&name=esut%20agbani')).json();
    expect(body.total).toBe(3);
    expect(body.students).toEqual(expect.arrayContaining([{ uid: 'a', displayName: 'Chidi O.' }, { uid: 'c', displayName: 'Bola' }]));
    expect(JSON.stringify(body)).not.toContain('@');
  });

  it('caches briefly and refreshes after an Assign', async () => {
    await call(GET);
    store.docs.set('users/f', { university: 'Brand New Uni' });
    expect((await (await call(GET)).json()).rows.some((row: { name: string }) => row.name === 'Brand New Uni')).toBe(false);
    await assign(new Request('https://app.test/x', { method: 'POST', headers: { Authorization: 'Bearer t', 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'university', name: 'ESUT Agbani', entryId: 'u-esut' }) }));
    const rows = (await (await call(GET)).json()).rows as { name: string }[];
    expect(rows.map((row) => row.name)).toEqual(expect.arrayContaining(['Brand New Uni']));
    expect(rows.map((row) => row.name)).not.toContain('ESUT Agbani');
  });

  it('rejects bad kinds and non-admins', async () => {
    expect((await call(GET, '?kind=planet&name=x')).status).toBe(400);
    state.verify.mockResolvedValue({ uid: 's', email: 'student@test.example' });
    expect((await call(GET)).status).toBe(403);
  });
});

describe('POST ignore', () => {
  it('hides a name from the table and audits it', async () => {
    const response = await call(POST, '', { action: 'ignore', kind: 'department', name: 'Comp Sci' });
    expect(response.status).toBe(200);
    const rows = (await (await call(GET)).json()).rows as { name: string }[];
    expect(rows.map((row) => row.name)).not.toContain('Comp Sci');
    const ignored = store.paths('_academic_catalog_suggestions/').map((path) => store.docs.get(path));
    expect(ignored).toEqual([expect.objectContaining({ kind: 'department', normalizedName: 'comp sci', status: 'ignored', uid: null })]);
    expect(store.paths('_admin_audit/').map((path) => store.docs.get(path).action)).toContain('academic-catalog.typed-name.ignore');
  });
});
