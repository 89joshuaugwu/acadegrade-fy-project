import { describe, expect, it } from 'vitest';
import { SCALES } from '@/lib/cgpa/academicRules';
import {
  carryOverCeiling,
  carryOverImpact,
  carryOverTable,
  checkDegreeClass,
  gpaAndPiFromRows,
  requiredGpa,
  suggestDecimal,
} from '@/app/(public)/tools/tool-math';

describe('tools on another grading scale', () => {
  const nbte = SCALES.nbte4;

  it('checks a class on the chosen scale and rejects values above its top point', () => {
    expect(checkDegreeClass(3.2, nbte)).toMatchObject({ rounded: 3.2, band: { shortLabel: 'Upper' }, next: { shortLabel: 'Dist' }, gap: 0.3 });
    expect(checkDegreeClass(4.5, nbte)).toBeNull();
    expect(checkDegreeClass(4.5)?.band.shortLabel).toBe('1st');
    expect(suggestDecimal('450', nbte)).toBeNull();
    expect(suggestDecimal('350', nbte)).toBe(3.5);
  });

  it('works out the GPA needed against the top point', () => {
    expect(requiredGpa({ currentCgpa: 3, completedUnits: 60, remainingUnits: 30, targetCgpa: 3.5 }, nbte)).toEqual({ status: 'unreachable', maxReachable: 3.33 });
    expect(requiredGpa({ currentCgpa: 3, completedUnits: 60, remainingUnits: 60, targetCgpa: 3.5 }, nbte)).toMatchObject({ status: 'needed', required: 4 });
  });

  it('prices carry-over retakes with the scale letters', () => {
    expect(carryOverCeiling(30, 3, nbte)).toBe(3.6);
    expect(carryOverImpact({ currentCgpa: 3, completedUnits: 30, failedUnits: 3, retakeGrade: 'AB' }, nbte)).toEqual({ before: 3, bothAttemptsCount: 3.05, replacesFailure: 3.35 });
    expect(carryOverTable({ currentCgpa: 3, completedUnits: 30, failedUnits: 3 }, nbte)?.map((row) => row.grade)).toEqual(['A', 'AB', 'B', 'BC', 'C', 'CD', 'D', 'E', 'F']);
  });

  it('turns scores into GPA on the scale', () => {
    const result = gpaAndPiFromRows([{ score: '72', units: '3' }], nbte);
    expect(result).toMatchObject({ gpa: 3.5, units: 3 });
    expect(result?.pi).toBeCloseTo(2.88, 10);
  });
});
