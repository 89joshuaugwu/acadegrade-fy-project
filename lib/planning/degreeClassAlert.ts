import { hasClassChanged, resolveDegreeClass } from '@/lib/cgpa/degreeClass';

export interface DegreeClassAlertInput {
  /** The saved `analytics/{uid}` record, if any. */
  previous: { cgpa?: unknown; degreeClass?: unknown } | null | undefined;
  currentCgpa: number;
  gradedCredits: number;
}

/**
 * The degree class to save and whether to send the class-change push/email.
 * Classifies the displayed (rounded) CGPA with the shared lower-bound bands and
 * compares previous and current CGPA values (hasClassChanged), not stored
 * labels, so a label saved by an older buggy lookup can never trigger an alert.
 * No alert without a previous CGPA, from the initial Fail record, or when
 * nothing is graded yet.
 */
export function planDegreeClassAlert({ previous, currentCgpa, gradedCredits }: DegreeClassAlertInput): { label: string; alert: boolean } {
  const label = resolveDegreeClass(currentCgpa).label;
  const previousCgpa = previous?.cgpa;
  if (typeof previousCgpa !== 'number' || !Number.isFinite(previousCgpa)) return { label, alert: false };
  if (!(gradedCredits > 0)) return { label, alert: false };
  if (resolveDegreeClass(previousCgpa).shortLabel === 'Fail') return { label, alert: false };
  return { label, alert: hasClassChanged(previousCgpa, currentCgpa) };
}
