import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { searchAcademicNames } from '@/lib/utils/academic-search';
import { ACADEMIC_ALIASES, ACADEMIC_PROGRAMMES, NIGERIAN_UNIVERSITIES } from '@/lib/utils/academic-data';

const ESUT = 'Enugu State University of Science and Technology, Enugu';
const unis = NIGERIAN_UNIVERSITIES;
const uniAliases = ACADEMIC_ALIASES.universities;

describe('searchAcademicNames', () => {
  it('finds ESUT by its short name and by "ESUT Agbani"', () => {
    expect(searchAcademicNames(unis, 'ESUT', uniAliases)[0]).toBe(ESUT);
    expect(searchAcademicNames(unis, 'esut agbani', uniAliases)[0]).toBe(ESUT);
    expect(searchAcademicNames(unis, 'ESUT  Agbani campus', uniAliases)[0]).toBe(ESUT);
  });

  it('finds UNILAG and Unilorin', () => {
    expect(searchAcademicNames(unis, 'UNILAG', uniAliases)[0]).toBe('University of Lagos, Lagos');
    expect(searchAcademicNames(unis, 'Unilorin', uniAliases)[0]).toBe('University of Ilorin, Ilorin');
  });

  it('ranks name prefixes before plain contains matches', () => {
    expect(searchAcademicNames(['Ibadan Poly', 'University of Ibadan, Ibadan'], 'ibadan')).toEqual(['Ibadan Poly', 'University of Ibadan, Ibadan']);
  });

  it('ignores punctuation so "bsc" finds (B.Sc.)', () => {
    expect(searchAcademicNames(ACADEMIC_PROGRAMMES, 'bsc')).toContain('Bachelor of Science (B.Sc.)');
  });

  it('returns everything (up to max) for an empty query and puts an exact name first', () => {
    expect(searchAcademicNames(['A one', 'B two', 'C three'], '', undefined, 2)).toEqual(['A one', 'B two']);
    expect(searchAcademicNames(['Law Enforcement', 'Law'], 'law')).toEqual(['Law', 'Law Enforcement']);
  });

  it('tolerates missing or malformed alias maps (fail open)', () => {
    expect(searchAcademicNames(unis, 'Lagos', { [ESUT]: 'nope' } as never).length).toBeGreaterThan(0);
  });
});

describe('ACADEMIC_ALIASES seeds', () => {
  it('only names real bundled entries and never reuses an alias for two entries', () => {
    const lists = { universities: NIGERIAN_UNIVERSITIES, programmes: ACADEMIC_PROGRAMMES } as const;
    for (const [kind, map] of Object.entries(ACADEMIC_ALIASES)) {
      const seen = new Map<string, string>();
      for (const [name, aliases] of Object.entries(map)) {
        if (kind in lists) expect(lists[kind as keyof typeof lists]).toContain(name);
        for (const alias of aliases) {
          const key = alias.toLowerCase();
          expect(seen.get(key), `${alias} used twice`).toBeUndefined();
          seen.set(key, name);
        }
      }
    }
  });

  it('covers the common short names', () => {
    const all = Object.values(uniAliases).flat().map((alias) => alias.toUpperCase());
    for (const alias of ['ESUT', 'UNN', 'UNILAG', 'UI', 'OAU', 'ABU', 'UNIBEN', 'UNILORIN', 'UNIPORT', 'UNIZIK', 'FUTO', 'FUTA', 'LASU', 'UNICAL', 'UNIUYO', 'UNIJOS', 'BUK']) {
      expect(all).toContain(alias);
    }
  });
});

describe('shared files stay byte-identical with Android', () => {
  const mobile = path.resolve(__dirname, '../../../acadegrade-mobile/lib/data');
  const hash = (file: string) => createHash('sha256').update(readFileSync(file)).digest('hex');
  it.each([
    ['lib/utils/academic-data.ts', 'academic-data.ts'],
    ['lib/utils/academic-search.ts', 'academic-search.ts'],
  ])('%s', (web, android) => {
    let other: string;
    try { other = hash(path.join(mobile, android)); } catch { return; } // Android repo not checked out next to web.
    expect(hash(path.resolve(__dirname, '../..', web))).toBe(other);
  });
});
