/**
 * E1 "Download my data": a JSON export (profile, semesters, courses, cached
 * insights, notifications) and a courses CSV, built on the device from the
 * student's own records. No server work, nothing written anywhere.
 */

type Plain = null | boolean | number | string | Plain[] | { [key: string]: Plain };

export interface ExportSemester {
  id: string;
  label?: string;
  session?: string;
  level?: number;
  semester?: number;
  courses: Record<string, unknown>[];
  [key: string]: unknown;
}

export interface ExportInput {
  uid: string;
  profile: unknown;
  semesters: ExportSemester[];
  analytics: unknown;
  notifications: unknown[];
  exportedAt?: Date;
}

/** Device push tokens identify a browser, not the student; they are left out. */
const OMITTED_PROFILE_FIELDS = new Set(['fcmToken', 'fcmTokens']);

/** Firestore Timestamps and Dates become ISO strings; everything else is copied as plain JSON. */
export function toPlain(value: unknown): Plain {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
  if (Array.isArray(value)) return value.map(toPlain);
  if (typeof value === 'object') {
    const record = value as Record<string, unknown> & { toDate?: () => Date };
    if (typeof record.toDate === 'function') {
      try { return toPlain(record.toDate()); } catch { return null; }
    }
    const out: { [key: string]: Plain } = {};
    for (const [key, item] of Object.entries(record)) {
      if (typeof item === 'function' || item === undefined) continue;
      out[key] = toPlain(item);
    }
    return out;
  }
  return null;
}

const order = (semester: ExportSemester) => (Number(semester.level) || 0) * 10 + (Number(semester.semester) || 0);

export function sortSemesters<T extends ExportSemester>(semesters: T[]): T[] {
  return [...semesters].sort((a, b) => order(a) - order(b));
}

export function buildDataExport(input: ExportInput) {
  const profile = toPlain(input.profile);
  const cleanProfile = profile && typeof profile === 'object' && !Array.isArray(profile)
    ? Object.fromEntries(Object.entries(profile).filter(([key]) => !OMITTED_PROFILE_FIELDS.has(key)))
    : {};
  return {
    format: 'acadegrade-export' as const,
    version: 1 as const,
    exportedAt: (input.exportedAt ?? new Date()).toISOString(),
    uid: input.uid,
    note: 'Your AcadeGrade records as stored in your account. Unofficial: results are self-reported. Device push tokens are not included.',
    profile: cleanProfile,
    semesters: sortSemesters(input.semesters).map((semester) => toPlain(semester) as { [key: string]: Plain } & { id: string; courses: Plain[] }),
    insights: toPlain(input.analytics),
    notifications: input.notifications.map(toPlain) as Array<{ [key: string]: Plain }>,
  };
}

const CSV_HEADER = ['Level', 'Semester', 'Session', 'Semester label', 'Code', 'Title', 'Units', 'CA', 'Exam', 'Total', 'Grade', 'Grade point', 'Status'];

/** Quotes when needed, and defuses spreadsheet formulas (=, +, -, @ at the start). */
export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text) && !/^-?\d+(\.\d+)?$/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) || text !== text.trim() || text.startsWith("'") ? `"${text.replace(/"/g, '""')}"` : text;
}

export function coursesToCsv(semesters: ExportSemester[]): string {
  const rows = [CSV_HEADER];
  for (const semester of sortSemesters(semesters)) {
    for (const course of semester.courses) {
      const awaiting = course.isAR === true || course.pending === true;
      rows.push([
        semester.level, semester.semester, semester.session, semester.label,
        course.code, course.title, course.units,
        course.caScore, course.examScore,
        awaiting ? null : course.totalScore,
        awaiting ? null : course.grade,
        awaiting ? null : course.gradePoint,
        awaiting ? 'Awaiting result' : course.grade ? 'Graded' : 'No score',
      ].map(csvCell));
    }
  }
  return rows.map((row) => row.join(',')).join('\r\n') + '\r\n';
}

export function exportFileNames(date = new Date()) {
  const day = date.toISOString().slice(0, 10);
  return { json: `acadegrade-data-${day}.json`, csv: `acadegrade-courses-${day}.csv` };
}

export interface ExportReaders {
  queryCollection: <T>(path: string) => Promise<T[]>;
  getDocument: <T>(path: string) => Promise<T | null>;
}

/** Reads the student's own records with the client SDK (owner-only rules). Optional parts fail soft. */
export async function collectExportData(uid: string, profile: unknown, readers: ExportReaders) {
  const semesters = await readers.queryCollection<ExportSemester>(`users/${uid}/semesters`);
  const withCourses = await Promise.all(semesters.map(async (semester) => ({
    ...semester,
    courses: await readers.queryCollection<Record<string, unknown>>(`users/${uid}/semesters/${semester.id}/courses`),
  })));
  const [analytics, notifications] = await Promise.all([
    readers.getDocument<unknown>(`analytics/${uid}`).catch(() => null),
    readers.queryCollection<unknown>(`notifications/${uid}/items`).catch(() => [] as unknown[]),
  ]);
  return { uid, profile, semesters: withCourses, analytics, notifications };
}

/** Saves text as a file through a temporary link. Browser only. */
export function downloadText(fileName: string, text: string, type: string): void {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
