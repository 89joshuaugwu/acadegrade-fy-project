/**
 * Wording and small formatters for the public shared-record page and its PDF.
 * A shared record is self-reported by the student, so nothing here may name or imply an issuing university.
 */
export const UNOFFICIAL_RECORD_HEADING = 'Unofficial academic record';
export const SELF_REPORTED_NOTICE = 'Self-reported by the student. Not issued or verified by any university.';
export const UNSPECIFIED_UNIVERSITY = 'University not specified';
export const MADE_WITH_LINE = 'Made with AcadeGrade';
export const NOT_OFFICIAL_LINE = 'Not an official university document';
export const SUMMARY_ONLY_LEAD = 'Summary only:';
export const SUMMARY_ONLY_REST = 'the student chose not to share course-by-course results.';
/** The course column headed "Points" holds units × grade point (it was wrongly headed "PI"). */
export const POINTS_CAPTION = 'Points = units × grade point.';

export interface UniversitySource {
  university?: unknown;
  institution?: unknown;
}

/** The university the student entered on their profile, as plain text, or a neutral fallback. */
export function resolveUniversityName(source: UniversitySource | null | undefined): string {
  for (const value of [source?.university, source?.institution]) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return UNSPECIFIED_UNIVERSITY;
}

/** "30 November 2026", or null for a missing or unreadable date. */
export function formatExpiryDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return null;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** "This link works until 30 November 2026". */
export function expiryLine(expiry: string): string {
  return `This link works until ${expiry}`;
}

/** Units × grade point for one course (missing values count as 0, as before). */
export function coursePoints(course: { units?: number | null; gradePoint?: number | null }): number {
  return (Number(course.units) || 0) * (Number(course.gradePoint) || 0);
}

export function totalPoints(courses: readonly { units?: number | null; gradePoint?: number | null }[] | null | undefined): number {
  return (courses ?? []).reduce((sum, course) => sum + coursePoints(course), 0);
}

/** F grades are the only red on the paper. */
export function isFailGrade(grade: unknown): boolean {
  return typeof grade === 'string' && grade.trim().toUpperCase() === 'F';
}

export function plural(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** A semester's unit count: the server's creditLoaded, or the course units when it is missing. */
export function semesterUnits(semester: { creditLoaded?: number | null; courses?: readonly { units?: number | null }[] | null }): number {
  const loaded = Number(semester.creditLoaded);
  if (Number.isFinite(loaded)) return loaded;
  return (semester.courses ?? []).reduce((sum, course) => sum + (Number(course.units) || 0), 0);
}
