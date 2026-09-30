import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ authorize: vi.fn(), list: vi.fn(), transaction: vi.fn(), txGet: vi.fn(), txSet: vi.fn() }));
vi.mock('@/lib/api/admin-auth', () => ({ requireAdmin: state.authorize }));
vi.mock('@/lib/firebase/admin', () => ({
  adminDb: {
    collection: (name: string) => ({
      doc: (id: string) => ({ collectionName: name, id }),
      where: () => ({ limit: () => ({ get: state.list }) }),
    }),
    runTransaction: state.transaction,
  },
}));

import { GET, PATCH } from '@/app/api/admin/academic-catalog/suggestions/route';

describe('/api/admin/academic-catalog/suggestions', () => {
  beforeEach(() => {
    state.authorize.mockReset().mockResolvedValue({ uid: 'admin' });
    state.list.mockReset().mockResolvedValue({ docs: [] });
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
});
