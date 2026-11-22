import { describe, expect, it } from 'vitest';
import { ACADEMIC_DEPARTMENTS, ACADEMIC_PROGRAMMES, NIGERIAN_UNIVERSITIES } from '@/lib/utils/academic-data';
import { addMissingDefaultEntries } from '@/lib/academic-catalog/sync';
import { createInitialCatalog, type CatalogSnapshot } from '@/lib/academic-catalog/model';

const normalized = (name: string) => name.trim().replace(/\s+/g, ' ').toLocaleLowerCase('en');
const isSorted = (names: readonly string[]) => names.every((name, index) => index === 0 || names[index - 1].localeCompare(name, 'en') <= 0);

describe('bundled academic names', () => {
  it('lists the universities students typed in by hand', () => {
    expect(NIGERIAN_UNIVERSITIES).toEqual(expect.arrayContaining([
      'Nnamdi Azikiwe University, Awka',
      'Alvan Ikoku Federal University of Education, Owerri',
    ]));
  });

  it('lists commonly missing NUC universities', () => {
    expect(NIGERIAN_UNIVERSITIES).toEqual(expect.arrayContaining([
      'Obafemi Awolowo University, Ile-Ife',
      'University of Jos, Jos',
      'Joseph Sarwuan Tarka University, Makurdi',
      'Federal University of Allied Health Sciences, Enugu',
    ]));
  });

  it('lists the departments students typed in by hand', () => {
    expect(ACADEMIC_DEPARTMENTS).toEqual(expect.arrayContaining([
      'Business Administration', 'Law', 'Mass Communication', 'Political Science',
    ]));
  });

  it('lists commonly missing departments', () => {
    expect(ACADEMIC_DEPARTMENTS).toEqual(expect.arrayContaining([
      'Accounting', 'Civil Engineering', 'Electrical and Electronic Engineering', 'Medicine and Surgery', 'Nursing Science', 'Microbiology',
    ]));
  });

  it('keeps every previously shipped name (additive only)', () => {
    for (const name of ['Enugu State University of Science and Technology, Enugu', 'University of Ilorin, Ilorin', 'Benue State University, Makurdi']) {
      expect(NIGERIAN_UNIVERSITIES).toContain(name);
    }
    for (const name of ['Computer Science', 'Geography/Metrology', 'Estate management']) {
      expect(ACADEMIC_DEPARTMENTS).toContain(name);
    }
    expect(ACADEMIC_PROGRAMMES).toHaveLength(17);
  });

  it('has no case-insensitive duplicates and stays alphabetical', () => {
    for (const list of [NIGERIAN_UNIVERSITIES, ACADEMIC_DEPARTMENTS]) {
      expect(new Set(list.map(normalized)).size).toBe(list.length);
      expect(isSorted(list)).toBe(true);
    }
  });
});

describe('addMissingDefaultEntries', () => {
  const stored: CatalogSnapshot = {
    revision: 2,
    entries: [
      ...createInitialCatalog({ universities: ['Abia State University, Uturu', 'University of Uyo, Uyo'], departments: ['Computer Science', 'Law'], programmes: ['Bachelor of Science (B.Sc.)'] }).entries,
      { id: 'admin-1', kind: 'department', name: 'Mass Communication', status: 'active', source: 'admin' },
    ],
  };
  stored.entries.find((entry) => entry.name === 'Law')!.status = 'archived';

  const defaults = {
    universities: ['Abia State University, Uturu', 'Nnamdi Azikiwe University, Awka', 'University of Uyo, Uyo'],
    departments: ['Accounting', 'Computer Science', 'Law', 'Mass communication'],
    programmes: ['Bachelor of Science (B.Sc.)'],
  };

  it('adds new defaults in alphabetical position with the default id scheme', () => {
    const { snapshot, added } = addMissingDefaultEntries(stored, defaults);
    expect(added).toEqual([
      { kind: 'university', name: 'Nnamdi Azikiwe University, Awka' },
      { kind: 'department', name: 'Accounting' },
    ]);
    expect(snapshot.revision).toBe(3);
    const universities = snapshot.entries.filter((entry) => entry.kind === 'university').map((entry) => entry.name);
    expect(universities).toEqual(['Abia State University, Uturu', 'Nnamdi Azikiwe University, Awka', 'University of Uyo, Uyo']);
    const expectedId = createInitialCatalog({ universities: ['Nnamdi Azikiwe University, Awka'], departments: [], programmes: [] }).entries[0].id;
    expect(snapshot.entries.find((entry) => entry.name === 'Nnamdi Azikiwe University, Awka')).toEqual({
      id: expectedId, kind: 'university', name: 'Nnamdi Azikiwe University, Awka', status: 'active', source: 'default',
    });
  });

  it('never restores archived names, duplicates admin names, or touches existing entries', () => {
    const { snapshot } = addMissingDefaultEntries(stored, defaults);
    expect(snapshot.entries.find((entry) => entry.name === 'Law')!.status).toBe('archived');
    expect(snapshot.entries.filter((entry) => normalized(entry.name) === 'mass communication')).toHaveLength(1);
    for (const entry of stored.entries) expect(snapshot.entries).toContainEqual(entry);
  });

  it('returns the snapshot unchanged when nothing is missing', () => {
    const { snapshot, added } = addMissingDefaultEntries(stored, { universities: [], departments: ['law'], programmes: [] });
    expect(added).toEqual([]);
    expect(snapshot).toBe(stored);
  });
});
