import {
  GRADE_POINTS,
  computeCourseMetrics,
  computeCumulativeCGPA,
  computeSemesterGPA,
  roundCgpa,
  type AcademicGrade,
} from '@/lib/cgpa/academicRules';
import { publicClassFor, type PublicClassBand } from './scales';

/**
 * The one example student every public page uses (home, features, scanner,
 * AcadeMind, calculator, tools). Every figure is computed with the real
 * engine in lib/cgpa/academicRules.ts and pinned by tests, so the numbers
 * on every page agree and add up.
 */

export const EXAMPLE_STUDENT = {
  name: 'Chidera Okeke',
  firstName: 'Chidera',
  regNo: 'CSC/2023/0147',
  level: 300,
  levelLabel: '300L',
  programme: 'Computer Science',
  department: 'Department of Computer Science',
  faculty: 'Faculty of Physical Sciences',
  session: '2025/2026',
  semester: 'First Semester',
} as const;

/** "Example · 300L Computer Science · 2025/2026 First Semester" */
export const EXAMPLE_META_LINE = `Example · ${EXAMPLE_STUDENT.levelLabel} ${EXAMPLE_STUDENT.programme} · ${EXAMPLE_STUDENT.session} ${EXAMPLE_STUDENT.semester}`;

export interface ExampleCourse {
  code: string;
  title: string;
  units: number;
  /** Continuous assessment, out of 30. */
  ca: number;
  /** Examination, out of 70. */
  exam: number;
}

/** 300L first semester, 2025/2026. Totals 76, 65, 56, 72, 61. */
export const EXAMPLE_COURSES: readonly ExampleCourse[] = [
  { code: 'CSC 301', title: 'Data Structures', units: 3, ca: 24, exam: 52 },
  { code: 'CSC 303', title: 'Operating Systems', units: 3, ca: 21, exam: 44 },
  { code: 'MTH 301', title: 'Numerical Analysis', units: 3, ca: 18, exam: 38 },
  { code: 'CSC 305', title: 'Computer Networks', units: 2, ca: 25, exam: 47 },
  { code: 'GST 311', title: 'Entrepreneurship', units: 2, ca: 20, exam: 41 },
];

export interface ExamplePriorSemester {
  label: string;
  session: string;
  units: number;
  points: number;
  note?: string;
}

/** The four earlier semesters: 85 + 86 + 72 + 88 = 331 points over 74 units. */
export const EXAMPLE_PRIOR_SEMESTERS: readonly ExamplePriorSemester[] = [
  { label: '100L First Semester', session: '2023/2024', units: 18, points: 85 },
  { label: '100L Second Semester', session: '2023/2024', units: 18, points: 86 },
  { label: '200L First Semester', session: '2024/2025', units: 19, points: 72, note: 'MTH 201: F' },
  { label: '200L Second Semester', session: '2024/2025', units: 19, points: 88, note: 'MTH 201 passed on retake' },
];

export const EXAMPLE_PRIOR_TOTALS = EXAMPLE_PRIOR_SEMESTERS.reduce(
  (sum, semester) => ({ units: sum.units + semester.units, points: sum.points + semester.points }),
  { units: 0, points: 0 }
);

/** The grades the example's scores earn: A, B, C, A, B. */
export function exampleCourseMetrics() {
  return EXAMPLE_COURSES.map((course) =>
    computeCourseMetrics({ code: course.code, title: course.title, units: course.units, caScore: course.ca, examScore: course.exam })
  );
}

export const EXAMPLE_GRADES: Readonly<Record<string, AcademicGrade>> = Object.fromEntries(
  exampleCourseMetrics().map((metrics) => [metrics.code, metrics.grade])
);

/** Semester GPA and PI from the scores (GPA 4.15, PI 3.30). */
export function exampleSemesterFromScores() {
  return computeSemesterGPA(exampleCourseMetrics());
}

export interface ExampleSlipState {
  rows: { code: string; title: string; units: number; grade: AcademicGrade; point: number; weighted: number }[];
  units: number;
  points: number;
  /** Unrounded; display with formatCgpa. */
  gpa: number;
  /** Unrounded cumulative after this semester. */
  cgpa: number;
  totalUnits: number;
  totalPoints: number;
  classBand: PublicClassBand;
  /** Number of F grades on the slip. */
  carryOvers: number;
  /** Rounded CGPA distance to First Class (0 when already there). */
  toFirstClass: number;
}

/**
 * The live slip in letter-grade mode: the example's grades, with any
 * overrides, on top of the prior record. Used by the home hero; the numbers
 * at load are GPA 4.15, CGPA 4.43, Second Class Upper.
 */
export function computeExampleSlip(overrides: Partial<Record<string, AcademicGrade>> = {}): ExampleSlipState {
  const rows = EXAMPLE_COURSES.map((course) => {
    const grade = overrides[course.code] ?? EXAMPLE_GRADES[course.code];
    const point = GRADE_POINTS[grade];
    return { code: course.code, title: course.title, units: course.units, grade, point, weighted: point * course.units };
  });
  const semester = computeSemesterGPA(rows.map((row) => ({ units: row.units, gradePoint: row.point, piPoint: row.point, grade: row.grade })));
  const prior = EXAMPLE_PRIOR_TOTALS;
  const cumulative = computeCumulativeCGPA([
    { gpa: prior.points / prior.units, pi: prior.points / prior.units, creditLoaded: prior.units },
    { gpa: semester.gpa, pi: semester.pi, creditLoaded: semester.creditLoaded },
  ]);
  const points = rows.reduce((sum, row) => sum + row.weighted, 0);
  const firstClassFloor = 4.5;
  return {
    rows,
    units: semester.creditLoaded,
    points,
    gpa: semester.gpa,
    cgpa: cumulative.cgpa,
    totalUnits: cumulative.totalCredits,
    totalPoints: prior.points + points,
    classBand: publicClassFor(cumulative.cgpa),
    carryOvers: rows.filter((row) => row.grade === 'F').length,
    toFirstClass: Math.max(0, roundCgpa(firstClassFloor - roundCgpa(cumulative.cgpa))),
  };
}

/** Running CGPA after each earlier semester and after this one (4.72, 4.75, 4.42, 4.47, 4.43). */
export function exampleRunningCgpa(): number[] {
  let units = 0;
  let points = 0;
  const running = EXAMPLE_PRIOR_SEMESTERS.map((semester) => {
    units += semester.units;
    points += semester.points;
    return points / units;
  });
  const current = computeExampleSlip();
  running.push(current.cgpa);
  return running;
}
