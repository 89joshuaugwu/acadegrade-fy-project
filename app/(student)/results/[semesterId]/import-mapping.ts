import { MAX_CA_SCORE, MAX_EXAM_SCORE } from '@/lib/utils/constants';
import { gradeFromScore } from '@/lib/cgpa/academicRules';
import type { PortalCourseRow } from '@/lib/import/portalText';
import type { CourseInput } from '@/types/course';

const asScore = (value: unknown, max: number): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= max ? parsed : null;
};

/**
 * Turns one extracted slip row into a course row. A score of 0 is a real score
 * (a student can score 0 in CA), so only missing or invalid values become null.
 */
export function mapExtractedCourse(raw: unknown): CourseInput {
  const row = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const unitsValue = Number(row.units);
  const isAR = row.isAR === true;
  return {
    code: typeof row.code === 'string' ? row.code : '',
    title: typeof row.title === 'string' ? row.title : '',
    units: Number.isFinite(unitsValue) && unitsValue > 0 ? unitsValue : 3,
    caScore: asScore(row.caScore, MAX_CA_SCORE),
    examScore: asScore(row.examScore, MAX_EXAM_SCORE),
    isAR,
    estimated: isAR,
  };
}

/**
 * Turns one row read from pasted portal text into a course row. A letter grade
 * (or one worked out from a pasted total score) fills the grade only: the CA
 * and exam split is unknown, so the student adds those scores before saving.
 */
export function mapPortalRow(row: PortalCourseRow): CourseInput {
  const grade = row.grade ?? (row.totalScore !== undefined ? gradeFromScore(row.totalScore).grade : undefined);
  return {
    code: row.code,
    title: row.title,
    units: row.units,
    caScore: null,
    examScore: null,
    ...(grade ? { grade } : {}),
  };
}
