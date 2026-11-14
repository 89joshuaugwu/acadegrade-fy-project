import { beforeEach, describe, expect, it, vi } from 'vitest';
import { queryTestDb } from './query-test-db';
import { CGPA_BUCKET_KEYS, bucketKeyFor, computeAdminMetrics, isoWeekKey } from '@/lib/admin/metrics';
import { createCreatedAtBackfillJob, metricsJob } from '@/lib/cron/metrics';
import { DEGREE_CLASS_BANDS } from '@/lib/cgpa/academicRules';

describe('CGPA buckets', () => {
  it('has ten half-point buckets from 0.0-0.5 to 4.5-5.0', () => {
    expect(CGPA_BUCKET_KEYS).toHaveLength(10);
    expect(CGPA_BUCKET_KEYS[0]).toBe('0.0-0.5');
    expect(CGPA_BUCKET_KEYS[9]).toBe('4.5-5.0');
  });

  it('bucketKeyFor puts each class minimum in an existing bucket', () => {
    for (const band of DEGREE_CLASS_BANDS) {
      expect(CGPA_BUCKET_KEYS).toContain(bucketKeyFor(band.minCGPA));
    }
    expect(bucketKeyFor(2.4)).toBe('2.0-2.5');
    expect(bucketKeyFor(4.5)).toBe('4.5-5.0');
    expect(bucketKeyFor(3.5)).toBe('3.5-4.0');
  });

  it('clamps out-of-range and invalid values', () => {
    expect(bucketKeyFor(5)).toBe('4.5-5.0');
    expect(bucketKeyFor(7)).toBe('4.5-5.0');
    expect(bucketKeyFor(-1)).toBe('0.0-0.5');
    expect(bucketKeyFor(Number.NaN)).toBe('0.0-0.5');
  });
});

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 10, 14, 12, 0, 0); // Saturday 14 Nov 2026
const ago = (days: number) => new Date(NOW - days * DAY);
let store: ReturnType<typeof queryTestDb>;

function seed() {
  store.docs.set('users/u1', { email: 'one@test.example', department: 'CSC', createdAt: ago(2), lastActiveAt: ago(1) });
  store.docs.set('users/u1/semesters/s1', { gpa: 4.6, pi: 4.6, creditLoaded: 20, isComplete: true });
  store.docs.set('analytics/u1', { lastInsight: { text: 'x' } });

  store.docs.set('users/u2', { email: 'two@test.example', department: 'MTH', createdAt: ago(40), lastActiveAt: ago(3) });
  store.docs.set('users/u2/semesters/s1', { gpa: 4, pi: 4, creditLoaded: 20, isComplete: true });
  store.docs.set('users/u2/semesters/s2', { gpa: 3.2, pi: 3.2, creditLoaded: 20, isComplete: false });

  // Never active (no lastActiveAt): must not count as active, and is not "inactive" either.
  store.docs.set('users/u3', { email: 'three@test.example', department: 'CSC', createdAt: ago(10) });
  store.docs.set('analytics/u3', { forecast: { cgpa: 3 } });

  // An old account without createdAt.
  store.docs.set('users/u4', { email: 'four@test.example', lastActiveAt: ago(10) });
  store.docs.set('users/u4/semesters/s1', { gpa: 0.5, pi: 0.5, creditLoaded: 18, isComplete: true });
}

beforeEach(() => {
  store = queryTestDb();
});

