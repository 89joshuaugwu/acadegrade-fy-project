/**
 * Keeps direct identifiers out of text sent to AI providers.
 * Prompts carry grades and course data only, never the student's name,
 * email or matric number.
 */

const IDENTITY_KEY = /^(full_?name|name|student_?name|first_?name|last_?name|surname|display_?name|email|e_?mail|matric\w*|reg(istration)?_?(no|number)|uid|user_?id|author_?id|avatar\w*|photo\w*|phone\w*|fcm_?tokens?)$/i;

/** Deep copy without identity keys. Non-plain values (dates, numbers) pass through. */
export function scrubIdentityFields<T>(value: T, depth = 0): T {
  if (depth > 8) return value;
  if (Array.isArray(value)) return value.map((item) => scrubIdentityFields(item, depth + 1)) as T;
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !IDENTITY_KEY.test(key))
      .map(([key, item]) => [key, scrubIdentityFields(item, depth + 1)])) as T;
  }
  return value;
}

const IDENTITY_LINE = /^\s*(student'?s?\s+)?(full\s+|first\s+|last\s+|sur)?(name|matric(ulation)?(\s*(no\.?|number))?|reg(istration)?\.?\s*(no\.?|number)|e-?mail(\s+address)?)\s*[:\-–]/i;
const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

/** Drops labelled identity lines ("Name: …", "Matric No: …", "Reg. Number - …") and masks emails. */
export function redactIdentityLines(text: string): string {
  return text
    .split(/\r?\n/)
    .filter((line) => !IDENTITY_LINE.test(line))
    .join('\n')
    .replace(EMAIL, '[email]');
}
