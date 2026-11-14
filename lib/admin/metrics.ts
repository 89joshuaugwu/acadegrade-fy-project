import type { Firestore } from 'firebase-admin/firestore';
import { computeCumulativeCGPA, resolveDegreeClass, type DegreeClassShortLabel } from '@/lib/cgpa/academicRules';

// This module is imported by the admin analytics page (client) for the bucket
// helpers, so it must stay free of server-only imports: the Firestore handle
// is passed in, and only its type is imported.

/** Half-point CGPA histogram buckets used by the admin stats and analytics pages. */
export const CGPA_BUCKET_COUNT = 10;

const bucketLabel = (index: number) => `${(index * 0.5).toFixed(1)}-${((index + 1) * 0.5).toFixed(1)}`;

export const CGPA_BUCKET_KEYS: readonly string[] = Array.from({ length: CGPA_BUCKET_COUNT }, (_, index) => bucketLabel(index));

/** The bucket a CGPA falls in. Out-of-range or invalid values are clamped. */
export function bucketKeyFor(cgpa: number): string {
  const value = Number.isFinite(cgpa) ? cgpa : 0;
  const index = Math.min(Math.max(Math.floor(value / 0.5), 0), CGPA_BUCKET_COUNT - 1);
  return bucketLabel(index);
}

/** Response keys for degreeClassCounts (kept stable for the admin analytics page). */
export const DEGREE_CLASS_COUNT_KEYS: Record<DegreeClassShortLabel, string> = {
  '1st': 'First Class',
  '2:1': 'Second Class Upper',
  '2:2': 'Second Class Lower',
  '3rd': 'Third Class',
  Pass: 'Pass',
  Fail: 'Fail',
};

export interface FunnelRow {
  /** ISO week of sign-up, `YYYY-Www`. */
  week: string;
  registered: number;
  /** Signed up that week and has at least one semester. */
  firstSemester: number;
  /** `analytics/{uid}` has an AI insight or forecast. */
  usedAi: number;
  /** Last seen at least 7 / 30 days after signing up. */
  returned7d: number;
  returned30d: number;
}

export interface AdminMetrics {
  /** ISO time the numbers were computed. */
  generatedAt: string;
  totalUsers: number;
  activeThisWeek: number;
  newUsers7d: number;
  avgCGPA: number;
  avgPI: number;
  cgpaBuckets: Record<string, number>;
  degreeClassCounts: Record<string, number>;
  departmentBreakdown: { department: string; count: number; avgCGPA: number }[];
  signupChartData: { date: string; label: string; count: number }[];
  funnel: FunnelRow[];
}

const DAY_MS = 24 * 60 * 60 * 1000;
export const FUNNEL_WEEKS = 8;
const SIGNUP_DAYS = 30;

/** Milliseconds from a Firestore Timestamp, Date, number or ISO string; null when absent or invalid. */
export function toMillis(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.getTime() : null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  const stamp = value as { toMillis?: () => number; toDate?: () => Date };
  if (typeof stamp.toMillis === 'function') return stamp.toMillis();
  if (typeof stamp.toDate === 'function') return stamp.toDate().getTime();
  return null;
}

