import { describe, expect, it } from 'vitest';
import { suggestProgrammeSplit } from '@/lib/academic-catalog/split';
import type { CatalogEntry } from '@/lib/academic-catalog/model';

const entry = (id: string, kind: CatalogEntry['kind'], name: string, aliases?: string[]): CatalogEntry => ({ id, kind, name, status: 'active', source: 'default', ...(aliases ? { aliases } : {}) });
const entries = [
  entry('p-bsc', 'programme', 'Bachelor of Science (B.Sc.)'),
  entry('p-beng', 'programme', 'Bachelor of Engineering (B.Eng.)'),
  entry('d-cs', 'department', 'Computer Science'),
  entry('d-cse', 'department', 'Computer Science Education'),
  entry('d-sci', 'department', 'Science'),
  { ...entry('d-old', 'department', 'Old Department'), status: 'archived' as const },
];

describe('suggestProgrammeSplit', () => {
  it('splits "B.Sc Computer Science" into the B.Sc. programme and the Computer Science department', () => {
    expect(suggestProgrammeSplit('B.Sc Computer Science', entries)).toEqual({ programmeId: 'p-bsc', departmentId: 'd-cs' });
  });

  it('prefers the longest department named in the text', () => {
    expect(suggestProgrammeSplit('BSc Computer Science Education', entries).departmentId).toBe('d-cse');
  });

  it('suggests only what it can find', () => {
    expect(suggestProgrammeSplit('B.Eng', entries)).toEqual({ programmeId: 'p-beng' });
    expect(suggestProgrammeSplit('Old Department stuff', entries)).toEqual({});
  });
});
