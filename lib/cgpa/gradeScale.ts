import type { Grade, GradeScaleEntry } from '@/types/course';
import { GRADE_SCALE } from '@/lib/utils/constants';

/**
 * Look up grade and grade point from a total score.
 * Uses the Nigerian 5-point grade scale.
 */
export function lookupGrade(
  totalScore: number,
  scale: GradeScaleEntry[] = GRADE_SCALE
): { grade: Grade; gradePoint: number } {
  const entry = scale.find(
    (s) => totalScore >= s.minScore && totalScore <= s.maxScore
  );

  if (!entry) {
    return { grade: 'F', gradePoint: 0 };
  }

  return { grade: entry.grade, gradePoint: entry.gradePoint };
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