describe('computeAdminMetrics', () => {
  it('totals, active, classes, funnel', async () => {
    seed();
    const metrics = await computeAdminMetrics(store.db, NOW);

    expect(metrics.generatedAt).toBe(new Date(NOW).toISOString());
    expect(metrics.totalUsers).toBe(4);
    expect(metrics.activeThisWeek).toBe(2);
    expect(metrics.newUsers7d).toBe(1);
    // Every semester with graded credits counts (u2 = 3.6): (4.6 + 3.6 + 0.5) / 3.
    expect(metrics.avgCGPA).toBeCloseTo((4.6 + 3.6 + 0.5) / 3, 6);
    expect(metrics.degreeClassCounts).toEqual({
      'First Class': 1, 'Second Class Upper': 1, 'Second Class Lower': 0, 'Third Class': 0, Pass: 0, Fail: 1,
    });
    expect(metrics.cgpaBuckets['4.5-5.0']).toBe(1);
    expect(metrics.cgpaBuckets['3.5-4.0']).toBe(1);
    expect(metrics.departmentBreakdown[0]).toMatchObject({ department: 'CSC', count: 2 });
    expect(metrics.signupChartData).toHaveLength(30);
    expect(metrics.signupChartData.at(-1)).toMatchObject({ date: '2026-11-14' });
    expect(metrics.signupChartData.find((day) => day.date === '2026-11-12')?.count).toBe(1);

    expect(isoWeekKey(new Date(NOW))).toBe('2026-W46');
    expect(metrics.funnel).toHaveLength(8);
    expect(metrics.funnel.at(-1)).toEqual({ week: '2026-W46', registered: 1, firstSemester: 1, usedAi: 1, returned7d: 0, returned30d: 0 });
    expect(metrics.funnel.find((row) => row.week === isoWeekKey(ago(40)))).toEqual({
      week: isoWeekKey(ago(40)), registered: 1, firstSemester: 1, usedAi: 0, returned7d: 1, returned30d: 1,
    });
    expect(metrics.funnel.find((row) => row.week === isoWeekKey(ago(10)))).toMatchObject({ registered: 1, firstSemester: 0, usedAi: 1 });

    // No per-user data ever goes into metrics.
    const text = JSON.stringify(metrics);
    for (const secret of ['u1', 'one@test.example', 'u4']) expect(text).not.toContain(secret);
  });

  it('handles an empty project', async () => {
    const metrics = await computeAdminMetrics(store.db, NOW);
    expect(metrics).toMatchObject({ totalUsers: 0, activeThisWeek: 0, newUsers7d: 0, avgCGPA: 0, avgPI: 0 });
    expect(metrics.funnel.every((row) => row.registered === 0)).toBe(true);
  });

  it('metricsJob writes latest and the dated copy', async () => {
    seed();
    const result = await metricsJob.run({ db: store.db, now: NOW, deadline: NOW + 60_000 });
    expect(result.written).toBe(2);
    expect(store.docs.get('admin_metrics/latest')).toMatchObject({ totalUsers: 4, generatedAt: new Date(NOW).toISOString() });
    expect(store.docs.get('admin_metrics/2026-11-14')).toMatchObject({ totalUsers: 4 });
  });
});

describe('createdAtBackfillJob', () => {
  it('users without createdAt are backfilled', async () => {
    seed();
    const lookup = vi.fn(async (uid: string) => (uid === 'u4' ? 'Tue, 01 Sep 2026 00:00:00 GMT' : null));
    const job = createCreatedAtBackfillJob({ getCreationTime: lookup });
    const result = await job.run({ db: store.db, now: NOW, deadline: Date.now() + 60_000 });

    expect(result.written).toBe(1);
    expect((store.docs.get('users/u4').createdAt as Date).toISOString()).toBe('2026-09-01T00:00:00.000Z');
    // Accounts that already have createdAt are never looked up or rewritten.
    expect(lookup).toHaveBeenCalledTimes(1);
    expect(store.docs.get('users/u1').createdAt).toEqual(ago(2));
    expect(store.docs.get('_cron_state/createdAt')).toMatchObject({ completedOnce: true });

    // Once backfilled, the account appears in the createdAt-ordered admin list.
    const ordered = await store.db.collection('users').orderBy('createdAt', 'desc').get();
    expect(ordered.docs.map((doc: { id: string }) => doc.id)).toContain('u4');
  });

  it('writes at most the daily limit and resumes from the cursor', async () => {
    for (let i = 0; i < 12; i += 1) store.docs.set(`users/x${String(i).padStart(2, '0')}`, { email: `${i}@t` });
    const lookup = vi.fn(async () => '2026-01-01T00:00:00Z');
    const job = createCreatedAtBackfillJob({ getCreationTime: lookup, pageSize: 4, maxPages: 5, maxWrites: 5 });

    const first = await job.run({ db: store.db, now: NOW, deadline: Date.now() + 60_000 });
    expect(first.written).toBe(5);
    expect(first.truncated).toBe(true);
    expect(store.docs.get('_cron_state/createdAt').cursor).toBe('x04');

    await job.run({ db: store.db, now: NOW, deadline: Date.now() + 60_000 });
    const third = await job.run({ db: store.db, now: NOW, deadline: Date.now() + 60_000 });
    expect(third.written).toBe(2);
    expect([...store.docs.entries()].filter(([key, value]) => /^users\/x\d+$/.test(key) && !value.createdAt)).toHaveLength(0);
    expect(store.docs.get('_cron_state/createdAt')).toMatchObject({ cursor: null, completedOnce: true });
  });

  it('a missing auth record is skipped, not fatal', async () => {
    store.docs.set('users/gone', { email: 'gone@t' });
    const job = createCreatedAtBackfillJob({ getCreationTime: async () => { throw new Error('auth/user-not-found'); } });
    const result = await job.run({ db: store.db, now: NOW, deadline: Date.now() + 60_000 });
    expect(result.written).toBe(0);
    expect(store.docs.get('users/gone').createdAt).toBeUndefined();
  });
});
