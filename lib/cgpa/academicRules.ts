/**
 * AcadeGrade academic rules: the single source of truth for grading,
 * GPA/CGPA, degree classification, target planning and carry-overs.
 *
 * This file is byte-identical in acadegrade-web/lib/cgpa/academicRules.ts and
 * acadegrade-mobile/lib/cgpa/academicRules.ts. Both repos run the shared
 * fixture tests/fixtures/academic-rules.json against it. Keep it pure: no
 * imports, no platform APIs, erasable TypeScript only (Node strips the types
 * when the Android tests import it directly).
 */

export type AcademicGrade = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

/** Top of the 5-point scale. */
export const MAX_GRADE_POINT = 5;

export interface GradeBand {
  grade: AcademicGrade;
  minScore: number;
  /** Highest whole-number score in the band, for display only. */
  maxScore: number;
  gradePoint: number;
}

/** Nigerian 5-point scale, highest band first. Matching uses minScore only. */
export const GRADE_BANDS: readonly GradeBand[] = [
  { grade: 'A', minScore: 70, maxScore: 100, gradePoint: 5 },
  { grade: 'B', minScore: 60, maxScore: 69, gradePoint: 4 },
  { grade: 'C', minScore: 50, maxScore: 59, gradePoint: 3 },
  { grade: 'D', minScore: 45, maxScore: 49, gradePoint: 2 },
  { grade: 'E', minScore: 40, maxScore: 44, gradePoint: 1 },
  { grade: 'F', minScore: 0, maxScore: 39, gradePoint: 0 },
];

export const GRADE_POINTS: Readonly<Record<AcademicGrade, number>> = { A: 5, B: 4, C: 3, D: 2, E: 1, F: 0 };

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/** Removes binary floating-point noise (e.g. 69.99999999999999 -> 70) without changing real decimals. */
function clean(value: number): number {
  return Number(value.toPrecision(12));
}

/**
 * Grade and grade point for a total score. Lower-bound bands, so there are no
 * gaps: 69.5 is a B, never an F. Non-finite or below-range scores are F.
 */
export function gradeFromScore(
  totalScore: number,
  bands: readonly Pick<GradeBand, 'grade' | 'minScore' | 'gradePoint'>[] = GRADE_BANDS
): { grade: AcademicGrade; gradePoint: number } {
  if (isFiniteNumber(totalScore)) {
    const score = clean(totalScore);
    let best: Pick<GradeBand, 'grade' | 'minScore' | 'gradePoint'> | undefined;
    for (const band of bands) {
      if (score >= band.minScore && (!best || band.minScore > best.minScore)) best = band;
    }
    if (best) return { grade: best.grade, gradePoint: best.gradePoint };
  }
  return { grade: 'F', gradePoint: 0 };
}

/** Rows that are not results yet and never count towards GPA, CGPA or carry-overs. */
export interface AcademicRowFlags {
  /** Awaiting result. */
  isAR?: boolean;
  /** Imported course definition (share code / partial OCR) awaiting the student's score or grade. */
  pending?: boolean;
}

export interface AcademicCourseInput extends AcademicRowFlags {
  code: string;
  title: string;
  units: number;
  caScore: number | null;
  examScore: number | null;
  grade?: AcademicGrade | null;
}

export interface AcademicCourseMetrics extends AcademicRowFlags {
  code: string;
  title: string;
  units: number;
  caScore: number | null;
  examScore: number | null;
  totalScore: number | null;
  grade: AcademicGrade;
  gradePoint: number;
  /** Continuous PI point: totalScore / 100 * 5, or the grade point when only a letter is known. */
  piPoint: number;
  estimated: boolean;
}

/** True when a row is awaiting a result or still pending and must not be counted. */
export function isNotYetGraded(row: AcademicRowFlags): boolean {
  return row.isAR === true || row.pending === true;
}

/**
 * Metrics for one course. Scores win over a letter grade; a letter grade alone
 * is "estimated" with PI equal to its grade point; nothing known is F/0.
 * isAR/pending are carried through only when provided (Firestore rejects undefined).
 */
export function computeCourseMetrics(course: AcademicCourseInput): AcademicCourseMetrics {
  const totalScore = isFiniteNumber(course.caScore) && isFiniteNumber(course.examScore)
    ? course.caScore + course.examScore
    : null;

  let grade: AcademicGrade;
  let gradePoint: number;
  let piPoint: number;
  let estimated = false;

  if (totalScore !== null) {
    ({ grade, gradePoint } = gradeFromScore(totalScore));
    piPoint = (totalScore / 100) * MAX_GRADE_POINT;
  } else if (course.grade) {
    grade = course.grade;
    gradePoint = GRADE_POINTS[grade];
    piPoint = gradePoint;
    estimated = true;
  } else {
    grade = 'F';
    gradePoint = 0;
    piPoint = 0;
  }

  return {
    code: course.code,
    title: course.title,
    units: course.units,
    caScore: course.caScore,
    examScore: course.examScore,
    totalScore,
    grade,
    gradePoint,
    piPoint,
    estimated,
    ...(course.isAR !== undefined ? { isAR: course.isAR } : {}),
    ...(course.pending !== undefined ? { pending: course.pending } : {}),
  };
}

