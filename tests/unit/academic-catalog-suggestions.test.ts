import { describe, expect, it } from 'vitest';
import { missingAcademicNames } from '@/lib/academic-catalog/suggestions';

const catalog = { universities: ['University of Lagos'], departments: ['Computer Science'], programmes: ['Bachelor of Science (B.Sc.)'] };

describe('missing academic names', () => {
  it('suggests only profile names absent from curated options', () => {
    expect(missingAcademicNames({ university: 'University of Lagos', department: 'Computer Engineering', programme: 'Bachelor of Science (B.Sc.)' }, catalog))
      .toEqual([{ kind: 'department', name: 'Computer Engineering' }]);
  });

  it('ignores case and extra whitespace in existing options', () => {
    expect(missingAcademicNames({ university: '  university OF lagos  ', department: 'Computer Science', programme: 'Bachelor of Science (B.Sc.)' }, catalog))
      .toEqual([]);
  });
});
