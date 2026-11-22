import {
  DEGREE_CLASS_BANDS,
  computeCourseMetrics,
  computeSemesterGPA,
  GRADE_POINTS,
  MAX_GRADE_POINT,
  maxReachableCgpa,
  requiredAverageForTarget,
  resolveDegreeClass,
  roundCgpa,
  weightedAverageScore,
  failGrade,
  gradePointFor,
  scaleBandRanges,
  SCALES,
  type AcademicGrade,
  type GradingScale,
} from '@/lib/cgpa/academicRules';

/**
 * Every helper takes an optional grading scale (the 5-point scale when left
 * out, which gives exactly the old results).
 */
const topOf = (scale?: GradingScale) => (scale ? scale.maxPoint : MAX_GRADE_POINT);

/** A class as the tools use it: the ng5 band, or a class on the chosen scale. */
export interface ToolClass {
  shortLabel: string;
  minCGPA: number;
}

function classesOf(scale?: GradingScale): ToolClass[] {
  if (!scale || scale.id === 'ng5') return DEGREE_CLASS_BANDS.map((band) => ({ shortLabel: band.shortLabel, minCGPA: band.minCGPA }));
  return [...scale.classes].sort((a, b) => b.minCgpa - a.minCgpa).map((cls) => ({ shortLabel: cls.shortLabel, minCGPA: cls.minCgpa }));
}

function pointsFor(grade: string, scale?: GradingScale): number {
  if (!scale) return GRADE_POINTS[grade as AcademicGrade] ?? 0;
  return gradePointFor(grade, scale) ?? 0;
}
import { encodeCalculation } from '@/components/public/tools/calculator-url';

/**
 * Parses a text field. Empty or non-numeric text is null, never zero.
 * A comma is read as the decimal point ("4,43" is 4.43), because some
 * Android keyboards only offer a comma.
 */
export function parseNumber(text: string): number | null {
  let trimmed = text.trim();
  if (!trimmed) return null;
  if (/^-?\d*,\d+$/.test(trimmed)) trimmed = trimmed.replace(',', '.');
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null;
}

/**
 * "Did you mean": a whole number from 100 to 500 typed without its decimal
 * point ("443") is probably a CGPA (4.43). Null otherwise.
 */
export function suggestDecimal(text: string, scale?: GradingScale): number | null {
  const trimmed = text.trim();
  if (!/^\d{3}$/.test(trimmed)) return null;
  const value = Number(trimmed);
  return value >= 100 && value <= topOf(scale) * 100 ? value / 100 : null;
}

export interface DegreeClassCheck {
  band: ToolClass;
  rounded: number;
  /** The next class up, or null at the top class. */
  next: ToolClass | null;
  /** CGPA still needed to reach the next class. */
  gap: number | null;
}

/** Null when the CGPA is outside 0 to the top point (5 on the 5-point scale). */
export function checkDegreeClass(cgpa: number | null, scale?: GradingScale): DegreeClassCheck | null {
  if (cgpa === null || cgpa < 0 || cgpa > topOf(scale)) return null;
  const rounded = roundCgpa(cgpa);
  const classes = classesOf(scale);
  const shortLabel = scale && scale.id !== 'ng5' ? resolveDegreeClass(rounded, scale).shortLabel : resolveDegreeClass(rounded).shortLabel;
  const index = Math.max(0, classes.findIndex((cls) => cls.shortLabel === shortLabel));
  const band = classes[index];
  const next = index > 0 ? classes[index - 1] : null;
  return { band, rounded, next, gap: next ? roundCgpa(next.minCGPA - rounded) : null };
}

export type RequiredGpaOutcome =
  | { status: 'invalid' }
  | { status: 'secured'; maxReachable: number; lowestFinish: number }
  | { status: 'unreachable'; maxReachable: number }
  | { status: 'needed'; required: number; maxReachable: number };

