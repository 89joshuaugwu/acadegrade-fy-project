import type { CourseInput } from '@/types/course';

/**
 * Unsaved semester entries kept on this device only (localStorage), per user
 * and semester. Never written to Firestore. Cleared on save, on discard and
 * on sign-out. Every call is safe when storage is blocked or full.
 */

const PREFIX = 'acadegrade:draft:v1:';
export const DRAFT_DEBOUNCE_MS = 800;

export interface SemesterDraft {
  savedAt: number;
  courses: CourseInput[];
}

export const draftKey = (uid: string, semesterId: string) => `${PREFIX}${uid}:${semesterId}`;

type DraftCourse = Pick<CourseInput, 'id' | 'code' | 'title' | 'units' | 'caScore' | 'examScore' | 'isAR' | 'grade'>;

const GRADES = new Set(['A', 'B', 'C', 'D', 'E', 'F']);

const scoreOrNull = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : null);

/** The fields a student edits, in a stable shape for storage and comparison. */
function draftFields(course: CourseInput): DraftCourse {
  return {
    ...(course.id ? { id: course.id } : {}),
    code: String(course.code ?? ''),
    title: String(course.title ?? ''),
    units: Number(course.units) || 0,
    caScore: scoreOrNull(course.caScore),
    examScore: scoreOrNull(course.examScore),
    ...(course.isAR ? { isAR: true } : {}),
    // A letter grade without scores (from the public calculator) is kept as a hint.
    ...(course.grade && GRADES.has(course.grade) && scoreOrNull(course.caScore) === null && scoreOrNull(course.examScore) === null ? { grade: course.grade } : {}),
  };
}

function isDraftCourse(value: unknown): value is CourseInput {
  if (!value || typeof value !== 'object') return false;
  const course = value as Record<string, unknown>;
  return typeof course.code === 'string' && typeof course.title === 'string' && typeof course.units === 'number';
}

export function saveDraft(uid: string, semesterId: string, courses: CourseInput[]): void {
  try {
    const draft: SemesterDraft = { savedAt: Date.now(), courses: courses.map(draftFields) };
    window.localStorage.setItem(draftKey(uid, semesterId), JSON.stringify(draft));
  } catch {
    // Storage blocked or full: drafts are a convenience only.
  }
}

export function loadDraft(uid: string, semesterId: string): SemesterDraft | null {
  try {
    const raw = window.localStorage.getItem(draftKey(uid, semesterId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SemesterDraft>;
    if (typeof parsed.savedAt !== 'number' || !Array.isArray(parsed.courses) || !parsed.courses.every(isDraftCourse)) return null;
    return { savedAt: parsed.savedAt, courses: parsed.courses.map(draftFields) };
  } catch {
    return null;
  }
}

export function clearDraft(uid: string, semesterId: string): void {
  try {
    window.localStorage.removeItem(draftKey(uid, semesterId));
  } catch {
    // Nothing to clear.
  }
}

/** Removes every draft that belongs to this user (sign-out). */
export function clearUserDrafts(uid: string): void {
  try {
    const prefix = `${PREFIX}${uid}:`;
    const keys: string[] = [];
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (key?.startsWith(prefix)) keys.push(key);
    }
    keys.forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // Nothing to clear.
  }
}

/** True when the draft holds edits that are not in the saved courses. */
export function draftDiffers(draft: CourseInput[], saved: CourseInput[]): boolean {
  return JSON.stringify(draft.map(draftFields)) !== JSON.stringify(saved.map(draftFields));
}
