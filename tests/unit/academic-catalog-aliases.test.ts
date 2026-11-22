import { describe, expect, it } from 'vitest';
import { MAX_ALIASES_PER_ENTRY, addAliasToEntry, cleanAlias, knownNameKeys, removeAliasFromEntry, seedAliases } from '@/lib/academic-catalog/aliases';
import type { CatalogEntry } from '@/lib/academic-catalog/model';

const ESUT = 'Enugu State University of Science and Technology, Enugu';
const entries = (): CatalogEntry[] => [
  { id: 'u1', kind: 'university', name: ESUT, status: 'active', source: 'default' },
  { id: 'u2', kind: 'university', name: 'University of Lagos, Lagos', status: 'active', source: 'default', aliases: ['UNILAG'] },
  { id: 'd1', kind: 'department', name: 'Computer Science', status: 'active', source: 'default' },
  { id: 'u3', kind: 'university', name: 'Old College', status: 'archived', source: 'admin' },
];

describe('cleanAlias', () => {
  it('trims, folds spaces and rejects markup or bad lengths', () => {
    expect(cleanAlias('  ESUT   Agbani ')).toBe('ESUT Agbani');
    expect(() => cleanAlias('x')).toThrow(/alias/i);
    expect(() => cleanAlias('a'.repeat(81))).toThrow(/alias/i);
    expect(() => cleanAlias('<b>ESUT</b>')).toThrow(/alias/i);
  });
});

describe('addAliasToEntry', () => {
  it('adds a cleaned alias without touching the input', () => {
    const input = entries();
    const result = addAliasToEntry(input, 'u1', ' ESUT  Agbani ');
    expect(result.added).toBe(true);
    expect(result.entries[0].aliases).toEqual(['ESUT Agbani']);
    expect(input[0].aliases).toBeUndefined();
  });

  it('skips an alias the entry already has, or its own name', () => {
    expect(addAliasToEntry(entries(), 'u2', 'unilag')).toMatchObject({ added: false, reason: 'already-there' });
    expect(addAliasToEntry(entries(), 'u2', 'university of lagos,  lagos')).toMatchObject({ added: false, reason: 'matches-name' });
  });

  it('refuses an alias that is another entry\'s name or alias of the same kind', () => {
    expect(() => addAliasToEntry(entries(), 'u1', 'UNILAG')).toThrow(/already .*University of Lagos/);
    expect(() => addAliasToEntry(entries(), 'u1', 'University of Lagos, Lagos')).toThrow(/already/);
    // Other kinds do not clash.
    expect(addAliasToEntry(entries(), 'u1', 'Computer Science').added).toBe(true);
  });

  it('stops at the cap', () => {
    const list = entries();
    list[0].aliases = Array.from({ length: MAX_ALIASES_PER_ENTRY }, (_, index) => `Alias ${index}`);
    expect(addAliasToEntry(list, 'u1', 'ESUT')).toMatchObject({ added: false, reason: 'cap' });
  });

  it('rejects an unknown entry', () => {
    expect(() => addAliasToEntry(entries(), 'nope', 'ESUT')).toThrow(/not found/i);
  });
});

describe('removeAliasFromEntry', () => {
  it('removes by normalised compare', () => {
    const result = removeAliasFromEntry(entries(), 'u2', ' unilag ');
    expect(result.removed).toBe(true);
    expect(result.entries[1].aliases).toEqual([]);
    expect(removeAliasFromEntry(entries(), 'u1', 'ESUT').removed).toBe(false);
  });
});

describe('knownNameKeys', () => {
  it('holds active names and aliases of one kind, normalised', () => {
    const keys = knownNameKeys(entries(), 'university');
    expect(keys.has('unilag')).toBe(true);
    expect(keys.has(ESUT.toLowerCase())).toBe(true);
    expect(keys.has('computer science')).toBe(false);
    expect(keys.has('old college')).toBe(false);
  });
});

describe('seedAliases', () => {
  it('adds seeded aliases to matching entries, skips conflicts and missing names, bumps the revision once', () => {
    const result = seedAliases({ revision: 4, entries: entries() }, {
      universities: { [ESUT]: ['ESUT', 'ESUT Agbani'], 'University of Lagos, Lagos': ['UNILAG'], 'Missing University': ['MU'], 'Old College': ['UNILAG'] },
      departments: {},
      programmes: {},
    });
    expect(result.snapshot.revision).toBe(5);
    expect(result.added).toEqual([
      { kind: 'university', name: ESUT, alias: 'ESUT' },
      { kind: 'university', name: ESUT, alias: 'ESUT Agbani' },
    ]);
    expect(result.skipped).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'Missing University', reason: 'no-entry' }),
      expect.objectContaining({ name: 'Old College', reason: 'conflict' }),
    ]));
  });

  it('returns the same snapshot when nothing is new', () => {
    const snapshot = { revision: 2, entries: entries() };
    expect(seedAliases(snapshot, { universities: { 'University of Lagos, Lagos': ['UNILAG'] }, departments: {}, programmes: {} }).snapshot).toBe(snapshot);
  });
});
