import { describe, expect, it } from 'vitest';
import { mergeCatalogWithDefaults } from '@/lib/academic-catalog/merge';
import { ACADEMIC_DEPARTMENTS } from '@/lib/utils/academic-data';

describe('academic catalog suggestions', () => {
  const defaults = {
    universities: ['University of Lagos, Lagos'],
    departments: ['Computer Science'],
    programmes: ['Bachelor of Science (B.Sc.)'],
  };

  it('includes a missing engineering department in bundled defaults', () => {
    expect(ACADEMIC_DEPARTMENTS).toContain('Computer Engineering');
  });

  it('adds active managed names without duplicating bundled names', () => {
    expect(mergeCatalogWithDefaults({
      revision: 2,
      universities: ['university of lagos, lagos', 'New University'],
      departments: ['Computer Science', 'Computer Engineering'],
      programmes: ['Bachelor of Science (B.Sc.)'],
    }, defaults)).toEqual({
      universities: ['University of Lagos, Lagos', 'New University'],
      departments: ['Computer Science', 'Computer Engineering'],
      programmes: ['Bachelor of Science (B.Sc.)'],
    });
  });

  it('uses bundled defaults when the remote catalog is unavailable', () => {
    expect(mergeCatalogWithDefaults(null, defaults)).toEqual(defaults);
  });

  it('does not restore a default name that the managed catalog archived', () => {
    expect(mergeCatalogWithDefaults({
      revision: 3,
      universities: ['University of Lagos, Lagos'],
      departments: ['Computer Engineering'],
      programmes: ['Bachelor of Science (B.Sc.)'],
    }, defaults).departments).toEqual(['Computer Engineering']);
  });
});
