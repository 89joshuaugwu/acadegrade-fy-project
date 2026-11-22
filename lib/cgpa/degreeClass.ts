import type { DegreeClass } from '@/types/analytics';
import type { GradingScale } from './academicRules';
import { DEFAULT_SCALE, scaleDegreeClass } from './scale';

/**
 * Resolve degree class from CGPA value.
 * Classifies the rounded 2-decimal CGPA the UI displays with lower-bound
 * thresholds (see ./academicRules), then returns the themed entry with label,
 * color token, icon and range. With a scale, the class comes from that scale
 * and the colour from the class's rank (top class gold ... lowest red).
 */
export function resolveDegreeClass(cgpa: number, scale: GradingScale = DEFAULT_SCALE): DegreeClass {
  return scaleDegreeClass(cgpa, scale);
}

/**
 * Check if CGPA has crossed a degree class threshold.
 * Used to trigger notifications and badge animations.
 */
export function hasClassChanged(
  previousCGPA: number,
  currentCGPA: number,
  scale: GradingScale = DEFAULT_SCALE
): boolean {
  const prevClass = resolveDegreeClass(previousCGPA, scale);
  const currClass = resolveDegreeClass(currentCGPA, scale);
  return prevClass.label !== currClass.label;
}
