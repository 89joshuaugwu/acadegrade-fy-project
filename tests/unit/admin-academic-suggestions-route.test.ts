import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ authorize: vi.fn(), list: vi.fn(), transaction: vi.fn(), txGet: vi.fn(), txSet: vi.fn(), getAll: vi.fn() }));
vi.mock('@/lib/api/admin-auth', () => ({ requireAdmin: state.authorize }));
vi.mock('@/lib/firebase/admin', () => ({
  adminDb: {
    collection: (name: string) => ({
      doc: (id: string) => ({ collectionName: name, id }),
      where: () => ({ limit: () => ({ get: state.list }) }),
    }),
    runTransaction: state.transaction,
    getAll: state.getAll,
  },
}));

import { GET, PATCH } from '@/app/api/admin/academic-catalog/suggestions/route';

describe('/api/admin/academic-catalog/suggestions', () => {
  beforeEach(() => {
    state.authorize.mockReset().mockResolvedValue({ uid: 'admin' });
    state.list.mockReset().mockResolvedValue({ docs: [] });
    state.getAll.mockReset().mockResolvedValue([]);
    state.txGet.mockReset().mockImplementation(async (ref: { collectionName: string }) => ref.collectionName === 'config'
      ? { exists: false }
      : { exists: true, data: () => ({ uid: 'student', kind: 'department', name: 'Data Engineering', status: 'pending' }) });
    state.txSet.mockReset();
    state.transaction.mockReset().mockImplementation(async (callback) => callback({ get: state.txGet, set: state.txSet }));
  });

  it('lists pending suggestions for admins', async () => {
    state.list.mockResolvedValueOnce({ docs: [{ id: 's1', data: () => ({ kind: 'department', name: 'Data Engineering', status: 'pending' }) }] });
    const response = await GET(new Request('https://example.com/api/admin/academic-catalog/suggestions'));
    expect(response.status).toBe(200);
    expect((await response.json()).suggestions).toEqual([expect.objectContaining({ id: 's1', name: 'Data Engineering' })]);
  });

  it('approves a suggestion and publishes it transactionally', async () => {
    const response = await PATCH(new Request('https://example.com/api/admin/academic-catalog/suggestions', {
      method: 'PATCH', body: JSON.stringify({ id: 's1', action: 'approve' }),
    }));
    expect(response.status).toBe(200);
    expect(state.txSet).toHaveBeenCalledTimes(2);
    expect(state.txSet).toHaveBeenCalledWith(expect.objectContaining({ collectionName: 'config' }), expect.objectContaining({ entries: expect.arrayContaining([expect.objectContaining({ name: 'Data Engineering' })]) }));
  });

  it('shows the student as a short display name, never an email', async () => {
    state.list.mockResolvedValueOnce({ docs: [
      { id: 's1', data: () => ({ uid: 'u1', kind: 'university', name: 'ESUT Agbani', status: 'pending' }) },
      { id: 's2', data: () => ({ uid: 'u2', kind: 'university', name: 'ESUT', status: 'pending' }) },
    ] });
    state.getAll.mockResolvedValueOnce([
      { id: 'u1', exists: true, data: () => ({ fullName: 'Chidi Okafor', email: 'chidi@test.example' }) },
      { id: 'u2', exists: false, data: () => undefined },
    ]);
    const body = await (await GET(new Request('https://example.com/api/admin/academic-catalog/suggestions'))).json();
    expect(body.suggestions.map((item: { suggestedBy: string }) => item.suggestedBy)).toEqual(['Chidi O.', 'A student']);
    expect(JSON.stringify(body)).not.toContain('chidi@');
  });

  it('still lists suggestions when names cannot be read', async () => {
    state.list.mockResolvedValueOnce({ docs: [{ id: 's1', data: () => ({ uid: 'u1', kind: 'university', name: 'X Uni', status: 'pending' }) }] });
    state.getAll.mockRejectedValueOnce(new Error('down'));
    const body = await (await GET(new Request('https://example.com/api/admin/academic-catalog/suggestions'))).json();
    expect(body.suggestions[0]).toMatchObject({ id: 's1', suggestedBy: null });
  });
});
