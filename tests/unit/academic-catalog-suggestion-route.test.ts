import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const state = vi.hoisted(() => ({ getUser: vi.fn(), limit: vi.fn(), create: vi.fn() }));
vi.mock('@/lib/api/auth', () => ({ getVerifiedApiUser: state.getUser }));
vi.mock('@/lib/api/rate-limit', () => ({ checkRateLimit: state.limit }));
vi.mock('@/lib/firebase/admin', () => ({ adminDb: { collection: () => ({ doc: () => ({ create: state.create }) }) } }));

import { POST } from '@/app/api/academic-catalog/suggestions/route';

function request(body: unknown) {
  return new NextRequest('https://example.com/api/academic-catalog/suggestions', { method: 'POST', body: JSON.stringify(body) });
}

describe('academic catalog suggestions', () => {
  beforeEach(() => {
    state.getUser.mockReset().mockResolvedValue({ uid: 'student-1' });
    state.limit.mockReset().mockResolvedValue({ allowed: true });
    state.create.mockReset().mockResolvedValue(undefined);
  });

  it('requires a signed-in student', async () => {
    state.getUser.mockResolvedValueOnce(null);
    expect((await POST(request({ kind: 'department', name: 'Computer Engineering' }))).status).toBe(401);
    expect(state.create).not.toHaveBeenCalled();
  });

  it('rejects markup and does not publish it', async () => {
    expect((await POST(request({ kind: 'department', name: '<script>' }))).status).toBe(400);
    expect(state.create).not.toHaveBeenCalled();
  });

  it('accepts a bounded suggestion for later admin review', async () => {
    const response = await POST(request({ kind: 'department', name: 'Data Engineering' }));
    expect(response.status).toBe(202);
    expect(state.create).toHaveBeenCalledWith(expect.objectContaining({
      kind: 'department', name: 'Data Engineering', status: 'pending', uid: 'student-1',
    }));
  });
});
