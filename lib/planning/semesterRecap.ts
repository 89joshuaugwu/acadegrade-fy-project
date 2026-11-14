/**
 * C3: the one-time recap shown after a semester is completed. Pure. Awaiting
 * result and pending rows never count as graded, earned or failed.
 *
 * Same logic as acadegrade-mobile/lib/academic/semesterRecap.ts.
 */

import {
  computeCumulativeCGPA,
  GRADE_POINTS,
  normaliseCourseCode,
  outstandingCarryOvers,
  resolveDegreeClass,
  type AcademicGrade,
  type DegreeClassBand,
} from '@/lib/cgpa/academicRules';
import { knownGradeOf, type PlanningCourse } from '@/lib/planning/carryOvers';
import type { AiEligibilityView, PrivacyState } from '@/lib/consent/requirements';

export interface RecapSemester {
  id: string;
  label?: string;
  gpa: number;
  pi: number;
  creditLoaded: number;
  isComplete?: boolean;
}

export interface SemesterRecap {
  semesterId: string;
  label: string;
  gpa: number;
  previousGpa: number | null;
  delta: number | null;
  /** Units of graded, non-F courses this semester. */
  unitsEarned: number;
  strongest: { code: string; title: string; grade: AcademicGrade } | null;
  /** Class before this semester; null when nothing earlier was graded. */
  classBefore: DegreeClassBand | null;
  classAfter: DegreeClassBand;
  /** Course codes (as written this semester) whose earlier failure this semester cleared. */
  carryOversCleared: string[];
}

export interface SemesterRecapInput {
  /** Chronological order. */
  semesters: readonly RecapSemester[];
  coursesBySemester: Readonly<Record<string, readonly PlanningCourse[]>>;
  semesterId: string;
}

const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const graded = (semester: RecapSemester) => (Number(semester.creditLoaded) || 0) > 0;

function scoreOf(course: PlanningCourse): number | null {
  if (finite(course.caScore) && finite(course.examScore)) return course.caScore + course.examScore;
  return finite(course.totalScore) ? course.totalScore : null;
}

export function buildSemesterRecap(input: SemesterRecapInput): SemesterRecap | null {
  const index = input.semesters.findIndex((semester) => semester.id === input.semesterId);
  if (index < 0) return null;
  const current = input.semesters[index];
  const earlier = input.semesters.slice(0, index);
  const through = input.semesters.slice(0, index + 1);
  const courses = input.coursesBySemester[current.id] ?? [];

  const previous = [...earlier].reverse().find(graded) ?? null;
  const previousGpa = previous ? previous.gpa : null;

  let unitsEarned = 0;
  let strongest: SemesterRecap['strongest'] = null;
  let bestRank = -Infinity;
  for (const course of courses) {
    const grade = knownGradeOf(course);
    if (grade === null) continue;
    const units = finite(course.units) ? course.units : 0;
    if (grade !== 'F') unitsEarned += units;
    // Rank by grade point, then by score within the grade.
    const rank = GRADE_POINTS[grade] * 1000 + (scoreOf(course) ?? 0);
    if (grade !== 'F' && rank > bestRank) {
      bestRank = rank;
      strongest = { code: course.code, title: course.title ?? '', grade };
    }
  }

  const cgpaBefore = earlier.some(graded) ? computeCumulativeCGPA(earlier).cgpa : null;
  const cgpaAfter = computeCumulativeCGPA(through).cgpa;

  const chronological = (list: readonly RecapSemester[]) => list.map((semester) => ({ courses: input.coursesBySemester[semester.id] ?? [] }));
  const after = new Set(outstandingCarryOvers(chronological(through)));
  const cleared = outstandingCarryOvers(chronological(earlier)).filter((code) => !after.has(code));
  const carryOversCleared = cleared.map((code) => courses.find((course) => normaliseCourseCode(course.code) === code)?.code ?? code);

  return {
    semesterId: current.id,
    label: current.label ?? '',
    gpa: current.gpa,
    previousGpa,
    delta: previousGpa === null ? null : current.gpa - previousGpa,
    unitsEarned,
    strongest,
    classBefore: cgpaBefore === null ? null : resolveDegreeClass(cgpaBefore),
    classAfter: resolveDegreeClass(cgpaAfter),
    carryOversCleared,
  };
}

/** The recap opens once: for a complete semester that has no recapShownAt yet. */
export function shouldShowRecap(semester: { isComplete?: boolean; recapShownAt?: unknown } | null | undefined): boolean {
  return Boolean(semester && semester.isComplete === true && !semester.recapShownAt);
}

/**
 * Whether to offer the "Get a Written Analysis" link (Review Focus #5). The
 * server's answer wins; without it the profile must show an adult who said
 * yes to AI. Hidden when Written Analysis is switched off.
 */
export function canOfferWrittenAnalysis(input: {
  eligibility: AiEligibilityView | null;
  privacy: PrivacyState;
  featureDisabled: boolean;
}): boolean {
  if (input.featureDisabled) return false;
  if (input.eligibility) return input.eligibility.aiAllowed === true;
  return input.privacy.ageStatus === 'adult' && input.privacy.aiConsent === true;
}