export function requiredGpa(input: {
  currentCgpa: number | null;
  completedUnits: number | null;
  remainingUnits: number | null;
  targetCgpa: number | null;
}, scale?: GradingScale): RequiredGpaOutcome {
  const { currentCgpa, completedUnits, remainingUnits, targetCgpa } = input;
  const top = topOf(scale);
  if (
    currentCgpa === null || completedUnits === null || remainingUnits === null || targetCgpa === null ||
    currentCgpa < 0 || currentCgpa > top ||
    targetCgpa < 0 || targetCgpa > top ||
    completedUnits < 0 || remainingUnits <= 0
  ) {
    return { status: 'invalid' };
  }
  const maxReachable = roundCgpa(maxReachableCgpa({ currentCgpa, completedUnits, remainingUnits }, scale));
  const required = requiredAverageForTarget({ currentCgpa, completedUnits, remainingUnits, targetCgpa });
  if (required === null) return { status: 'invalid' };
  if (required > top) return { status: 'unreachable', maxReachable };
  if (required <= 0) return { status: 'secured', maxReachable, lowestFinish: lowestFinish({ currentCgpa, completedUnits, remainingUnits }) };
  return { status: 'needed', required: roundNeededUp(required, top), maxReachable };
}

/**
 * The needed average is rounded UP to 2 dp (4.65225 → 4.66), so a student never
 * aims too low. Floating-point noise is cleared first, so an exact 3.65 stays 3.65.
 */
function roundNeededUp(value: number, top = MAX_GRADE_POINT): number {
  const cleaned = Math.round(value * 1e6) / 1e6;
  return Math.min(top, Math.ceil(cleaned * 100 - 1e-9) / 100);
}

/** The lowest CGPA you can finish on: an F in every remaining unit. */
export function lowestFinish(input: { currentCgpa: number; completedUnits: number; remainingUnits: number }): number {
  const total = input.completedUnits + input.remainingUnits;
  return total > 0 ? roundCgpa((input.currentCgpa * input.completedUnits) / total) : 0;
}

export interface CarryOverImpact {
  before: number;
  /** Retake counted as extra units; the failed attempt stays in the total. */
  bothAttemptsCount: number;
  /** Retake replaces the failed attempt in the total. */
  replacesFailure: number;
}

/**
 * The highest CGPA possible with an F of failedUnits inside completedUnits:
 * 5 x (completed - failed) / completed, rounded. Null when the units don't fit.
 */
export function carryOverCeiling(completedUnits: number | null, failedUnits: number | null, scale?: GradingScale): number | null {
  if (completedUnits === null || failedUnits === null || completedUnits <= 0 || failedUnits <= 0 || failedUnits > completedUnits) return null;
  return roundCgpa((topOf(scale) * (completedUnits - failedUnits)) / completedUnits);
}

/**
 * Null when the numbers cannot describe a failed course inside the completed
 * units, including a CGPA above what an F of that size allows (compared on
 * rounded values, so a true 4.8276 typed as 4.83 still passes).
 */
export function carryOverImpact(input: {
  currentCgpa: number | null;
  completedUnits: number | null;
  failedUnits: number | null;
  /** A letter on the scale (A-F on the 5-point scale). */
  retakeGrade: string;
}, scale?: GradingScale): CarryOverImpact | null {
  const { currentCgpa, completedUnits, failedUnits, retakeGrade } = input;
  if (
    currentCgpa === null || completedUnits === null || failedUnits === null ||
    currentCgpa < 0 || currentCgpa > topOf(scale) ||
    completedUnits <= 0 || failedUnits <= 0 || failedUnits > completedUnits
  ) {
    return null;
  }
  const ceiling = carryOverCeiling(completedUnits, failedUnits, scale);
  if (ceiling !== null && roundCgpa(currentCgpa) > ceiling) return null;
  const points = currentCgpa * completedUnits;
  const retakePoints = pointsFor(retakeGrade, scale) * failedUnits;
  return {
    before: roundCgpa(currentCgpa),
    bothAttemptsCount: roundCgpa((points + retakePoints) / (completedUnits + failedUnits)),
    replacesFailure: roundCgpa((points + retakePoints) / completedUnits),
  };
}

const RETAKE_GRADES: readonly AcademicGrade[] = ['A', 'B', 'C', 'D', 'E', 'F'];

/** The retake letters on a scale, highest first (A to F on the 5-point scale). */
export function retakeGrades(scale?: GradingScale): string[] {
  return scale ? scaleBandRanges(scale).map((band) => band.grade) : [...RETAKE_GRADES];
}

