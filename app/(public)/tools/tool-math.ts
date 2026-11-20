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
  type AcademicGrade,
  type DegreeClassBand,
} from '@/lib/cgpa/academicRules';
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
export function suggestDecimal(text: string): number | null {
  const trimmed = text.trim();
  if (!/^\d{3}$/.test(trimmed)) return null;
  const value = Number(trimmed);
  return value >= 100 && value <= MAX_GRADE_POINT * 100 ? value / 100 : null;
}

export interface DegreeClassCheck {
  band: DegreeClassBand;
  rounded: number;
  /** The next class up, or null at First Class. */
  next: DegreeClassBand | null;
  /** CGPA still needed to reach the next class. */
  gap: number | null;
}

/** Null when the CGPA is outside 0 to 5. */
export function checkDegreeClass(cgpa: number | null): DegreeClassCheck | null {
  if (cgpa === null || cgpa < 0 || cgpa > MAX_GRADE_POINT) return null;
  const rounded = roundCgpa(cgpa);
  const band = resolveDegreeClass(rounded);
  const index = DEGREE_CLASS_BANDS.indexOf(band);
  const next = index > 0 ? DEGREE_CLASS_BANDS[index - 1] : null;
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
}): RequiredGpaOutcome {
  const { currentCgpa, completedUnits, remainingUnits, targetCgpa } = input;
  if (
    currentCgpa === null || completedUnits === null || remainingUnits === null || targetCgpa === null ||
    currentCgpa < 0 || currentCgpa > MAX_GRADE_POINT ||
    targetCgpa < 0 || targetCgpa > MAX_GRADE_POINT ||
    completedUnits < 0 || remainingUnits <= 0
  ) {
    return { status: 'invalid' };
  }
  const maxReachable = roundCgpa(maxReachableCgpa({ currentCgpa, completedUnits, remainingUnits }));
  const required = requiredAverageForTarget({ currentCgpa, completedUnits, remainingUnits, targetCgpa });
  if (required === null) return { status: 'invalid' };
  if (required > MAX_GRADE_POINT) return { status: 'unreachable', maxReachable };
  if (required <= 0) return { status: 'secured', maxReachable, lowestFinish: lowestFinish({ currentCgpa, completedUnits, remainingUnits }) };
  return { status: 'needed', required: roundNeededUp(required), maxReachable };
}

/**
 * The needed average is rounded UP to 2 dp (4.65225 → 4.66), so a student never
 * aims too low. Floating-point noise is cleared first, so an exact 3.65 stays 3.65.
 */
function roundNeededUp(value: number): number {
  const cleaned = Math.round(value * 1e6) / 1e6;
  return Math.min(MAX_GRADE_POINT, Math.ceil(cleaned * 100 - 1e-9) / 100);
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
export function carryOverCeiling(completedUnits: number | null, failedUnits: number | null): number | null {
  if (completedUnits === null || failedUnits === null || completedUnits <= 0 || failedUnits <= 0 || failedUnits > completedUnits) return null;
  return roundCgpa((MAX_GRADE_POINT * (completedUnits - failedUnits)) / completedUnits);
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
  retakeGrade: AcademicGrade;
}): CarryOverImpact | null {
  const { currentCgpa, completedUnits, failedUnits, retakeGrade } = input;
  if (
    currentCgpa === null || completedUnits === null || failedUnits === null ||
    currentCgpa < 0 || currentCgpa > MAX_GRADE_POINT ||
    completedUnits <= 0 || failedUnits <= 0 || failedUnits > completedUnits
  ) {
    return null;
  }
  const ceiling = carryOverCeiling(completedUnits, failedUnits);
  if (ceiling !== null && roundCgpa(currentCgpa) > ceiling) return null;
  const points = currentCgpa * completedUnits;
  const retakePoints = GRADE_POINTS[retakeGrade] * failedUnits;
  return {
    before: roundCgpa(currentCgpa),
    bothAttemptsCount: roundCgpa((points + retakePoints) / (completedUnits + failedUnits)),
    replacesFailure: roundCgpa((points + retakePoints) / completedUnits),
  };
}

const RETAKE_GRADES: readonly AcademicGrade[] = ['A', 'B', 'C', 'D', 'E', 'F'];

/** Both outcomes for every retake grade A to F (the table in carry-over §5.2). */
export function carryOverTable(input: {
  currentCgpa: number | null;
  completedUnits: number | null;
  failedUnits: number | null;
}): { grade: AcademicGrade; points: number; impact: CarryOverImpact }[] | null {
  const rows = RETAKE_GRADES.map((grade) => ({ grade, points: GRADE_POINTS[grade], impact: carryOverImpact({ ...input, retakeGrade: grade }) }));
  if (rows.some((row) => row.impact === null)) return null;
  return rows as { grade: AcademicGrade; points: number; impact: CarryOverImpact }[];
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
export function gpaAndPiFromRows(rows: readonly ScoreRow[]): { gpa: number; pi: number; units: number } | null {
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
      }),
    ];
  });
  if (!metrics.length) return null;
  const result = computeSemesterGPA(metrics);
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
export function calculatorLinkFromRows(rows: readonly ScoreRow[]): string | null {
  const encoded = calculatorRowsFromScoreRows(rows);
  return encoded ? `/calculator?${encodeCalculation({ mode: 'score', rows: encoded })}` : null;
}
