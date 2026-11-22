/**
 * Switching grading scale: what changes, and the derived values to store.
 *
 * Courses keep their scores and letters. Scored courses are regraded on the
 * new scale (lossless: the score decides the letter). Letter-only courses keep
 * the letter the student entered, so switching back restores them; a letter
 * that is not on the new scale counts as 0 points until they switch back or
 * edit it. Awaiting-result and pending rows are never touched.
 */
import {
  computeCourseMetrics,
  computeCumulativeCGPA,
  computeSemesterGPA,
  gradePointFor,
  isNotYetGraded,
  resolveDegreeClass,
  roundCgpa,
  type GradingScale,
} from './academicRules';

export interface SwitchCourse {
  id: string;
  code: string;
  title?: string;
  units: number;
  caScore?: number | null;
  examScore?: number | null;
  totalScore?: number | null;
  grade?: string | null;
  estimated?: boolean;
  isAR?: boolean;
  pending?: boolean;
}

export interface SwitchSemester {
  id: string;
  label: string;
  courses: readonly SwitchCourse[];
}

export interface RescoredCourse {
  grade: string;
  gradePoint: number;
  piPoint: number;
  estimated: boolean;
}

const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

function hasScores(course: SwitchCourse): boolean {
  return finite(course.caScore) && finite(course.examScore);
}

/** The derived fields for a course on a scale, or null for rows that are not results yet. */
export function rescoreCourse(course: SwitchCourse, scale: GradingScale): RescoredCourse | null {
  if (isNotYetGraded(course)) return null;
  const metrics = computeCourseMetrics({
    code: course.code,
    title: course.title ?? '',
    units: Number(course.units) || 0,
    caScore: finite(course.caScore) ? course.caScore : null,
    examScore: finite(course.examScore) ? course.examScore : null,
    grade: course.grade ?? null,
  }, scale);
  if (!hasScores(course) && course.grade) {
    // Keep the student's letter; it is worth 0 when the scale does not have it.
    return { grade: course.grade, gradePoint: metrics.gradePoint, piPoint: metrics.piPoint, estimated: true };
  }
  return { grade: metrics.grade, gradePoint: metrics.gradePoint, piPoint: metrics.piPoint, estimated: metrics.estimated };
}

export interface SemesterUnderScale {
  id: string;
  gpa: number;
  pi: number;
  creditLoaded: number;
  courses: (RescoredCourse & { id: string })[];
}

/** A semester's courses and totals on a scale. */
export function semesterUnderScale(semester: SwitchSemester, scale: GradingScale): SemesterUnderScale {
  const courses: (RescoredCourse & { id: string })[] = [];
  const rows: { units: number; gradePoint: number; piPoint: number; grade: string }[] = [];
  for (const course of semester.courses) {
    const rescored = rescoreCourse(course, scale);
    if (!rescored) continue;
    courses.push({ id: course.id, ...rescored });
    rows.push({ units: Number(course.units) || 0, gradePoint: rescored.gradePoint, piPoint: rescored.piPoint, grade: rescored.grade });
  }
  const result = computeSemesterGPA(rows, scale);
  return { id: semester.id, gpa: result.gpa, pi: result.pi, creditLoaded: result.creditLoaded, courses };
}

export interface ScaleStanding {
  cgpa: number;
  className: string;
}

export interface ScaleSwitchPreview {
  before: ScaleStanding;
  after: ScaleStanding;
  /** Letter-only courses whose letter is not on the new scale (they count 0 points). */
  unknownLetters: { semesterLabel: string; code: string; grade: string }[];
  /** What to store after switching. */
  semesters: SemesterUnderScale[];
}

function standing(semesters: readonly SemesterUnderScale[], scale: GradingScale): ScaleStanding {
  const cgpa = roundCgpa(computeCumulativeCGPA(semesters).cgpa);
  return { cgpa, className: resolveDegreeClass(cgpa, scale).name };
}

export function previewScaleSwitch(
  semesters: readonly SwitchSemester[],
  from: GradingScale,
  to: GradingScale
): ScaleSwitchPreview {
  const before = semesters.map((semester) => semesterUnderScale(semester, from));
  const after = semesters.map((semester) => semesterUnderScale(semester, to));
  const unknownLetters: ScaleSwitchPreview['unknownLetters'] = [];
  for (const semester of semesters) {
    for (const course of semester.courses) {
      if (isNotYetGraded(course) || hasScores(course) || !course.grade) continue;
      if (gradePointFor(course.grade, to) === null) {
        unknownLetters.push({ semesterLabel: semester.label, code: course.code, grade: course.grade });
      }
    }
  }
  return { before: standing(before, from), after: standing(after, to), unknownLetters, semesters: after };
}
