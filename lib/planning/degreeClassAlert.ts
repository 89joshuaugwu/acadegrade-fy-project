import { hasClassChanged, resolveDegreeClass } from '@/lib/cgpa/degreeClass';
import type { GradingScale } from '@/lib/cgpa/academicRules';
import { DEFAULT_SCALE } from '@/lib/cgpa/scale';

export interface DegreeClassAlertInput {
  /** The saved `analytics/{uid}` record, if any. */
  previous: { cgpa?: unknown; degreeClass?: unknown } | null | undefined;
  currentCgpa: number;
  gradedCredits: number;
  /** The student's scale; the 5-point scale when left out. */
  scale?: GradingScale;
}

/**
 * The degree class to save and whether to send the class-change push/email.
 * Classifies the displayed (rounded) CGPA with the shared lower-bound bands and
 * compares previous and current CGPA values (hasClassChanged), not stored
 * labels, so a label saved by an older buggy lookup can never trigger an alert.
 * No alert without a previous CGPA, from the initial Fail record, or when
 * nothing is graded yet.
 */
export function planDegreeClassAlert({ previous, currentCgpa, gradedCredits, scale = DEFAULT_SCALE }: DegreeClassAlertInput): { label: string; alert: boolean } {
  const label = resolveDegreeClass(currentCgpa, scale).label;
  const previousCgpa = previous?.cgpa;
  if (typeof previousCgpa !== 'number' || !Number.isFinite(previousCgpa)) return { label, alert: false };
  if (!(gradedCredits > 0)) return { label, alert: false };
  // The lowest class (Fail) is the initial record: no alert from it.
  if (resolveDegreeClass(previousCgpa, scale).colorToken === '--class-fail') return { label, alert: false };
  return { label, alert: hasClassChanged(previousCgpa, currentCgpa, scale) };
}