/** The scale's fail grade (F on the 5-point scale). */
export function failGradeOf(scale?: GradingScale): string {
  return scale ? failGrade(scale) : 'F';
}

/** Both outcomes for every retake grade A to F (the table in carry-over §5.2), or the scale's letters. */
export function carryOverTable(input: {
  currentCgpa: number | null;
  completedUnits: number | null;
  failedUnits: number | null;
}, scale?: GradingScale): { grade: string; points: number; impact: CarryOverImpact }[] | null {
  const rows = retakeGrades(scale).map((grade) => ({ grade, points: pointsFor(grade, scale), impact: carryOverImpact({ ...input, retakeGrade: grade }, scale) }));
  if (rows.some((row) => row.impact === null)) return null;
  return rows as { grade: string; points: number; impact: CarryOverImpact }[];
}

export interface ScoreRow {
  score: string;
  units: string;
  /** Optional course code, for the receipt and the calculator link. */
  code?: string;
}

/** Credit-weighted average over rows with a valid score (0 to 100) and units. Incomplete rows are skipped. */
export function weightedAverageFromRows(rows: readonly ScoreRow[]) {
  const filled = rows.filter(isFilledRow);
  const valid = filled.flatMap((row) => {
    const score = parseNumber(row.score);
    const units = parseNumber(row.units);
    if (score === null || units === null || score < 0 || score > 100 || units <= 0) return [];
    return [{ totalScore: score, units }];
  });
  return { ...weightedAverageScore(valid), usedRows: valid.length, skippedRows: filled.length - valid.length };
}

function isFilledRow(row: ScoreRow): boolean {
  return Boolean(row.score.trim() || row.units.trim());
}

/** A filled row with a score from 0 to 100 and units above 0, as numbers; null otherwise. */
export function usableScoreRow(row: ScoreRow): { score: number; units: number } | null {
  const score = parseNumber(row.score);
  const units = parseNumber(row.units);
  if (score === null || units === null || score < 0 || score > 100 || units <= 0) return null;
  return { score, units };
}

/**
 * GPA and PI from the same scores, through the CGPA calculator's own split
 * (CA = min(30, score x 0.3), exam = max(0, score x 0.7)), so the figures match
 * the calculator exactly. Null when no row is usable.
 */
export function gpaAndPiFromRows(rows: readonly ScoreRow[], scale?: GradingScale): { gpa: number; pi: number; units: number } | null {
  const active = scale ?? SCALES.ng5;
  const metrics = rows.flatMap((row) => {
    const usable = usableScoreRow(row);
    if (!usable) return [];
    return [
      computeCourseMetrics({
        code: row.code?.trim() || 'VAR',
        title: '',
        units: usable.units,
        caScore: Math.min(30, usable.score * 0.3),
        examScore: Math.max(0, usable.score * 0.7),
      }, active),
    ];
  });
  if (!metrics.length) return null;
  const result = computeSemesterGPA(metrics, active);
  return { gpa: result.gpa, pi: result.pi, units: result.creditLoaded };
}

/**
 * The calculator rows ([{c, u, s}]) for "See these in the CGPA calculator",
 * or null unless every usable row has whole units from 1 to 6 (the
 * calculator's range) and at least one row is usable.
 */
export function calculatorRowsFromScoreRows(rows: readonly ScoreRow[]): { c: string; u: number; s: number }[] | null {
  const used = rows.flatMap((row) => {
    const usable = usableScoreRow(row);
    return usable ? [{ c: (row.code ?? '').trim().toUpperCase(), u: usable.units, s: usable.score }] : [];
  });
  if (!used.length || used.some((row) => !Number.isInteger(row.u) || row.u < 1 || row.u > 6)) return null;
  return used;
}

/** "/calculator?m=score&c=…", or null when the rows can't open there (see calculatorRowsFromScoreRows). */
export function calculatorLinkFromRows(rows: readonly ScoreRow[], scale?: GradingScale): string | null {
  const encoded = calculatorRowsFromScoreRows(rows);
  return encoded ? `/calculator?${encodeCalculation({ mode: 'score', rows: encoded, scale: scale?.id })}` : null;
}
