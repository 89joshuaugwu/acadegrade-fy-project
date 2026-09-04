export const COURSE_DURATION_OPTIONS = [3, 4, 5, 6, 8, 10] as const;
export const MIN_COURSE_DURATION = 1;
export const MAX_COURSE_DURATION = 10;

export interface AcademicSlot {
  key: string;
  yearNumber: number;
  level: number;
  semester: 1 | 2;
  session: string;
  label: string;
}

export function parseAcademicSession(session?: string | null): number | null {
  if (!session || !/^\d{4}\/\d{4}$/.test(session.trim())) return null;
  const [first, second] = session.trim().split('/').map(Number);
  if (!Number.isFinite(first) || second !== first + 1) return null;
  return first;
}

export function formatAcademicSession(startYear: number): string {
  return `${startYear}/${startYear + 1}`;
}

export function graduationSession(entrySession: string, duration: number): string {
  const start = parseAcademicSession(entrySession);
  if (start == null) return '';
  return formatAcademicSession(start + normalizeDuration(duration) - 1);
}

export function normalizeDuration(duration?: number | null): number {
  const parsed = Math.round(Number(duration) || 4);
  return Math.max(MIN_COURSE_DURATION, Math.min(MAX_COURSE_DURATION, parsed));
}

export function buildAcademicSlots(
  entrySession: string,
  duration: number
): AcademicSlot[] {
  const start = parseAcademicSession(entrySession);
  if (start == null) return [];

  return Array.from({ length: normalizeDuration(duration) }, (_, yearIndex) => {
    const level = (yearIndex + 1) * 100;
    const session = formatAcademicSession(start + yearIndex);
    return ([1, 2] as const).map((semester) => ({
      key: `${level}:${semester}`,
      yearNumber: yearIndex + 1,
      level,
      semester,
      session,
      label: `${level}L ${semester === 1 ? 'First' : 'Second'} Semester`,
    }));
  }).flat();
}

/** Nigerian academic sessions roll over in September, not January. */
export function inferCurrentLevel(
  entrySession: string,
  duration: number,
  now = new Date()
): number {
  const start = parseAcademicSession(entrySession);
  if (start == null) return 100;
  const academicStartYear = now.getMonth() >= 8
    ? now.getFullYear()
    : now.getFullYear() - 1;
  const yearNumber = Math.max(
    1,
    Math.min(normalizeDuration(duration), academicStartYear - start + 1)
  );
  return yearNumber * 100;
}

