import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ authorize: vi.fn(), get: vi.fn(), set: vi.fn(), runTransaction: vi.fn() }));
vi.mock('@/lib/api/admin-auth', () => ({
  requireAdmin: state.authorize,
  AdminAuthorizationError: class AdminAuthorizationError extends Error { constructor(public status: number) { super('Unauthorized'); } },
}));
vi.mock('@/lib/firebase/admin', () => ({
  adminDb: {
    collection: () => ({ doc: () => ({ get: state.get }) }),
    runTransaction: state.runTransaction,
  },
}));

import { GET, PATCH } from '@/app/api/admin/academic-catalog/route';

describe('/api/admin/academic-catalog', () => {
  beforeEach(() => {
    state.authorize.mockReset().mockResolvedValue({ uid: 'admin', email: 'admin@example.com' });
    state.get.mockReset().mockResolvedValue({ exists: false });
    state.set.mockReset();
    state.runTransaction.mockImplementation(async (callback) => callback({ get: state.get, set: state.set }));
  });

  it('does not expose catalog administration to an unauthenticated caller', async () => {
    state.authorize.mockRejectedValueOnce(Object.assign(new Error('Unauthorized'), { status: 401 }));
    const response = await GET(new Request('https://example.com/api/admin/academic-catalog'));
    expect(response.status).toBe(401);
  });

  it('lists bundled defaults for the admin before any edit', async () => {
    const response = await GET(new Request('https://example.com/api/admin/academic-catalog'));
    expect(response.status).toBe(200);
    expect((await response.json()).entries.some((entry: { name: string }) => entry.name === 'Computer Engineering')).toBe(true);
  });

  it('stores an added name as one revisioned transaction', async () => {
    const response = await PATCH(new Request('https://example.com/api/admin/academic-catalog', {
      method: 'PATCH', body: JSON.stringify({ action: 'add', kind: 'department', name: 'Data Engineering' }),
    }));
    expect(response.status).toBe(200);
    expect(state.set).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ revision: 2, entries: expect.arrayContaining([
      expect.objectContaining({ name: 'Data Engineering', kind: 'department', status: 'active' }),
    ]) }));
  });
});
