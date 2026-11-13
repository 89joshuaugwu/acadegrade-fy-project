import type { DegreeClass } from '@/types/analytics';
import { DEGREE_CLASSES } from '@/lib/utils/constants';
import { resolveDegreeClass as resolveDegreeClassBand } from './academicRules';

/**
 * Resolve degree class from CGPA value.
 * Classifies the rounded 2-decimal CGPA the UI displays with lower-bound
 * thresholds (see ./academicRules), then returns the themed entry with label,
 * color token, icon and range.
 */
export function resolveDegreeClass(cgpa: number): DegreeClass {
  const { shortLabel } = resolveDegreeClassBand(cgpa);
  return DEGREE_CLASSES.find((dc) => dc.shortLabel === shortLabel) ?? DEGREE_CLASSES[DEGREE_CLASSES.length - 1];
}

/**
 * Check if CGPA has crossed a degree class threshold.
 * Used to trigger notifications and badge animations.
 */
export function hasClassChanged(
  previousCGPA: number,
  currentCGPA: number
): boolean {
  const prevClass = resolveDegreeClass(previousCGPA);
  const currClass = resolveDegreeClass(currentCGPA);
  return prevClass.label !== currClass.label;
}
