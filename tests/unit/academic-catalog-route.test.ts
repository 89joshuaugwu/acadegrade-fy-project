import { beforeEach, describe, expect, it, vi } from 'vitest';

const firebase = vi.hoisted(() => ({ catalogGet: vi.fn() }));
vi.mock('@/lib/firebase/admin', () => ({
  adminDb: { collection: () => ({ doc: () => ({ get: firebase.catalogGet }) }) },
}));

import { GET } from '@/app/api/academic-catalog/route';

describe('GET /api/academic-catalog', () => {
  beforeEach(() => firebase.catalogGet.mockReset());

  it('serves bundled names when no catalog document exists', async () => {
    firebase.catalogGet.mockResolvedValue({ exists: false });
    const response = await GET();
    expect(response.status).toBe(200);
    const catalog = await response.json();
    expect(catalog.departments).toContain('Computer Engineering');
    expect(catalog.programmes).toContain('Bachelor of Engineering (B.Eng.)');
    expect(catalog.universities.length).toBeGreaterThan(20);
  });

  it('hides archived entries from public registration choices', async () => {
    firebase.catalogGet.mockResolvedValue({ exists: true, data: () => ({ revision: 3, entries: [
      { id: 'a', kind: 'department', name: 'Computer Science', status: 'archived', source: 'default' },
      { id: 'b', kind: 'department', name: 'Computer Engineering', status: 'active', source: 'admin' },
    ] }) });
    const response = await GET();
    const catalog = await response.json();
    expect(catalog.revision).toBe(3);
    expect(catalog.departments).toEqual(['Computer Engineering']);
  });
});
