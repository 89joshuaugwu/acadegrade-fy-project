import { describe, expect, it } from 'vitest';

import { previewSemester } from '@/lib/planning/semesterPreview';

// Earlier semester: GPA 4.00 over 18 units. This semester: one graded B (3 units), two awaiting.
const semesters = [
  { id: 'sem-1', gpa: 4, pi: 4, creditLoaded: 18 },
  { id: 'sem-2', gpa: 4, pi: 3.25, creditLoaded: 3 },
];
const courses = [
  { id: 'c1', units: 3, caScore: 20, examScore: 45 }, // 65 = B (4)
  { id: 'c2', units: 3, caScore: 22, examScore: null, isAR: true },
  { id: 'c3', units: 2, caScore: null, examScore: null, pending: true },
];

describe('previewSemester (A3)', () => {
  it('scenario applies expected grades to AR/pending rows only', () => {
    const result = previewSemester({
      courses,
      // c1 is graded: an "expected" grade for it must be ignored.
      expected: { c1: 'F', c2: 'A', c3: 'C' },
      semesters,
      semesterId: 'sem-2',
    });
    // (4*3 + 5*3 + 3*2) / 8 = 33/8 = 4.125
    expect(result.scenario.gpa).toBeCloseTo(4.125, 10);
    // (4*18 + 33) / 26 = 105/26
    expect(result.scenario.cgpa).toBeCloseTo(105 / 26, 10);
    expect(result.scenario.band.shortLabel).toBe('2:1');
    expect(result.previewedCount).toBe(2);
  });

  it('official figures unchanged', () => {
    const result = previewSemester({ courses, expected: { c2: 'A', c3: 'A' }, semesters, semesterId: 'sem-2' });
    // Only c1 counts: GPA 4.00; CGPA (4*18 + 4*3) / 21 = 4.00.
    expect(result.official.gpa).toBeCloseTo(4, 10);
    expect(result.official.cgpa).toBeCloseTo(4, 10);
    expect(result.official.band.shortLabel).toBe('2:1');
    // The input rows are not mutated.
    expect(courses[1]).toEqual({ id: 'c2', units: 3, caScore: 22, examScore: null, isAR: true });
  });

  it('no expectations equals official', () => {
    const result = previewSemester({ courses, expected: {}, semesters, semesterId: 'sem-2' });
    expect(result.scenario).toEqual(result.official);
    expect(result.previewedCount).toBe(0);
  });

  it('replaces only this semester and ignores ids that are not rows', () => {
    const result = previewSemester({
      courses,
      expected: { ghost: 'A', c2: 'F' },
      // A stale stored summary for sem-2 must not be double counted.
      semesters: [...semesters.slice(0, 1), { id: 'sem-2', gpa: 1, pi: 1, creditLoaded: 30 }],
      semesterId: 'sem-2',
    });
    expect(result.official.cgpa).toBeCloseTo(4, 10);
    // (4*3 + 0*3) / 6 = 2.00; CGPA (72 + 12) / 24 = 3.5
    expect(result.scenario.gpa).toBeCloseTo(2, 10);
    expect(result.scenario.cgpa).toBeCloseTo(3.5, 10);
    expect(result.previewedCount).toBe(1);
  });
});