export interface GpaRow extends AcademicRowFlags {
  units: number;
  gradePoint: number;
  piPoint: number;
  grade: AcademicGrade;
}

export interface SemesterGpaResult {
  gpa: number;
  pi: number;
  creditLoaded: number;
  courseCount: number;
  gradeDistribution: Record<AcademicGrade, number>;
}

/**
 * Semester GPA and PI. GPA = sum(gradePoint x units) / sum(units) over graded
 * rows; awaiting-result and pending rows are skipped. courseCount is every row.
 */
export function computeSemesterGPA(courses: readonly GpaRow[]): SemesterGpaResult {
  let totalWeightedGP = 0;
  let totalWeightedPI = 0;
  let totalUnits = 0;
  const gradeDistribution: Record<AcademicGrade, number> = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 };

  for (const course of courses) {
    if (isNotYetGraded(course)) continue;
    totalWeightedGP += course.gradePoint * course.units;
    totalWeightedPI += course.piPoint * course.units;
    totalUnits += course.units;
    gradeDistribution[course.grade]++;
  }

  return {
    gpa: totalUnits > 0 ? totalWeightedGP / totalUnits : 0,
    pi: totalUnits > 0 ? totalWeightedPI / totalUnits : 0,
    creditLoaded: totalUnits,
    courseCount: courses.length,
    gradeDistribution,
  };
}

export interface SemesterSummaryInput {
  gpa: number;
  pi: number;
  creditLoaded: number;
  /** Ignored for CGPA (see computeCumulativeCGPA). */
  isComplete?: boolean;
}

export interface CumulativeCgpaResult {
  cgpa: number;
  pi: number;
  totalCredits: number;
  totalCourses: number;
}

/**
 * CGPA and cumulative PI weighted by each semester's graded credit load.
 * creditLoaded already excludes awaiting-result and pending rows.
 *
 * Rule: every graded (non-AR, non-pending) course counts, whether or not its
 * semester is marked complete. Do not filter semesters by isComplete before
 * calling this; it ignores that flag on purpose so web and Android agree.
 */
export function computeCumulativeCGPA(semesters: readonly SemesterSummaryInput[]): CumulativeCgpaResult {
  let totalWeightedGPA = 0;
  let totalWeightedPI = 0;
  let totalCredits = 0;

  for (const sem of semesters) {
    const credits = Number(sem.creditLoaded) || 0;
    if (credits > 0) {
      totalWeightedGPA += (Number(sem.gpa) || 0) * credits;
      totalWeightedPI += (Number(sem.pi) || 0) * credits;
      totalCredits += credits;
    }
  }

  return {
    cgpa: totalCredits > 0 ? totalWeightedGPA / totalCredits : 0,
    pi: totalCredits > 0 ? totalWeightedPI / totalCredits : 0,
    totalCredits,
    totalCourses: 0,
  };
}

/**
 * CGPA/GPA rounded half-up to the 2 decimals the UI shows. Float-safe: 4.495,
 * 0.995 and 2.675 round up as written. Non-finite input gives 0.
 */
export function roundCgpa(value: number | null | undefined): number {
  if (!isFiniteNumber(value)) return 0;
  return Math.round(clean(value * 100)) / 100;
}

/** The 2-decimal CGPA/GPA string to display. Always agrees with resolveDegreeClass. */
export function formatCgpa(value: number | null | undefined): string {
  return roundCgpa(value).toFixed(2);
}

export type DegreeClassShortLabel = '1st' | '2:1' | '2:2' | '3rd' | 'Pass' | 'Fail';

export interface DegreeClassBand {
  label: string;
  shortLabel: DegreeClassShortLabel;
  icon: string;
  /** Formal wording used on transcripts. */
  transcriptLabel: string;
  /** Lowest rounded CGPA in the class. Classification uses only this. */
  minCGPA: number;
  /** Highest rounded (2-decimal) CGPA in the class, for display. */
  maxCGPA: number;
}

