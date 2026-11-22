import { SCALES, type GradingScale } from '@/lib/cgpa/academicRules';
import { MAX_EXAM_SCORE } from '@/lib/utils/constants';

export type ExamNeededStatus = 'needed' | 'secured' | 'not-reachable';

export interface ExamNeededRow {
  /** A grade on the active scale (A-E on the 5-point scale). */
  grade: string;
  /** The grade's minimum total score (from the shared scale). */
  minScore: number;
  /** minScore - CA, rounded to 2 decimals. */
  needed: number;
  status: ExamNeededStatus;
}

/**
 * "What do I need in the exam?" (A2). For every passing grade, the exam score
 * out of 70 that reaches the grade's minimum given the CA: secured at 0 or
 * below, not reachable above 70. Guidance only: final grades come from the
 * institution. Driven by the active scale's bands.
 */
export function examNeededForGrades(caScore: number, scale: GradingScale = SCALES.ng5): ExamNeededRow[] {
  return [...scale.bands]
    .sort((a, b) => b.minScore - a.minScore)
    .filter((band) => band.minScore > 0)
    .map((band) => {
      const needed = Math.round((band.minScore - caScore) * 100) / 100;
      const status: ExamNeededStatus = needed <= 0 ? 'secured' : needed > MAX_EXAM_SCORE ? 'not-reachable' : 'needed';
      return { grade: band.grade, minScore: band.minScore, needed, status };
    });
}
