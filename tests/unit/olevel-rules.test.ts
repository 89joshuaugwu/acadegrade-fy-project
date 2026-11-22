import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  CORE_SUBJECT_IDS,
  OLEVEL_EXAMS,
  OLEVEL_GRADES,
  OLEVEL_MAX_SITTINGS,
  OLEVEL_MAX_SUBJECTS,
  OLEVEL_MIN_YEAR,
  checkOlevelRequirements,
  combineSittings,
  compareGrades,
  countCredits,
  isCredit,
  isOlevelEntryGrade,
  isPass,
  olevelGradeFromScore,
  parseStoredOlevelRecord,
  validateOlevelRecord,
  validateSitting,
  type OlevelSitting,
  type RequirementOptions,
} from '@/lib/records/olevelRules';
import {
  ENGLISH_ID,
  MATHEMATICS_ID,
  OLEVEL_SUBJECTS,
  findOlevelSubject,
  normaliseSubjectKey,
  searchOlevelSubjects,
  subjectIdFor,
} from '@/lib/records/olevelSubjects';

/**
 * The same fixture runs in acadegrade-mobile/tests/olevel-rules.test.mjs.
 * Both suites pin this hash so the two copies cannot drift apart.
 */
const FIXTURE_SHA256 = '5366879471cdbae81868964b986d352152d7247c12dc56e33a901cb8be0ac3a7';

const raw = readFileSync(path.join(process.cwd(), 'tests/fixtures/olevel-rules.json'), 'utf8');
type Case = Record<string, unknown> & { name?: string };
const fixture = JSON.parse(raw) as Record<string, Case[]>;
const decode = (value: unknown): unknown => (value === 'NaN' ? Number.NaN : value === 'undefined' ? undefined : value);
const lf = (text: string) => text.replace(/\r\n/g, '\n');

describe('olevel-rules fixture', () => {
  it('is the byte-identical copy shared with Android', () => {
    expect(createHash('sha256').update(lf(raw)).digest('hex')).toBe(FIXTURE_SHA256);
  });

  it.each(['lib/records/olevelRules.ts', 'lib/records/olevelSubjects.ts', 'tests/fixtures/olevel-rules.json'])(
    '%s matches the Android copy when that repo is next to this one',
    (file) => {
      const sibling = path.join(process.cwd(), '..', 'acadegrade-mobile', file);
      if (!existsSync(sibling)) return;
      expect(lf(readFileSync(sibling, 'utf8'))).toBe(lf(readFileSync(path.join(process.cwd(), file), 'utf8')));
    },
  );
});

