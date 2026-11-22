import { beforeEach, describe, expect, it, vi } from 'vitest';
import { queryTestDb } from './query-test-db';

const state = vi.hoisted(() => ({ db: null as any, verify: vi.fn(), unread: new Map<string, number>() }));
vi.mock('@/lib/firebase/admin', () => ({
  get adminDb() { return state.db; },
  adminAuth: { verifyIdToken: state.verify },
  adminRtdb: {
    ref: (path: string) => ({
      transaction: async (update: (value: number | null) => number) => {
        state.unread.set(path, update(state.unread.get(path) ?? null));
      },
    }),
  },
}));

import { POST as assign } from '@/app/api/admin/academic-catalog/assign/route';
import { POST as undo } from '@/app/api/admin/academic-catalog/assign/undo/route';

const ESUT = 'Enugu State University of Science and Technology, Enugu';
const BSC = 'Bachelor of Science (B.Sc.)';
let store: ReturnType<typeof queryTestDb>;
const req = (body: unknown) => new Request('https://app.test/api/admin/academic-catalog/assign', {
  method: 'POST', headers: { Authorization: 'Bearer admin-token', 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});
const user = (uid: string) => store.docs.get(`users/${uid}`);
const inbox = (uid: string) => store.paths(`notifications/${uid}/items/`).map((path) => store.docs.get(path));
const audits = () => store.paths('_admin_audit/').map((path) => store.docs.get(path));
const catalogEntry = (id: string) => store.docs.get('config/academicCatalog').entries.find((entry: { id: string }) => entry.id === id);

beforeEach(() => {
  store = queryTestDb(); state.db = store.db; state.unread.clear();
  store.docs.set('config/admins', { emails: ['boss@test.example'] });
  state.verify.mockReset().mockResolvedValue({ uid: 'boss-uid', email: 'boss@test.example' });
  store.docs.set('config/academicCatalog', { revision: 7, entries: [
    { id: 'u-esut', kind: 'university', name: ESUT, status: 'active', source: 'default' },
    { id: 'u-lag', kind: 'university', name: 'University of Lagos, Lagos', status: 'active', source: 'default', aliases: ['UNILAG'] },
    { id: 'd-cs', kind: 'department', name: 'Computer Science', status: 'active', source: 'default' },
    { id: 'p-bsc', kind: 'programme', name: BSC, status: 'active', source: 'default' },
  ] });
  store.docs.set('users/s1', { fullName: 'Chidi Okafor', email: 's1@test.example', university: 'ESUT Agbani', department: 'Law', programme: 'LL.B' });
  store.docs.set('users/s2', { fullName: 'Ada Obi', university: 'esut  agbani', department: 'Law', programme: 'LL.B' });
  store.docs.set('users/s3', { fullName: 'Bola Ade', university: 'University of Lagos, Lagos', department: 'Law', programme: 'LL.B' });
  store.docs.set('_academic_catalog_suggestions/sug1', { uid: 's1', kind: 'university', name: 'ESUT Agbani', normalizedName: 'esut agbani', status: 'pending' });
  store.docs.set('_academic_catalog_suggestions/sug2', { uid: 's2', kind: 'university', name: 'ESUT agbani', normalizedName: 'esut agbani', status: 'pending' });
});

describe('POST /api/admin/academic-catalog/assign', () => {
  it('needs an admin', async () => {
    state.verify.mockResolvedValue({ uid: 'x', email: 'student@test.example' });
    expect((await assign(req({ suggestionId: 'sug1', entryId: 'u-esut' }))).status).toBe(403);
  });

  it('assigns a suggestion: fixes every matching profile, adds the alias, notifies, audits with undo data', async () => {
    const response = await assign(req({ suggestionId: 'sug1', entryId: 'u-esut' }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({ changedCount: 2, aliasAdded: true, entryName: ESUT, assignmentId: expect.any(String) });

    expect(user('s1').university).toBe(ESUT);
    expect(user('s2').university).toBe(ESUT);
    expect(user('s3').university).toBe('University of Lagos, Lagos');
    expect(catalogEntry('u-esut').aliases).toEqual(['ESUT Agbani']);
    expect(store.docs.get('config/academicCatalog').revision).toBe(8);

    expect(store.docs.get('_academic_catalog_suggestions/sug1')).toMatchObject({ status: 'assigned', matchedEntryId: 'u-esut', assignmentId: body.assignmentId });
    expect(store.docs.get('_academic_catalog_suggestions/sug2')).toMatchObject({ status: 'assigned', matchedEntryId: 'u-esut' });

    expect(inbox('s1')).toEqual([expect.objectContaining({
      title: 'Your university was updated',
      message: `We matched your university to ${ESUT}. If that's not right, contact us from Help & support in Settings.`,
      type: 'system', read: false, actionUrl: '/settings', createdAt: expect.any(Date),
    })]);
    expect(state.unread.get('notif_counts/s1/unread')).toBe(1);

    const record = audits().find((audit) => audit.action === 'academic-catalog.assign');
    expect(record).toMatchObject({ actorEmail: 'boss@test.example', target: 'config/academicCatalog#u-esut' });
    expect(record.after.changes).toEqual({
      s1: { before: { university: 'ESUT Agbani' }, notificationId: expect.any(String) },
      s2: { before: { university: 'esut  agbani' }, notificationId: expect.any(String) },
    });
    expect(JSON.stringify(record)).not.toContain('s1@test.example');
  });

  it('with "update everyone" off changes only the suggesting student', async () => {
    const body = await (await assign(req({ suggestionId: 'sug1', entryId: 'u-esut', updateAll: false }))).json();
    expect(body.changedCount).toBe(1);
    expect(user('s2').university).toBe('esut  agbani');
    expect(store.docs.get('_academic_catalog_suggestions/sug2').status).toBe('pending');
  });

  it('assigns a typed name from the table (no suggestion) and matches legacy dept', async () => {
    store.docs.set('users/s4', { fullName: 'Old Account', dept: 'Comp Sci' });
    store.docs.set('users/s5', { fullName: 'New Account', department: 'comp sci' });
    const body = await (await assign(req({ kind: 'department', name: 'Comp Sci', entryId: 'd-cs' }))).json();
    expect(body.changedCount).toBe(2);
    expect(user('s4').department).toBe('Computer Science');
    expect(user('s5').department).toBe('Computer Science');
    expect(inbox('s4')[0].message).toBe('We matched your department to Computer Science. You can change this in Settings.');
  });

  it('splits a programme into programme plus department without overwriting a different department', async () => {
    store.docs.set('users/p1', { fullName: 'Ngozi Eze', programme: 'B.Sc Computer Science', department: '' });
    store.docs.set('users/p2', { fullName: 'Tunde Bello', programme: 'b.sc computer science', department: 'Mathematics' });
    const body = await (await assign(req({ kind: 'programme', name: 'B.Sc Computer Science', entryId: 'p-bsc', departmentEntryId: 'd-cs' }))).json();
    expect(body.changedCount).toBe(2);
    expect(user('p1')).toMatchObject({ programme: BSC, department: 'Computer Science' });
    expect(user('p2')).toMatchObject({ programme: BSC, department: 'Mathematics' });
    expect(inbox('p1')[0].message).toBe(`We matched your programme to ${BSC} and your department to Computer Science. You can change this in Settings.`);
    expect(inbox('p2')[0].message).toBe(`We matched your programme to ${BSC}. You can change this in Settings.`);
    expect(catalogEntry('p-bsc').aliases).toEqual(['B.Sc Computer Science']);
    expect(catalogEntry('d-cs').aliases).toBeUndefined();
  });

  it('refuses an alias that already belongs to another entry, and writes nothing', async () => {
    store.docs.set('users/s6', { university: 'UNILAG' });
    const response = await assign(req({ kind: 'university', name: 'UNILAG', entryId: 'u-esut' }));
    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/already used for University of Lagos/);
    expect(user('s6').university).toBe('UNILAG');
    expect(store.docs.get('config/academicCatalog').revision).toBe(7);
  });

  it('rejects a wrong-kind entry, an archived entry, a reviewed suggestion and a split on a non-programme', async () => {
    expect((await assign(req({ suggestionId: 'sug1', entryId: 'd-cs' }))).status).toBe(400);
    expect((await assign(req({ kind: 'university', name: 'ESUT Agbani', entryId: 'u-esut', departmentEntryId: 'd-cs' }))).status).toBe(400);
    expect((await assign(req({ suggestionId: 'missing', entryId: 'u-esut' }))).status).toBe(400);
    await assign(req({ suggestionId: 'sug1', entryId: 'u-esut' }));
    expect((await assign(req({ suggestionId: 'sug1', entryId: 'u-esut' }))).status).toBe(400);
  });
});

describe('POST /api/admin/academic-catalog/assign/undo', () => {
  it('restores profiles, removes the alias and inbox items, reopens suggestions, and audits', async () => {
    const { assignmentId } = await (await assign(req({ suggestionId: 'sug1', entryId: 'u-esut' }))).json();
    const response = await undo(req({ assignmentId }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ restoredCount: 2, keptCount: 0 });
    expect(user('s1').university).toBe('ESUT Agbani');
    expect(user('s2').university).toBe('esut  agbani');
    expect(catalogEntry('u-esut').aliases).toEqual([]);
    expect(inbox('s1')).toEqual([]);
    expect(state.unread.get('notif_counts/s1/unread')).toBe(0);
    expect(store.docs.get('_academic_catalog_suggestions/sug1').status).toBe('pending');
    expect(store.docs.get('_academic_catalog_suggestions/sug2').status).toBe('pending');
    expect(store.docs.get(`_academic_catalog_assignments/${assignmentId}`).status).toBe('undone');
    expect(audits().map((audit) => audit.action)).toContain('academic-catalog.assign.undo');
  });

  it('keeps a profile the student has changed since, and can only run once', async () => {
    const { assignmentId } = await (await assign(req({ suggestionId: 'sug1', entryId: 'u-esut' }))).json();
    store.docs.set('users/s2', { ...user('s2'), university: 'University of Lagos, Lagos' });
    expect(await (await undo(req({ assignmentId }))).json()).toMatchObject({ restoredCount: 1, keptCount: 1 });
    expect(user('s2').university).toBe('University of Lagos, Lagos');
    expect((await undo(req({ assignmentId }))).status).toBe(400);
  });

  it('rejects a malformed or unknown id', async () => {
    expect((await undo(req({ assignmentId: '../x' }))).status).toBe(400);
    expect((await undo(req({ assignmentId: 'nope' }))).status).toBe(400);
  });
});
