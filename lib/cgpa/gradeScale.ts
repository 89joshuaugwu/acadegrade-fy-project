import type { Grade, GradeScaleEntry } from '@/types/course';
import { GRADE_SCALE } from '@/lib/utils/constants';
import { gradeFromScore } from './academicRules';

/**
 * Look up grade and grade point from a total score.
 * Uses the Nigerian 5-point grade scale with lower-bound bands (no gaps for
 * fractional totals); see gradeFromScore in ./academicRules.
 */
export function lookupGrade(
  totalScore: number,
  scale: GradeScaleEntry[] = GRADE_SCALE
): { grade: Grade; gradePoint: number } {
  return gradeFromScore(totalScore, scale);
}

/**
 * Get the color token for a given grade.
 */
export function getGradeColor(grade: Grade): string {
  const colors: Record<Grade, string> = {
    A: 'var(--grade-a)',
    B: 'var(--grade-b)',
    C: 'var(--grade-c)',
    D: 'var(--grade-d)',
    E: 'var(--grade-e)',
    F: 'var(--grade-f)',
  };
  return colors[grade];
}
