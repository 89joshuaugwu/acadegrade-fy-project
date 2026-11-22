/**
 * A3: "what if" preview for courses still awaiting a result. Pure: nothing here
 * is saved. Expected grades apply only to awaiting-result and pending rows, as
 * grade-only rows (grade point = PI point), and this semester's summary is
 * replaced (never added twice) before the CGPA is recomputed.
 *
 * Same logic as acadegrade-mobile/lib/academic/semesterPreview.ts.
 */

import {
  computeCourseMetrics,
  computeCumulativeCGPA,
  computeSemesterGPA,
  isNotYetGraded,
  resolveDegreeClass,
  SCALES,
  type DegreeClassBand,
  type GradingScale,
  type ScaleClass,
} from '@/lib/cgpa/academicRules';

export interface PreviewCourse {
  id: string;
  units: number;
  caScore: number | null;
  examScore: number | null;
  /** A letter on the active scale. */
  grade?: string | null;
  isAR?: boolean;
  pending?: boolean;
}

export interface PreviewFigures {
  gpa: number;
  cgpa: number;
  /** The class on the active scale (the ng5 band, with its icon and range, when no scale is given). */
  band: DegreeClassBand | ScaleClass;
}

export interface SemesterPreviewInput {
  courses: readonly PreviewCourse[];
  expected: Readonly<Record<string, string>>;
  semesters: readonly { id: string; gpa: number; pi: number; creditLoaded: number }[];
  semesterId: string;
  /** The student's scale; the 5-point scale when left out. */
  scale?: GradingScale;
}

export interface SemesterPreviewResult {
  official: PreviewFigures;
  scenario: PreviewFigures;
  previewedCount: number;
}

function figures(courses: readonly PreviewCourse[], input: SemesterPreviewInput): PreviewFigures {
  const scale = input.scale ?? SCALES.ng5;
  const rows = courses.map((course) => computeCourseMetrics({
    code: '',
    title: '',
    units: course.units,
    caScore: course.caScore,
    examScore: course.examScore,
    grade: course.grade ?? null,
    ...(course.isAR !== undefined ? { isAR: course.isAR } : {}),
    ...(course.pending !== undefined ? { pending: course.pending } : {}),
  }, scale));
  const semester = computeSemesterGPA(rows, scale);
  const others = input.semesters.filter((sem) => sem.id !== input.semesterId);
  const cumulative = computeCumulativeCGPA([...others, semester]);
  return { gpa: semester.gpa, cgpa: cumulative.cgpa, band: input.scale ? resolveDegreeClass(cumulative.cgpa, input.scale) : resolveDegreeClass(cumulative.cgpa) };
}

export function previewSemester(input: SemesterPreviewInput): SemesterPreviewResult {
  let previewedCount = 0;
  const scenarioCourses = input.courses.map((course): PreviewCourse => {
    const grade = Object.prototype.hasOwnProperty.call(input.expected, course.id) ? input.expected[course.id] : undefined;
    if (!grade || !isNotYetGraded(course)) return course;
    previewedCount += 1;
    // A grade-only row: no scores, so the grade point is used for PI as well.
    return { id: course.id, units: course.units, caScore: null, examScore: null, grade };
  });
  return {
    official: figures(input.courses, input),
    scenario: figures(scenarioCourses, input),
    previewedCount,
  };
}
