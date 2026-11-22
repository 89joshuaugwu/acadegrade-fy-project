import {
  gradeFromScore,
  isCarryOver,
  isNotYetGraded,
  normaliseCourseCode,
  outstandingCarryOvers,
  failGrade,
  type CarryOverCourse,
  type GradingScale,
} from '@/lib/cgpa/academicRules';

export interface PlanningCourse extends CarryOverCourse<string> {
  title?: string | null;
  units?: number | null;
}

export interface PlanningSemester {
  id: string;
  label: string;
  courses: readonly PlanningCourse[];
}

export interface OutstandingCarryOver {
  /** Code as written on the latest failed attempt. */
  code: string;
  normalisedCode: string;
  title: string;
  units: number;
  /** Semester of the latest failed attempt. */
  semesterLabel: string;
  /** Number of failed attempts so far. */
  attempts: number;
}

export interface AtRiskCourse {
  code: string;
  title: string;
  units: number;
  /** D, E or F on the 5-point scale; any band starting below 50 on the active scale. */
  grade: string;
  totalScore: number | null;
  semesterLabel: string;
}

export interface CarryOverReport {
  outstanding: OutstandingCarryOver[];
  outstandingUnits: number;
  /** Every graded D, E or F row. D and E are passes; F is a fail. */
  atRisk: AtRiskCourse[];
}

const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

/**
 * The grade a row has under the scale, or null when it is not a result yet.
 * Mirrors the shared module's carry-over grading; `isCarryOver(row)` is
 * exactly `knownGradeOf(row) === 'F'` (pinned by tests).
 */
export function knownGradeOf(course: CarryOverCourse<string>, scale?: GradingScale): string | null {
  if (isNotYetGraded(course)) return null;
  const grade = (score: number) => (scale ? gradeFromScore(score, scale).grade : gradeFromScore(score).grade);
  if (finite(course.caScore) && finite(course.examScore)) return grade(course.caScore + course.examScore);
  if (finite(course.totalScore)) return grade(course.totalScore);
  if (!scale) return course.grade ?? null;
  // On a scale, a letter that is not on it is unknown (as in the shared rules).
  const wanted = String(course.grade ?? '').trim().toUpperCase();
  return scale.bands.find((band) => band.grade.toUpperCase() === wanted)?.grade ?? null;
}

/** The scale's fail grade ('F' on the 5-point scale). */
export function failGradeOf(scale?: GradingScale): string {
  return scale ? failGrade(scale) : 'F';
}

/** A grade whose band starts below 50: D, E or F on the 5-point scale. */
export function isLowGrade(grade: string | null, scale?: GradingScale): boolean {
  if (grade === null) return false;
  if (!scale) return grade === 'D' || grade === 'E' || grade === 'F';
  const band = scale.bands.find((item) => item.grade === grade);
  return Boolean(band && band.minScore < 50);
}

function totalOf(course: CarryOverCourse<string>): number | null {
  if (finite(course.caScore) && finite(course.examScore)) return course.caScore + course.examScore;
  return finite(course.totalScore) ? course.totalScore : null;
}

/**
 * A4: outstanding carry-overs (an F not passed later under the same normalised
 * code) with their units, plus a separate D/E/F list. Awaiting-result and
 * pending rows are never counted. Semesters must be in chronological order.
 */
export function buildCarryOverReport(semesters: readonly PlanningSemester[], scale?: GradingScale): CarryOverReport {
  const outstandingCodes = outstandingCarryOvers(semesters, scale);
  const latestFail = new Map<string, OutstandingCarryOver>();
  const atRisk: AtRiskCourse[] = [];

  for (const semester of semesters) {
    for (const course of semester.courses) {
      const grade = knownGradeOf(course, scale);
      const units = finite(course.units) ? course.units : 0;
      const title = course.title ?? '';
      if (grade !== null && isLowGrade(grade, scale)) {
        atRisk.push({ code: course.code, title, units, grade, totalScore: totalOf(course), semesterLabel: semester.label });
      }
      if (!(scale ? isCarryOver(course, scale) : isCarryOver(course as CarryOverCourse))) continue;
      const key = normaliseCourseCode(course.code);
      const previous = latestFail.get(key);
      latestFail.set(key, {
        code: course.code,
        normalisedCode: key,
        title,
        units,
        semesterLabel: semester.label,
        attempts: (previous?.attempts ?? 0) + 1,
      });
    }
  }

  const outstanding = outstandingCodes
    .map(code => latestFail.get(code))
    .filter((item): item is OutstandingCarryOver => Boolean(item));
  return {
    outstanding,
    outstandingUnits: outstanding.reduce((sum, item) => sum + item.units, 0),
    atRisk,
  };
}
