import { describe, expect, it } from 'vitest';
import {
  prepareSemesterSave,
  SemesterSaveValidationError,
} from '@/lib/results/semester-save';

describe('prepareSemesterSave', () => {
  it('calculates complete CA and exam records without undefined fields', () => {
    const result = prepareSemesterSave([
      { code: ' csc 415 ', title: ' Computer Graphics ', units: 2, caScore: 26, examScore: 28 },
    ]);

    expect(result.courses[0]).toEqual({
      code: 'CSC 415',
      title: 'Computer Graphics',
      units: 2,
      caScore: 26,
      examScore: 28,
      totalScore: 54,
      grade: 'C',
      gradePoint: 3,
      piPoint: 2.7,
      estimated: false,
      isAR: false,
    });
    expect(result.summary).toMatchObject({ gpa: 3, pi: 2.7, creditLoaded: 2, isComplete: true });
    expect(Object.values(result.courses[0])).not.toContain(undefined);
  });

  it('supports a letter-grade-only record without turning it into a zero score', () => {
    const result = prepareSemesterSave([
      { code: 'CSC 463', title: 'Software Engineering', units: 3, caScore: null, examScore: null, grade: 'B' },
    ]);

    expect(result.courses[0]).toMatchObject({
      totalScore: null,
      grade: 'B',
      gradePoint: 4,
      piPoint: 4,
      estimated: true,
    });
    expect(result.summary).toMatchObject({ gpa: 4, pi: 4, creditLoaded: 3, isComplete: true });
  });

  it('rejects partial scores instead of silently replacing the missing value with zero', () => {
    expect(() => prepareSemesterSave([
      { code: 'CSC 455', title: 'Networks', units: 2, caScore: 20, examScore: null },
    ])).toThrow(SemesterSaveValidationError);
  });

  it('rejects an empty semester instead of marking it complete', () => {
    expect(() => prepareSemesterSave([])).toThrow('Add at least one completed course');
  });
});