/** Degree classes, highest first. Lower-bound thresholds on the rounded CGPA; no gaps. */
export const DEGREE_CLASS_BANDS: readonly DegreeClassBand[] = [
  { label: 'First Class', shortLabel: '1st', icon: '🏆', transcriptLabel: 'First Class Honours', minCGPA: 4.5, maxCGPA: 5.0 },
  { label: 'Second Class Upper (2:1)', shortLabel: '2:1', icon: '🎖', transcriptLabel: 'Second Class Honours (Upper Division)', minCGPA: 3.5, maxCGPA: 4.49 },
  { label: 'Second Class Lower (2:2)', shortLabel: '2:2', icon: '✅', transcriptLabel: 'Second Class Honours (Lower Division)', minCGPA: 2.4, maxCGPA: 3.49 },
  { label: 'Third Class', shortLabel: '3rd', icon: '⚠️', transcriptLabel: 'Third Class Honours', minCGPA: 1.5, maxCGPA: 2.39 },
  { label: 'Pass', shortLabel: 'Pass', icon: '🔴', transcriptLabel: 'Pass', minCGPA: 1.0, maxCGPA: 1.49 },
  { label: 'Fail', shortLabel: 'Fail', icon: '❌', transcriptLabel: 'Fail', minCGPA: 0, maxCGPA: 0.99 },
];

/** Degree class of the displayed (rounded) CGPA. Missing or invalid values are Fail. */
export function resolveDegreeClass(cgpa: number | null | undefined): DegreeClassBand {
  const rounded = roundCgpa(cgpa);
  for (const band of DEGREE_CLASS_BANDS) {
    if (rounded >= band.minCGPA) return band;
  }
  return DEGREE_CLASS_BANDS[DEGREE_CLASS_BANDS.length - 1];
}

export interface TargetPlanInput {
  currentCgpa: number;
  completedUnits: number;
  remainingUnits: number;
}

/**
 * Average GPA needed over the remaining units to finish on targetCgpa:
 * (target x (completed + remaining) - current x completed) / remaining.
 * Returned unclamped (above 5 = out of reach, below 0 = already secured);
 * null when there are no remaining units.
 */
export function requiredAverageForTarget(input: TargetPlanInput & { targetCgpa: number }): number | null {
  const { currentCgpa, completedUnits, targetCgpa, remainingUnits } = input;
  if (!(remainingUnits > 0)) return null;
  const requiredTotalGP = (targetCgpa * (completedUnits + remainingUnits)) - (currentCgpa * completedUnits);
  return requiredTotalGP / remainingUnits;
}

/** Highest CGPA reachable if every remaining unit earns the maximum grade point. */
export function maxReachableCgpa(input: TargetPlanInput): number {
  const completed = isFiniteNumber(input.completedUnits) && input.completedUnits > 0 ? input.completedUnits : 0;
  const remaining = isFiniteNumber(input.remainingUnits) && input.remainingUnits > 0 ? input.remainingUnits : 0;
  const current = isFiniteNumber(input.currentCgpa) ? input.currentCgpa : 0;
  const total = completed + remaining;
  if (total <= 0) return 0;
  return (current * completed + MAX_GRADE_POINT * remaining) / total;
}

export interface CarryOverCourse extends AcademicRowFlags {
  code: string;
  caScore?: number | null;
  examScore?: number | null;
  totalScore?: number | null;
  grade?: AcademicGrade | null;
}

/** Uppercase with all whitespace removed, so "csc 201" and "CSC201" match. */
export function normaliseCourseCode(code: string): string {
  return String(code ?? '').toUpperCase().replace(/\s+/g, '');
}

/** Grade under the scale, or null when the row is not a result yet or nothing is known. */
function knownGrade(course: CarryOverCourse): AcademicGrade | null {
  if (isNotYetGraded(course)) return null;
  if (isFiniteNumber(course.caScore) && isFiniteNumber(course.examScore)) {
    return gradeFromScore(course.caScore + course.examScore).grade;
  }
  if (isFiniteNumber(course.totalScore)) return gradeFromScore(course.totalScore).grade;
  return course.grade ?? null;
}

/** A failed (F) course. Awaiting-result, pending and unknown rows are never carry-overs. */
export function isCarryOver(course: CarryOverCourse): boolean {
  return knownGrade(course) === 'F';
}

/**
 * Normalised codes of failed courses not passed in a later semester.
 * Semesters must be in chronological order. A later awaiting-result, pending or
 * unknown row does not clear a failure. Order follows each course's first
 * failure in its current outstanding run.
 */
export function outstandingCarryOvers(
  semesters: readonly { courses: readonly CarryOverCourse[] }[]
): string[] {
  const outstanding = new Set<string>();
  for (const semester of semesters) {
    for (const course of semester.courses) {
      const code = normaliseCourseCode(course.code);
      if (!code) continue;
      const grade = knownGrade(course);
      if (grade === 'F') outstanding.add(code);
      else if (grade !== null) outstanding.delete(code);
    }
  }
  return [...outstanding];
}
