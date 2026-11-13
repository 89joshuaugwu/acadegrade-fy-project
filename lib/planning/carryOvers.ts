import {
  gradeFromScore,
  isCarryOver,
  isNotYetGraded,
  normaliseCourseCode,
  outstandingCarryOvers,
  type AcademicGrade,
  type CarryOverCourse,
} from '@/lib/cgpa/academicRules';

export interface PlanningCourse extends CarryOverCourse {
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
  grade: Extract<AcademicGrade, 'D' | 'E' | 'F'>;
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
export function knownGradeOf(course: CarryOverCourse): AcademicGrade | null {
  if (isNotYetGraded(course)) return null;
  if (finite(course.caScore) && finite(course.examScore)) return gradeFromScore(course.caScore + course.examScore).grade;
  if (finite(course.totalScore)) return gradeFromScore(course.totalScore).grade;
  return course.grade ?? null;
}

function totalOf(course: CarryOverCourse): number | null {
  if (finite(course.caScore) && finite(course.examScore)) return course.caScore + course.examScore;
  return finite(course.totalScore) ? course.totalScore : null;
}

/**
 * A4: outstanding carry-overs (an F not passed later under the same normalised
 * code) with their units, plus a separate D/E/F list. Awaiting-result and
 * pending rows are never counted. Semesters must be in chronological order.
 */
export function buildCarryOverReport(semesters: readonly PlanningSemester[]): CarryOverReport {
  const outstandingCodes = outstandingCarryOvers(semesters);
  const latestFail = new Map<string, OutstandingCarryOver>();
  const atRisk: AtRiskCourse[] = [];

  for (const semester of semesters) {
    for (const course of semester.courses) {
      const grade = knownGradeOf(course);
      const units = finite(course.units) ? course.units : 0;
      const title = course.title ?? '';
      if (grade === 'D' || grade === 'E' || grade === 'F') {
        atRisk.push({ code: course.code, title, units, grade, totalScore: totalOf(course), semesterLabel: semester.label });
      }
      if (!isCarryOver(course)) continue;
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
