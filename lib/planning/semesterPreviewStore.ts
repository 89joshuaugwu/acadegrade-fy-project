/**
 * A3: expected grades for the semester preview live on this device only
 * (localStorage), never in Firestore. Cleared on sign-out with the drafts.
 */

const PREFIX = 'acadegrade:preview:v1:';
/** Any scale letter (1-3 characters); the preview checks it against the active scale. */
const isGradeLabel = (grade: string) => /^[A-Za-z0-9+\-]{1,3}$/.test(grade);

export const previewStorageKey = (uid: string, semesterId: string) => `${PREFIX}${uid}:${semesterId}`;

export function loadExpectedGrades(uid: string, semesterId: string): Record<string, string> {
  try {
    const raw = window.localStorage.getItem(previewStorageKey(uid, semesterId));
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const result: Record<string, string> = {};
    for (const [id, grade] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof grade === 'string' && isGradeLabel(grade)) result[id] = grade;
    }
    return result;
  } catch {
    return {};
  }
}

export function saveExpectedGrades(uid: string, semesterId: string, expected: Record<string, string>): void {
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