/** ISO-8601 week key in UTC, for example `2026-W46`. */
export function isoWeekKey(date: Date): string {
  const day = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const weekday = day.getUTCDay() || 7; // Monday 1 .. Sunday 7
  day.setUTCDate(day.getUTCDate() + 4 - weekday); // the Thursday of this week decides the year
  const yearStart = Date.UTC(day.getUTCFullYear(), 0, 1);
  const week = Math.floor((day.getTime() - yearStart) / DAY_MS / 7) + 1;
  return `${day.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

async function countOf(query: { count(): { get(): Promise<{ data(): { count: number } }> } }): Promise<number> {
  return (await query.count().get()).data().count;
}

/**
 * Platform metrics for the admin Overview and Academic analytics pages, written
 * once a day by the cron `metricsJob` to `admin_metrics/latest`.
 *
 * Cost: about users × (2 + semesters) reads per run (profile, analytics doc and
 * each semester). Above roughly 3,000 users, switch to incremental per-user
 * summaries maintained on semester save instead of this full pass.
 *
 * Only aggregates leave this function: never a uid, email or a single student's grades.
 */
export async function computeAdminMetrics(db: Firestore, now: number = Date.now()): Promise<AdminMetrics> {
  const users = db.collection('users');
  const weekAgo = new Date(now - 7 * DAY_MS);
  const [totalUsers, activeThisWeek, newUsers7d] = await Promise.all([
    countOf(users),
    countOf(users.where('lastActiveAt', '>=', weekAgo)),
    countOf(users.where('createdAt', '>=', weekAgo)),
  ]);

  const cgpaBuckets: Record<string, number> = Object.fromEntries(CGPA_BUCKET_KEYS.map((key) => [key, 0]));
  const degreeClassCounts: Record<string, number> = Object.fromEntries(Object.values(DEGREE_CLASS_COUNT_KEYS).map((key) => [key, 0]));
  const departments = new Map<string, { count: number; withCgpa: number; totalCgpa: number }>();
  const signupsByDay = new Map<string, number>();

  const funnelWeeks: string[] = [];
  for (let i = FUNNEL_WEEKS - 1; i >= 0; i -= 1) funnelWeeks.push(isoWeekKey(new Date(now - i * 7 * DAY_MS)));
  const funnel = new Map<string, FunnelRow>(funnelWeeks.map((week) => [week, {
    week, registered: 0, firstSemester: 0, usedAi: 0, returned7d: 0, returned30d: 0,
  }]));

  let totalCgpa = 0;
  let totalPi = 0;
  let withCgpa = 0;

  const snapshot = await users.get();
  for (const doc of snapshot.docs) {
    const data = doc.data() ?? {};
    const department = typeof data.department === 'string' && data.department.trim() ? data.department : 'Unknown';
    const dept = departments.get(department) ?? { count: 0, withCgpa: 0, totalCgpa: 0 };
    dept.count += 1;
    departments.set(department, dept);

    const semesters = await users.doc(doc.id).collection('semesters').get();
    // Student rule: every graded course counts, whether or not its semester is complete.
    const { cgpa, pi, totalCredits } = computeCumulativeCGPA(
      semesters.docs.map((semester) => semester.data() as { gpa: number; pi: number; creditLoaded: number }),
    );
    if (totalCredits > 0) {
      totalCgpa += cgpa;
      totalPi += pi;
      withCgpa += 1;
      dept.totalCgpa += cgpa;
      dept.withCgpa += 1;
      cgpaBuckets[bucketKeyFor(cgpa)] += 1;
      degreeClassCounts[DEGREE_CLASS_COUNT_KEYS[resolveDegreeClass(cgpa).shortLabel]] += 1;
    }

    const createdAt = toMillis(data.createdAt);
    if (createdAt === null) continue; // old accounts: backfilled by the createdAt cron job
    const dayKey = new Date(createdAt).toISOString().slice(0, 10);
    signupsByDay.set(dayKey, (signupsByDay.get(dayKey) ?? 0) + 1);

    const row = funnel.get(isoWeekKey(new Date(createdAt)));
    if (!row) continue;
    row.registered += 1;
    if (!semesters.empty) row.firstSemester += 1;
    const analytics = (await db.collection('analytics').doc(doc.id).get()).data();
    if (analytics?.lastInsight || analytics?.forecast) row.usedAi += 1;
    const lastActive = toMillis(data.lastActiveAt);
    if (lastActive !== null && lastActive - createdAt >= 7 * DAY_MS) row.returned7d += 1;
    if (lastActive !== null && lastActive - createdAt >= 30 * DAY_MS) row.returned30d += 1;
  }

  const signupChartData: AdminMetrics['signupChartData'] = [];
  for (let i = SIGNUP_DAYS - 1; i >= 0; i -= 1) {
    const day = new Date(now - i * DAY_MS);
    const date = day.toISOString().slice(0, 10);
    signupChartData.push({
      date,
      label: day.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }),
      count: signupsByDay.get(date) ?? 0,
    });
  }

  return {
    generatedAt: new Date(now).toISOString(),
    totalUsers,
    activeThisWeek,
    newUsers7d,
    avgCGPA: withCgpa > 0 ? totalCgpa / withCgpa : 0,
    avgPI: withCgpa > 0 ? totalPi / withCgpa : 0,
    cgpaBuckets,
    degreeClassCounts,
    departmentBreakdown: [...departments.entries()]
      .map(([department, value]) => ({
        department,
        count: value.count,
        avgCGPA: value.withCgpa > 0 ? value.totalCgpa / value.withCgpa : 0,
      }))
      .sort((a, b) => b.count - a.count),
    signupChartData,
    funnel: funnelWeeks.map((week) => funnel.get(week)!),
  };
}
