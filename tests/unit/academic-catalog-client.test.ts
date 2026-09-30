import { describe, expect, it, vi } from 'vitest';
import { loadAcademicCatalog } from '@/lib/academic-catalog/client';

describe('registration academic catalog loading', () => {
  it('uses managed choices when available, including archived-default removal', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({
      revision: 4, universities: ['Test University'], departments: ['Computer Engineering'], programmes: ['Bachelor of Engineering (B.Eng.)'],
    }) });
    const names = await loadAcademicCatalog(fetcher);
    expect(names.departments).toEqual(['Computer Engineering']);
  });

  it('uses bundled choices when offline', async () => {
    const names = await loadAcademicCatalog(vi.fn().mockRejectedValue(new Error('offline')));
    expect(names.departments).toContain('Computer Engineering');
    expect(names.universities.length).toBeGreaterThan(20);
  });
});
