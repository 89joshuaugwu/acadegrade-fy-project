import { describe, expect, it } from 'vitest';
import { computeCourseMetrics, computeCumulativeCGPA } from '@/lib/cgpa/calculator';
import { resolveDegreeClass } from '@/lib/cgpa/degreeClass';
import { weightedSemesterFixture } from '@/tests/fixtures/academic';

describe('academic calculation baseline', () => {
  it('computes CA plus exam without losing the continuous PI', () => {
    const result = computeCourseMetrics({ code: 'CSC 425', title: 'Allation Management', units: 2, caScore: 26, examScore: 28 });
    expect(result).toMatchObject({ totalScore: 54, grade: 'C', gradePoint: 3, piPoint: 2.7 });
  });

  it('weights cumulative CGPA by semester credit load', () => {
    expect(computeCumulativeCGPA([...weightedSemesterFixture]).cgpa).toBeCloseTo(3.4, 8);
  });

  it.fails('does not send rounded boundary values through the Fail fallback', () => {
    expect(resolveDegreeClass(4.495).label).toBe('Second Class Upper (2:1)');
  });
});
