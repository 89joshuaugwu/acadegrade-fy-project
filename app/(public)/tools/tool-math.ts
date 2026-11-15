import {
  DEGREE_CLASS_BANDS,
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

/** Parses a text field. Empty or non-numeric text is null, never zero. */
export function parseNumber(text: string): number | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null;
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
  | { status: 'secured'; maxReachable: number }
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
  if (required <= 0) return { status: 'secured', maxReachable };
  return { status: 'needed', required: roundCgpa(required), maxReachable };
}

export interface CarryOverImpact {
  before: number;
  /** Retake counted as extra units; the failed attempt stays in the total. */
  bothAttemptsCount: number;
  /** Retake replaces the failed attempt in the total. */
  replacesFailure: number;
}

/** Null when the numbers cannot describe a failed course inside the completed units. */
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
  const points = currentCgpa * completedUnits;
  const retakePoints = GRADE_POINTS[retakeGrade] * failedUnits;
  return {
    before: roundCgpa(currentCgpa),
    bothAttemptsCount: roundCgpa((points + retakePoints) / (completedUnits + failedUnits)),
    replacesFailure: roundCgpa((points + retakePoints) / completedUnits),
  };
}

export interface ScoreRow {
  score: string;
  units: string;
}

/** Credit-weighted average over rows with a valid score (0 to 100) and units. Incomplete rows are skipped. */
export function weightedAverageFromRows(rows: readonly ScoreRow[]) {
  const filled = rows.filter((row) => row.score.trim() || row.units.trim());
  const valid = filled.flatMap((row) => {
    const score = parseNumber(row.score);
    const units = parseNumber(row.units);
    if (score === null || units === null || score < 0 || score > 100 || units <= 0) return [];
    return [{ totalScore: score, units }];
  });
  return { ...weightedAverageScore(valid), usedRows: valid.length, skippedRows: filled.length - valid.length };
}
