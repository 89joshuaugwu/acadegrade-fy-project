import type { CourseInput, Grade } from '@/types/course';

/**
 * Calculator → account handoff.
 *
 * The public calculator keeps what a visitor entered when they choose
 * "Save to profile", so the rows survive /register or /login in the same tab.
 * After sign-in the student results area reads it, offers
 * `handoffOfferLabel(n)` as pending rows, and calls `clearCalculatorHandoff()`
 * once the rows are added or dismissed. Storage is sessionStorage only: it never
 * leaves this browser tab and every access is guarded.
 */

export const CALCULATOR_HANDOFF_KEY = 'acadegrade:calculator-handoff:v1';
export const CALCULATOR_HANDOFF_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export type HandoffMode = 'grade' | 'score';

export interface HandoffCourse {
  code: string;
  units: number;
  grade?: Grade;
  score?: number;
}

export interface CalculatorHandoff {
  version: 1;
  mode: HandoffMode;
  savedAt: number;
  courses: HandoffCourse[];
}

const GRADES: readonly Grade[] = ['A', 'B', 'C', 'D', 'E', 'F'];

function storage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

function cleanCourse(value: unknown, mode: HandoffMode): HandoffCourse | null {
  if (!value || typeof value !== 'object') return null;
  const source = value as Record<string, unknown>;
  const units = Number(source.units);
  if (!Number.isInteger(units) || units < 1 || units > 12) return null;
  const code = typeof source.code === 'string' ? source.code.trim().toUpperCase().slice(0, 24) : '';

  if (mode === 'grade') {
    const grade = source.grade;
    if (typeof grade !== 'string' || !GRADES.includes(grade as Grade)) return null;
    return { code, units, grade: grade as Grade };
  }
  const score = Number(source.score);
  if (source.score === undefined || source.score === null || !Number.isFinite(score) || score < 0 || score > 100) return null;
  return { code, units, score };
}

function cleanCourses(values: unknown, mode: HandoffMode): HandoffCourse[] | null {
  if (!Array.isArray(values)) return null;
  const courses: HandoffCourse[] = [];
  for (const value of values.slice(0, 40)) {
    const course = cleanCourse(value, mode);
    if (!course) return null;
    courses.push(course);
  }
  return courses;
}

/** Saves the usable rows. Returns false when nothing usable was saved. */
export function saveCalculatorHandoff(
  input: { mode: HandoffMode; courses: readonly HandoffCourse[] },
  now: number = Date.now()
): boolean {
  const usable = input.courses
    .map((course) => cleanCourse(course, input.mode))
    .filter((course): course is HandoffCourse => course !== null);
  const store = storage();
  if (!store || usable.length === 0) return false;
  const handoff: CalculatorHandoff = { version: 1, mode: input.mode, savedAt: now, courses: usable };
  try {
    store.setItem(CALCULATOR_HANDOFF_KEY, JSON.stringify(handoff));
    return true;
  } catch {
    return false;
  }
}

/** The saved rows, or null when none, expired, or unreadable. */
export function readCalculatorHandoff(now: number = Date.now()): CalculatorHandoff | null {
  const store = storage();
  if (!store) return null;
  try {
    const raw = store.getItem(CALCULATOR_HANDOFF_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CalculatorHandoff>;
    const mode = parsed.mode === 'grade' || parsed.mode === 'score' ? parsed.mode : null;
    const savedAt = typeof parsed.savedAt === 'number' ? parsed.savedAt : NaN;
    const courses = mode ? cleanCourses(parsed.courses, mode) : null;
    if (parsed.version !== 1 || !mode || !courses?.length || !Number.isFinite(savedAt) || now - savedAt > CALCULATOR_HANDOFF_MAX_AGE_MS) {
      clearCalculatorHandoff();
      return null;
    }
    return { version: 1, mode, savedAt, courses };
  } catch {
    clearCalculatorHandoff();
    return null;
  }
}

export function clearCalculatorHandoff(): void {
  try {
    storage()?.removeItem(CALCULATOR_HANDOFF_KEY);
  } catch {
    // Nothing to clear when storage is unavailable.
  }
}

/**
 * Pending course rows for the first semester. Score rows are split into CA and
 * exam exactly as the public calculator scores them (30% / 70%), so the
 * semester GPA the student sees after adding them matches the calculator.
 */
export function handoffToCourseInputs(handoff: CalculatorHandoff): CourseInput[] {
  return handoff.courses.map((course) => (
    handoff.mode === 'grade'
      ? { code: course.code, title: '', units: course.units, grade: course.grade, caScore: null, examScore: null }
      : {
          code: course.code,
          title: '',
          units: course.units,
          caScore: Math.min(30, (course.score ?? 0) * 0.3),
          examScore: Math.max(0, (course.score ?? 0) * 0.7),
        }
  ));
}

export function handoffOfferLabel(count: number): string {
  return count === 1 ? 'Add this course as my first semester' : `Add these ${count} courses as my first semester`;
}
