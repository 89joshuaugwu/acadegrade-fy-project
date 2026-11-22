/**
 * Web helpers around the shared grading scales (./academicRules).
 *
 * Colours follow a class's rank on its scale, not its name: the top class is
 * gold, then violet, teal, orange and rose; the lowest class (the one that
 * starts at 0) is red. The tone is reported as the matching ng5 short label so
 * the existing colour maps keyed by '1st' | '2:1' | ... keep working.
 */
import {
  DEGREE_CLASS_BANDS,
  SCALES,
  resolveDegreeClass,
  scaleClassRanges,
  type DegreeClassShortLabel,
  type GradingScale,
  type ScaleClass,
  type ScaleClassRange,
} from './academicRules';
import type { DegreeClass } from '@/types/analytics';

export const DEFAULT_SCALE: GradingScale = SCALES.ng5;

const RANK_TONES: readonly DegreeClassShortLabel[] = ['1st', '2:1', '2:2', '3rd', 'Pass'];

export const TONE_COLOR_TOKENS: Readonly<Record<DegreeClassShortLabel, string>> = {
  '1st': '--class-first',
  '2:1': '--class-2upper',
  '2:2': '--class-2lower',
  '3rd': '--class-third',
  Pass: '--class-pass',
  Fail: '--class-fail',
};

function sortedClasses(scale: GradingScale): ScaleClass[] {
  return [...scale.classes].sort((a, b) => b.minCgpa - a.minCgpa);
}

/** Rank of a class on its scale: 0 is the top class. */
export function classRank(cls: Pick<ScaleClass, 'name' | 'minCgpa'>, scale: GradingScale): number {
  const index = sortedClasses(scale).findIndex((item) => item.minCgpa === cls.minCgpa && item.name === cls.name);
  return index < 0 ? 0 : index;
}

/** The colour tone (as an ng5 short label) for a class on its scale. */
export function classTone(cls: Pick<ScaleClass, 'name' | 'minCgpa'>, scale: GradingScale): DegreeClassShortLabel {
  const sorted = sortedClasses(scale);
  const rank = classRank(cls, scale);
  if (sorted.length > 1 && rank === sorted.length - 1) return 'Fail';
  return RANK_TONES[Math.min(rank, RANK_TONES.length - 1)];
}

/** The colour tone for a CGPA on a scale. */
export function cgpaTone(cgpa: number | null | undefined, scale: GradingScale = DEFAULT_SCALE): DegreeClassShortLabel {
  return classTone(resolveDegreeClass(cgpa, scale), scale);
}

export interface ScaleClassView extends ScaleClassRange {
  tone: DegreeClassShortLabel;
  colorToken: string;
}

/** The scale's classes, highest first, with display ranges and colour tones. */
export function classesWithTone(scale: GradingScale): ScaleClassView[] {
  return scaleClassRanges(scale).map((cls) => {
    const tone = classTone(cls, scale);
    return { ...cls, tone, colorToken: TONE_COLOR_TOKENS[tone] };
  });
}

const ICONS: Record<DegreeClassShortLabel, string> = Object.fromEntries(
  DEGREE_CLASS_BANDS.map((band) => [band.shortLabel, band.icon])
) as Record<DegreeClassShortLabel, string>;

/**
 * The themed degree class entry (label, colour token, icon, range) for a CGPA
 * on a scale. On ng5 it is exactly the DEGREE_CLASSES entry.
 */
export function scaleDegreeClass(cgpa: number | null | undefined, scale: GradingScale = DEFAULT_SCALE): DegreeClass {
  const cls = resolveDegreeClass(cgpa, scale);
  const view = classesWithTone(scale).find((item) => item.name === cls.name && item.minCgpa === cls.minCgpa);
  const tone = view?.tone ?? 'Fail';
  return {
    label: cls.name,
    shortLabel: cls.shortLabel,
    colorToken: TONE_COLOR_TOKENS[tone],
    icon: ICONS[tone],
    minCGPA: cls.minCgpa,
    maxCGPA: view?.maxCgpa ?? scale.maxPoint,
  };
}

/** Formal transcript wording for a CGPA's class on a scale. */
export function transcriptClassLabel(cgpa: number | null | undefined, scale: GradingScale = DEFAULT_SCALE): string {
  const cls = resolveDegreeClass(cgpa, scale);
  return cls.transcriptLabel ?? cls.name;
}

/** "5-point (with E), top grade point 5" style line for prompts and transcripts. */
export function describeScale(scale: GradingScale): string {
  return `${scale.name} grading scale (top grade point ${scale.maxPoint})`;
}

export type GradeTone = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
const GRADE_TONES: readonly GradeTone[] = ['A', 'B', 'C', 'D', 'E'];

/**
 * The colour tone (as an ng5 letter, for the existing --grade-* colours) of a
 * grade on a scale. Passing bands are spread over A-E by rank; the fail band
 * and letters that are not on the scale are F.
 */
export function gradeTone(grade: string | null | undefined, scale: GradingScale = DEFAULT_SCALE): GradeTone {
  const wanted = String(grade ?? '').trim().toUpperCase();
  const passing = [...scale.bands].sort((a, b) => b.minScore - a.minScore).filter((band) => band.gradePoint > 0);
  const index = passing.findIndex((band) => band.grade.toUpperCase() === wanted);
  if (index < 0) return 'F';
  return GRADE_TONES[Math.min(GRADE_TONES.length - 1, Math.floor((index * GRADE_TONES.length) / passing.length))];
}

/** The CSS colour for a grade on a scale. */
export function gradeColor(grade: string | null | undefined, scale: GradingScale = DEFAULT_SCALE): string {
  return `var(--grade-${gradeTone(grade, scale).toLowerCase()})`;
}

/** Whole-number chart ticks from 0 up to the scale's top point (and the top point itself if fractional). */
export function axisTicks(maxPoint: number): number[] {
  const top = Number.isFinite(maxPoint) && maxPoint > 0 ? maxPoint : 5;
  const ticks: number[] = [];
  for (let value = 0; value <= top; value += 1) ticks.push(value);
  if (ticks[ticks.length - 1] !== top) ticks.push(top);
  return ticks;
}