describe('grades', () => {
  it('lists the nine WAEC/NECO letters, credits A1-C6', () => {
    expect(OLEVEL_GRADES.map((g) => g.grade)).toEqual(['A1', 'B2', 'B3', 'C4', 'C5', 'C6', 'D7', 'E8', 'F9']);
    expect(OLEVEL_GRADES.filter((g) => g.kind === 'credit').map((g) => g.grade)).toEqual(['A1', 'B2', 'B3', 'C4', 'C5', 'C6']);
    expect(OLEVEL_GRADES.map((g) => g.rank)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it.each(fixture.gradeFromScore)('score $score -> $grade', (c) => {
    expect(olevelGradeFromScore(decode(c.score) as number)).toBe(c.grade);
  });

  it.each(fixture.gradeKinds)('$grade credit=$credit pass=$pass', (c) => {
    expect(isCredit(c.grade as string)).toBe(c.credit);
    expect(isPass(c.grade as string)).toBe(c.pass);
  });

  it.each(fixture.compareGrades)('$a vs $b', (c) => {
    expect(Math.sign(compareGrades(c.a as string, c.b as string))).toBe(c.sign);
  });

  it('accepts the nine letters and AR as entries, nothing else', () => {
    expect(isOlevelEntryGrade('AR')).toBe(true);
    expect(isOlevelEntryGrade('C6')).toBe(true);
    expect(isOlevelEntryGrade('c6')).toBe(false);
    expect(isOlevelEntryGrade(6)).toBe(false);
  });

  it('pins the limits and exams', () => {
    expect(OLEVEL_MAX_SITTINGS).toBe(2);
    expect(OLEVEL_MAX_SUBJECTS).toBe(9);
    expect(OLEVEL_MIN_YEAR).toBe(1988);
    expect(OLEVEL_EXAMS.map((e) => e.id)).toEqual(['waec', 'waec-gce', 'neco', 'neco-gce', 'nabteb']);
    expect(CORE_SUBJECT_IDS).toEqual([ENGLISH_ID, MATHEMATICS_ID]);
  });
});

describe('combineSittings', () => {
  it.each(fixture.combine)('$name', (c) => {
    const combined = combineSittings(c.sittings as OlevelSitting[]);
    expect(combined.map(({ subjectId, grade, sittingIndex, credit }) => ({ subjectId, grade, sittingIndex, credit }))).toEqual(c.expected);
  });

  it('keeps the winning row name and sitting id', () => {
    const [row] = combineSittings(fixture.combine[4].sittings as OlevelSitting[]);
    expect(row).toMatchObject({ name: 'Radio & TV works', sittingId: 's2' });
  });

  it('counts credits', () => {
    expect(countCredits(combineSittings(fixture.combine[1].sittings as OlevelSitting[]))).toBe(4);
  });
});

describe('checkOlevelRequirements', () => {
  it.each(fixture.requirements)('$name', (c) => {
    const result = checkOlevelRequirements(c.sittings as OlevelSitting[], c.options as RequirementOptions | undefined);
    const { meets, creditCount, creditsShort, tooManySittings, missing, awaiting, sittingsUsed } = result;
    expect({ meets, creditCount, creditsShort, tooManySittings, missing, awaiting, sittingsUsed }).toEqual(c.expected);
  });

  it('reports each required group with its best subject', () => {
    const result = checkOlevelRequirements(fixture.requirements[4].sittings as OlevelSitting[], fixture.requirements[4].options as RequirementOptions);
    expect(result.minCredits).toBe(5);
    expect(result.required).toEqual([
      { ids: ['english'], met: true, bestSubjectId: 'english', bestGrade: 'B3' },
      { ids: ['mathematics'], met: true, bestSubjectId: 'mathematics', bestGrade: 'C4' },
      { ids: ['biology'], met: false, bestSubjectId: 'biology', bestGrade: 'E8' },
      { ids: ['physics', 'chemistry'], met: true, bestSubjectId: 'chemistry', bestGrade: 'C4' },
    ]);
    expect(result.combined).toHaveLength(7);
  });

  it('does not repeat English or Maths when a course lists them again', () => {
    const result = checkOlevelRequirements([], { required: ['english', 'physics'] });
    expect(result.required.map((r) => r.ids)).toEqual([['english'], ['mathematics'], ['physics']]);
    expect(result.required[2]).toEqual({ ids: ['physics'], met: false, bestSubjectId: null, bestGrade: null });
  });
});

describe('validation', () => {
  it.each(fixture.validateSitting)('sitting: $name', (c) => {
    const result = validateSitting(c.sitting, { currentYear: c.currentYear as number });
    expect(result.errors).toEqual(c.errors);
    expect(result.ok).toBe((c.errors as unknown[]).length === 0);
  });

  it.each(fixture.validateRecord)('record: $name', (c) => {
    const result = validateOlevelRecord(decode(c.record), { currentYear: c.currentYear as number });
    expect(result).toEqual({ ok: c.ok, errors: c.errors });
  });

  it.each(fixture.parseStored)('parse: $name', (c) => {
    expect(parseStoredOlevelRecord(c.raw)).toEqual(c.expected);
  });

  it('never throws on junk', () => {
    for (const junk of [undefined, 1, 'x', [], { sittings: 'x' }, { sittings: [null, 1, { subjects: {} }] }]) {
      expect(() => parseStoredOlevelRecord(junk)).not.toThrow();
      expect(() => validateOlevelRecord(junk, { currentYear: 2026 })).not.toThrow();
      expect(() => validateSitting(junk, { currentYear: 2026 })).not.toThrow();
    }
  });
});

describe('subjects', () => {
  it('has unique ids and aliases, English and Maths first', () => {
    const ids = OLEVEL_SUBJECTS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.slice(0, 2)).toEqual(['english', 'mathematics']);
    const keys = OLEVEL_SUBJECTS.flatMap((s) => [s.name, ...s.aliases].map(normaliseSubjectKey));
    const owners = new Map<string, string>();
    for (const subject of OLEVEL_SUBJECTS) {
      for (const key of [subject.name, ...subject.aliases].map(normaliseSubjectKey)) {
        expect(owners.get(key) ?? subject.id, key).toBe(subject.id);
        owners.set(key, subject.id);
      }
    }
    expect(keys.every((k) => k.length > 0)).toBe(true);
    expect(OLEVEL_SUBJECTS.length).toBeGreaterThanOrEqual(40);
  });

  it.each(fixture.findSubject)('find "$input" -> $id', (c) => {
    expect(findOlevelSubject(c.input as string)?.id ?? null).toBe(c.id);
  });

  it.each(fixture.subjectIdFor)('id for "$input" -> "$id"', (c) => {
    expect(subjectIdFor(c.input as string)).toBe(c.id);
  });

  it.each(fixture.searchSubjects)('search "$query"', (c) => {
    expect(searchOlevelSubjects(c.query as string, c.limit as number).map((s) => s.id)).toEqual(c.ids);
  });
});

describe('record type (types/records.ts)', () => {
  it('reads a missing or unknown users/{uid}.recordType as tertiary', async () => {
    const { RECORD_TYPES, resolveRecordType } = await import('@/types/records');
    expect(RECORD_TYPES).toEqual(['tertiary', 'olevel', 'admission']);
    expect(resolveRecordType(undefined)).toBe('tertiary');
    expect(resolveRecordType(null)).toBe('tertiary');
    expect(resolveRecordType('university')).toBe('tertiary');
    expect(resolveRecordType('olevel')).toBe('olevel');
    expect(resolveRecordType('admission')).toBe('admission');
  });
});
