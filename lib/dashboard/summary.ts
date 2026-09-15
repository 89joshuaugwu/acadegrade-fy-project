import type { Grade } from '@/types/course';

interface TimestampLike {
  toMillis?: () => number;
  seconds?: number;
}

export interface DashboardCourseSource {
  id: string;
  code: string;
  title: string;
  units?: number;
  totalScore?: number | null;
  grade?: Grade | null;
  caScore?: number | null;
  examScore?: number | null;
  estimated?: boolean;
  updatedAt?: TimestampLike | Date | number | string | null;
  createdAt?: TimestampLike | Date | number | string | null;
}

export interface DashboardSemesterCourses {
  semesterId: string;
  semesterLabel: string;
  session: string;
  semesterIndex: number;
  courses: DashboardCourseSource[];
}

export interface DashboardCourseRecord extends DashboardCourseSource {
  semesterId: string;
  semesterLabel: string;
  session: string;
  semesterIndex: number;
}

function timestampValue(value: DashboardCourseSource['updatedAt']) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (value instanceof Date) return value.getTime();
  if (value && typeof value === 'object') {
    if (typeof value.toMillis === 'function') return value.toMillis();
    if (typeof value.seconds === 'number') return value.seconds * 1_000;
  }
  return 0;
}

function attentionState(course: DashboardCourseSource) {
  if (typeof course.totalScore === 'number') {
    return course.totalScore < 50 ? 'risk' : 'known';
  }
  if (course.grade) {
    return ['D', 'E', 'F'].includes(course.grade) ? 'risk' : 'known';
  }
  return 'unknown';
}

export function buildDashboardSummary(
  semesters: DashboardSemesterCourses[],
  recentLimit = 3
) {
  const records: DashboardCourseRecord[] = semesters.flatMap((semester) => (
    semester.courses.map((course) => ({
      ...course,
      semesterId: semester.semesterId,
      semesterLabel: semester.semesterLabel,
      session: semester.session,
      semesterIndex: semester.semesterIndex,
    }))
  ));

  const ordered = [...records].sort((a, b) => {
    const aTime = timestampValue(a.updatedAt) || timestampValue(a.createdAt);
    const bTime = timestampValue(b.updatedAt) || timestampValue(b.createdAt);
    if (aTime !== bTime) return bTime - aTime;
    if (a.semesterIndex !== b.semesterIndex) return b.semesterIndex - a.semesterIndex;
    const codeOrder = a.code.localeCompare(b.code, undefined, { numeric: true, sensitivity: 'base' });
    if (codeOrder !== 0) return codeOrder;
    return a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' });
  });

  let atRiskCount = 0;
  let unknownCount = 0;
  for (const course of records) {
    const state = attentionState(course);
    if (state === 'risk') atRiskCount += 1;
    if (state === 'unknown') unknownCount += 1;
  }

  return {
    totalCourses: records.length,
    atRiskCount,
    unknownCount,
    recent: ordered.slice(0, Math.max(0, recentLimit)),
  };
}
