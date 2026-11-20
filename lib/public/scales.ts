import {
  DEGREE_CLASS_BANDS,
  GRADE_BANDS,
  MAX_GRADE_POINT,
  resolveDegreeClass,
  type AcademicGrade,
  type DegreeClassShortLabel,
} from '@/lib/cgpa/academicRules';

/**
 * Grading scales shown on the public site. The scale is data, not layout:
 * the home "Scale" section, the calculator, the tools and the FAQs read from
 * here. One live scale today; a second entry makes a scale switcher appear.
 * Never list a scale here before it is live (no "coming soon").
 */

export interface PublicClassBand {
  /** Display name, for example "Second Class Upper". The engine's "Fail" shows as "Below a Pass". */
  label: string;
  /** Short form used on narrow meters: 1st, 2:1, 2:2, 3rd, Pass. */
  short: string;
  /** The engine's short label, to map back to resolveDegreeClass. */
  engineShort: DegreeClassShortLabel;
  /** Lowest rounded CGPA in the class. */
  min: number;
  /** Highest rounded CGPA in the class. */
  max: number;
}

export interface PublicGradeBand {
  grade: AcademicGrade;
  minScore: number;
  maxScore: number;
  gradePoint: number;
}

export interface PublicScale {
  id: 'ng-university-5';
  /** The single line shown when only one scale is live. */
  line: string;
  /** Short name for headings and meta lines. */
  name: string;
  maxPoint: number;
  gradeBands: readonly PublicGradeBand[];
  /** Highest class first, ending with "Below a Pass". */
  classBands: readonly PublicClassBand[];
  hasPI: boolean;
  scoreSplit: { ca: number; exam: number };
  units: { min: number; max: number };
  handbookNote: string;
}

const CLASS_DISPLAY: Record<DegreeClassShortLabel, { label: string; short: string }> = {
  '1st': { label: 'First Class', short: '1st' },
  '2:1': { label: 'Second Class Upper', short: '2:1' },
  '2:2': { label: 'Second Class Lower', short: '2:2' },
  '3rd': { label: 'Third Class', short: '3rd' },
  Pass: { label: 'Pass', short: 'Pass' },
  Fail: { label: 'Below a Pass', short: 'Below' },
};

const NG_UNIVERSITY_5: PublicScale = {
  id: 'ng-university-5',
  line: 'Nigerian university 5-point scale, with PI',
  name: 'Nigerian university 5-point scale',
  maxPoint: MAX_GRADE_POINT,
  gradeBands: GRADE_BANDS.map((band) => ({ ...band })),
  classBands: DEGREE_CLASS_BANDS.map((band) => ({
    ...CLASS_DISPLAY[band.shortLabel],
    engineShort: band.shortLabel,
    min: band.minCGPA,
    max: band.maxCGPA,
  })),
  hasPI: true,
  scoreSplit: { ca: 30, exam: 70 },
  units: { min: 1, max: 6 },
  handbookNote: 'If yours differs, your handbook is the final word.',
};

export const LIVE_SCALES: readonly PublicScale[] = [NG_UNIVERSITY_5];
export const DEFAULT_SCALE: PublicScale = LIVE_SCALES[0];

/** True when more than one scale is live, so pages should show a switcher. */
export function hasScaleSwitcher(scales: readonly PublicScale[] = LIVE_SCALES): boolean {
  return scales.length > 1;
}

/** The class a CGPA falls in, with the public display name. Uses the engine's rounding. */
export function publicClassFor(cgpa: number | null | undefined, scale: PublicScale = DEFAULT_SCALE): PublicClassBand {
  const engine = resolveDegreeClass(cgpa);
  return scale.classBands.find((band) => band.engineShort === engine.shortLabel) ?? scale.classBands[scale.classBands.length - 1];
}

/**
 * Class thresholds drawn as ticks on the arc meter: every class floor above
 * Pass (1.50, 2.40, 3.50, 4.50 on the 5-point scale), lowest first.
 */
export function classTicks(scale: PublicScale = DEFAULT_SCALE): { value: number; label: string; short: string }[] {
  const passFloor = scale.classBands.find((band) => band.engineShort === 'Pass')?.min ?? 1;
  return scale.classBands
    .filter((band) => band.min > passFloor)
    .map((band) => ({ value: band.min, label: band.label, short: band.short }))
    .sort((a, b) => a.value - b.value);
}

/** "A 70–100 → 5" style rows for copy, from the scale data. */
export function gradeBandLine(band: PublicGradeBand): string {
  return `${band.grade} ${band.minScore}–${band.maxScore} → ${band.gradePoint}`;
}

/** "First Class 4.50–5.00" style rows for copy. Below a Pass is left out. */
export function classBandLine(band: PublicClassBand): string {
  return `${band.label} ${band.min.toFixed(2)}–${band.max.toFixed(2)}`;
}
