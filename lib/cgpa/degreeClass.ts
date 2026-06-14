import type { DegreeClass } from '@/types/analytics';
import { DEGREE_CLASSES } from '@/lib/utils/constants';

/**
 * Resolve degree class from CGPA value.
 * Returns the matching degree class with label, color token, icon, and range.
 */
export function resolveDegreeClass(cgpa: number): DegreeClass {
  const degreeClass = DEGREE_CLASSES.find(
    (dc) => cgpa >= dc.minCGPA && cgpa <= dc.maxCGPA
  );

  // Default to Fail if no match (shouldn't happen with proper thresholds)
  return degreeClass ?? DEGREE_CLASSES[DEGREE_CLASSES.length - 1];
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
