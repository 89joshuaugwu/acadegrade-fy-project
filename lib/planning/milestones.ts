/**
 * C1: positive academic milestones, stored as users/{uid}.milestones { [id]: Timestamp }.
 * Pure detection plus the write plan. There are no negative or comparative
 * milestones. Awaiting-result and pending rows never count.
 *
 * Same logic as acadegrade-mobile/lib/academic/milestones.ts.
 */

import {
  DEGREE_CLASS_BANDS,
  isCarryOver,
  outstandingCarryOvers,
  resolveDegreeClass,
  roundCgpa,
  type CarryOverCourse,
  type GradingScale,
} from '@/lib/cgpa/academicRules';
import { buildAcademicSeries } from '@/lib/planning/academicSeries';

export interface MilestoneSemester {
  id: string;
  gpa: number;
  pi: number;
  /** Graded credits; already excludes awaiting-result and pending rows. */
  creditLoaded: number;
  isComplete?: boolean;
  level?: number;
  semester?: number;
  courses?: readonly CarryOverCourse<string>[];
}

export interface MilestoneInput {
  /** Chronological order. */
  semesters: readonly MilestoneSemester[];
  /** plan.isGraduated from lib/academic/timeline. */
  isGraduated: boolean;
  /** The student's scale; the 5-point scale when left out. */
  scale?: GradingScale;
}

/** Firestore field-path safe: only letters, digits and underscores. */
export function sanitiseMilestoneId(id: string): string {
  return id.replace(/[^A-Za-z0-9_]/g, '_');
}

const credits = (semester: MilestoneSemester) => Number(semester.creditLoaded) || 0;

export function detectMilestones(input: MilestoneInput): string[] {
  const ids: string[] = [];
  const completedGraded = input.semesters.filter((semester) => semester.isComplete === true && credits(semester) > 0);

  if (completedGraded.length > 0) ids.push('first_semester');
  if (input.isGraduated) ids.push('programme_complete');

  const scale = input.scale;
  const failed = (course: CarryOverCourse<string>) => (scale ? isCarryOver(course, scale) : isCarryOver(course as CarryOverCourse));
  const everFailed = input.semesters.some((semester) => (semester.courses ?? []).some(failed));
  if (everFailed && outstandingCarryOvers(input.semesters.map((semester) => ({ courses: semester.courses ?? [] })), scale).length === 0) {
    ids.push('carry_overs_cleared');
  }

  if (completedGraded.length >= 2) {
    const newest = completedGraded[completedGraded.length - 1];
    const best = roundCgpa(newest.gpa);
    if (completedGraded.slice(0, -1).every((earlier) => best > roundCgpa(earlier.gpa))) {
      ids.push(`personal_best_${newest.id}`);
    }
  }

  const { cgpaHistory } = buildAcademicSeries(input.semesters.map((semester) => ({
    level: semester.level ?? 0,
    semester: semester.semester ?? 0,
    gpa: semester.gpa,
    pi: semester.pi,
    creditLoaded: semester.creditLoaded,
  })));
  if (cgpaHistory.length >= 2) {
    if (scale) {
      const before = resolveDegreeClass(cgpaHistory[cgpaHistory.length - 2], scale);
      const after = resolveDegreeClass(cgpaHistory[cgpaHistory.length - 1], scale);
      if (after.minCgpa > before.minCgpa) ids.push(`class_up_${after.shortLabel}`);
    } else {
      const before = resolveDegreeClass(cgpaHistory[cgpaHistory.length - 2]);
      const after = resolveDegreeClass(cgpaHistory[cgpaHistory.length - 1]);
      // Bands are highest first, so a smaller index is a higher class.
      if (DEGREE_CLASS_BANDS.indexOf(after) < DEGREE_CLASS_BANDS.indexOf(before)) ids.push(`class_up_${after.shortLabel}`);
    }
  }

  return [...new Set(ids.map(sanitiseMilestoneId))];
}

/**
 * Which milestones to celebrate and which to record. When the field was never
 * written (`stored` undefined, an older account), everything currently true is
 * recorded and nothing is celebrated, so existing students don't get a burst.
 */
export function planMilestoneWrites(
  detected: readonly string[],
  stored: Record<string, unknown> | undefined,
): { celebrate: string[]; record: string[] } {
  if (stored === undefined || stored === null || typeof stored !== 'object') {
    return { celebrate: [], record: [...detected] };
  }
  const fresh = detected.filter((id) => !Object.prototype.hasOwnProperty.call(stored, id));
  return { celebrate: fresh, record: fresh };
}

/**
 * The users/{uid} update for a plan: dot-path merges so other milestones (and
 * other clients' writes) are never replaced. A never-written field with
 * nothing reached yet gets an empty map, so later milestones are celebrated.
 * Null when there is nothing to write.
 */
export function milestoneUpdate(
  record: readonly string[],
  stored: Record<string, unknown> | undefined,
  at: unknown,
): Record<string, unknown> | null {
  if (record.length === 0) return stored === undefined || stored === null ? { milestones: {} } : null;
  return Object.fromEntries(record.map((id) => [`milestones.${sanitiseMilestoneId(id)}`, at]));
}

export interface MilestoneCopy {
  title: string;
  body: string;
  /** Degree class named by a class_up milestone (hidden in discreet mode). */
  className?: string;
}

/** Display copy for a milestone id. */
export function describeMilestone(id: string, scale?: GradingScale): MilestoneCopy {
  if (id === 'first_semester') return { title: 'First semester recorded', body: 'Your first completed semester is in your record.' };
  if (id === 'programme_complete') return { title: 'Programme complete', body: 'Every semester of your programme is marked complete.' };
  if (id === 'carry_overs_cleared') return { title: 'Carry-overs cleared', body: 'You have passed every course you previously failed.' };
  if (id.startsWith('personal_best_')) return { title: 'Personal best semester', body: 'Your newest semester GPA is your highest yet.' };
  if (id.startsWith('class_up_')) {
    const suffix = id.slice('class_up_'.length);
    const onScale = scale?.classes.find((item) => sanitiseMilestoneId(item.shortLabel) === suffix);
    const band = DEGREE_CLASS_BANDS.find((item) => sanitiseMilestoneId(item.shortLabel) === suffix);
    return { title: 'Class moved up', body: 'Your CGPA has moved up to', className: onScale?.name ?? band?.label ?? 'a higher class' };
  }
  return { title: 'New milestone', body: 'You reached a new milestone.' };
}
