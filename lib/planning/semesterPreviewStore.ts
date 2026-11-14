/**
 * A3: expected grades for the semester preview live on this device only
 * (localStorage), never in Firestore. Cleared on sign-out with the drafts.
 */

import type { AcademicGrade } from '@/lib/cgpa/academicRules';

const PREFIX = 'acadegrade:preview:v1:';
const GRADES = new Set<string>(['A', 'B', 'C', 'D', 'E', 'F']);

export const previewStorageKey = (uid: string, semesterId: string) => `${PREFIX}${uid}:${semesterId}`;

export function loadExpectedGrades(uid: string, semesterId: string): Record<string, AcademicGrade> {
  try {
    const raw = window.localStorage.getItem(previewStorageKey(uid, semesterId));
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const result: Record<string, AcademicGrade> = {};
    for (const [id, grade] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof grade === 'string' && GRADES.has(grade)) result[id] = grade as AcademicGrade;
    }
    return result;
  } catch {
    return {};
  }
}

export function saveExpectedGrades(uid: string, semesterId: string, expected: Record<string, AcademicGrade>): void {
  try {
    const key = previewStorageKey(uid, semesterId);
    if (Object.keys(expected).length === 0) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, JSON.stringify(expected));
  } catch {
    // Storage blocked (private mode): the preview still works for this page view.
  }
}

/** Removes every stored preview for a user on this device. */
export function clearUserPreviews(uid: string): void {
  try {
    const prefix = `${PREFIX}${uid}:`;
    const keys: string[] = [];
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (key?.startsWith(prefix)) keys.push(key);
    }
    keys.forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // Nothing to clear when storage is blocked.
  }
}
