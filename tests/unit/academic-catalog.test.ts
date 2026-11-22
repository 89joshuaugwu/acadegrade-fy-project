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

describe('catalogue aliases (alias-aware pickers)', () => {
  const defaults = {
    universities: ['University of Lagos, Lagos', 'University of Ilorin, Ilorin'],
    departments: ['Computer Science'],
    programmes: ['Bachelor of Science (B.Sc.)'],
    aliases: { universities: { 'University of Lagos, Lagos': ['UNILAG'], 'Gone University': ['GU'] }, departments: {}, programmes: {} },
  };

  it('joins live aliases with bundled seeds for names still in the list', () => {
    const merged = mergeCatalogWithDefaults({
      revision: 5,
      universities: ['University of Lagos, Lagos', 'University of Ilorin, Ilorin'],
      departments: ['Computer Science'],
      programmes: ['Bachelor of Science (B.Sc.)'],
      aliases: { universities: { 'University of Lagos, Lagos': ['Unilag', 'Akoka'], 'University of Ilorin, Ilorin': ['UNILORIN', 7] }, departments: 'bad', programmes: {} },
    } as never, defaults);
    expect(merged.aliases?.universities).toEqual({
      'University of Lagos, Lagos': ['Unilag', 'Akoka'],
      'University of Ilorin, Ilorin': ['UNILORIN'],
    });
    expect(merged.aliases?.departments).toEqual({});
  });

  it('keeps bundled seeds when the live catalogue has no aliases yet (older server)', () => {
    const merged = mergeCatalogWithDefaults({ revision: 2, universities: ['University of Lagos, Lagos'], departments: [], programmes: [] }, defaults);
    expect(merged.aliases?.universities).toEqual({ 'University of Lagos, Lagos': ['UNILAG'] });
  });
});
