import { beforeEach, describe, expect, it, vi } from 'vitest';
import { queryTestDb } from './query-test-db';

const state = vi.hoisted(() => ({ db: null as any, requireAdmin: vi.fn(), audit: vi.fn() }));
vi.mock('@/lib/firebase/admin', () => ({ get adminDb() { return state.db; } }));
vi.mock('@/lib/api/admin-audit', () => ({ writeAdminAudit: state.audit }));
vi.mock('@/lib/api/admin-auth', () => ({
  requireAdmin: state.requireAdmin,
  AdminAuthorizationError: class AdminAuthorizationError extends Error {
    constructor(public status: 401 | 403) { super(status === 401 ? 'Unauthorized' : 'Forbidden'); }
  },
}));

import { GET, POST } from '@/app/api/admin/share-codes/route';
import { AdminAuthorizationError } from '@/lib/api/admin-auth';

const ADMIN = { uid: 'admin-1', email: 'admin@test.example' };
let store: ReturnType<typeof queryTestDb>;

const post = (body: unknown) => POST(new Request('https://app.test/api/admin/share-codes', {
  method: 'POST', headers: { Authorization: 'Bearer t', 'Content-Type': 'application/json' }, body: JSON.stringify(body),
}));
const get = (query = '') => GET(new Request(`https://app.test/api/admin/share-codes${query}`, { headers: { Authorization: 'Bearer t' } }));

function code(id: string, useCount: number, extra: Record<string, unknown> = {}) {
  store.docs.set(`shareCodes/${id}`, {
    code: id, authorId: `author-${id}`, useCount, createdAt: new Date('2026-11-01T00:00:00Z'),
    courses: [{ code: 'CSC101', title: 'Intro', units: 3 }, { code: 'MTH101', title: 'Calculus', units: 4 }], ...extra,
  });
}
const catalog = () => [...store.docs.entries()].filter(([path]) => path.startsWith('courseCatalog/')).map(([, value]) => value);

beforeEach(() => {
  store = queryTestDb();
  state.db = store.db;
  state.requireAdmin.mockReset().mockResolvedValue(ADMIN);
  state.audit.mockReset().mockResolvedValue(undefined);
});

describe('GET /api/admin/share-codes', () => {
  it('requires an admin', async () => {
    state.requireAdmin.mockRejectedValue(new AdminAuthorizationError(403));
    expect((await get()).status).toBe(403);
  });

  it('lists the most used codes first with a cursor, for admins only', async () => {
    code('AAAAAA', 5); code('BBBBBB', 9); code('CCCCCC', 1, { disabled: true, disabledReason: 'spam' });
    const first = await (await get('?limit=2')).json();
    expect(first.codes.map((c: any) => c.code)).toEqual(['BBBBBB', 'AAAAAA']);
    expect(first.codes[0]).toMatchObject({ useCount: 9, disabled: false, courseCount: 2, authorId: 'author-BBBBBB' });
    expect(first.nextCursor).toBe('AAAAAA');
    const second = await (await get(`?limit=2&cursor=${first.nextCursor}`)).json();
    expect(second.codes.map((c: any) => c.code)).toEqual(['CCCCCC']);
    expect(second.codes[0]).toMatchObject({ disabled: true, disabledReason: 'spam' });
    expect(second.nextCursor).toBeNull();
  });
});

describe('POST /api/admin/share-codes', () => {
  it('rejects bad input without writing or auditing', async () => {
    code('AAAAAA', 1);
    for (const body of [
      { action: 'delete', code: 'AAAAAA', reason: 'x'.repeat(5) },
      { action: 'disable', code: 'aaaaa', reason: 'spam spam' },
      { action: 'disable', code: 'AAAAAA' },
      { action: 'disable', code: 'AAAAAA', reason: 'ab' },
      { action: 'promote', code: 'AAAAAA', reason: 'reviewed', level: 150, semester: 1, department: 'CS' },
      { action: 'promote', code: 'AAAAAA', reason: 'reviewed', level: 100, semester: 3, department: 'CS' },
      { action: 'promote', code: 'AAAAAA', reason: 'reviewed', level: 100, semester: 1, department: '' },
    ]) {
      expect((await post(body)).status, JSON.stringify(body)).toBe(400);
    }
    expect((await post({ action: 'disable', code: 'ZZZZZZ', reason: 'spam spam' })).status).toBe(404);
    expect(state.audit).not.toHaveBeenCalled();
    expect(store.docs.get('shareCodes/AAAAAA').disabled).toBeUndefined();
  });

  it('disables and re-enables a code, auditing each action', async () => {
    code('AAAAAA', 1);
    const off = await post({ action: 'disable', code: 'AAAAAA', reason: 'Offensive titles' });
    expect(off.status).toBe(200);
    expect(store.docs.get('shareCodes/AAAAAA')).toMatchObject({ disabled: true, disabledReason: 'Offensive titles', disabledBy: ADMIN.email });
    expect(store.docs.get('shareCodes/AAAAAA').authorId).toBe('author-AAAAAA');
    expect(state.audit).toHaveBeenLastCalledWith(expect.objectContaining({
      actorEmail: ADMIN.email, actorUid: ADMIN.uid, action: 'share_codes.disable', target: 'shareCodes/AAAAAA',
    }));
    const on = await post({ action: 'enable', code: 'AAAAAA', reason: 'False alarm' });
    expect(on.status).toBe(200);
    expect(store.docs.get('shareCodes/AAAAAA').disabled).toBe(false);
    expect(state.audit).toHaveBeenLastCalledWith(expect.objectContaining({ action: 'share_codes.enable' }));
    expect(state.audit).toHaveBeenCalledTimes(2);
  });

  it('promotes reviewed rows into the course catalogue once, skipping duplicates', async () => {
    code('AAAAAA', 1);
    const body = { action: 'promote', code: 'AAAAAA', reason: 'Checked against the handbook', department: 'Computer Science', level: 100, semester: 1 };
    const first = await (await post(body)).json();
    expect(first).toMatchObject({ promoted: 2, skipped: 0 });
    expect(catalog()).toHaveLength(2);
    expect(catalog()[0]).toMatchObject({ code: 'CSC101', title: 'Intro', units: 3, department: 'Computer Science', level: 100, semester: 1 });
    expect(JSON.stringify(catalog())).not.toContain('author-AAAAAA');
    const again = await (await post(body)).json();
    expect(again).toMatchObject({ promoted: 0, skipped: 2 });
    expect(catalog()).toHaveLength(2);
    expect(state.audit).toHaveBeenCalledWith(expect.objectContaining({ action: 'share_codes.promote', target: 'shareCodes/AAAAAA' }));
    expect(store.docs.get('shareCodes/AAAAAA').promotedAt).toBeTruthy();
  });

  it('promotes only the chosen course codes when given', async () => {
    code('AAAAAA', 1);
    const result = await (await post({ action: 'promote', code: 'AAAAAA', reason: 'Reviewed', department: 'CS', level: 200, semester: 2, courseCodes: ['MTH101'] })).json();
    expect(result.promoted).toBe(1);
    expect(catalog().map((c: any) => c.code)).toEqual(['MTH101']);
  });
});
