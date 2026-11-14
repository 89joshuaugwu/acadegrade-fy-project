import { beforeEach, describe, expect, it, vi } from 'vitest';
import { queryTestDb } from './query-test-db';

const state = vi.hoisted(() => ({ db: null as any, requireAdmin: vi.fn(), audit: vi.fn() }));

vi.mock('@/lib/firebase/admin', () => ({ get adminDb() { return state.db; }, adminAuth: { verifyIdToken: vi.fn() } }));
vi.mock('@/lib/api/admin-audit', () => ({ writeAdminAudit: state.audit }));
vi.mock('@/lib/api/admin-auth', () => ({
  requireAdmin: state.requireAdmin,
  AdminAuthorizationError: class AdminAuthorizationError extends Error {
    constructor(public status: 401 | 403) { super(status === 401 ? 'Unauthorized' : 'Forbidden'); }
  },
}));

import { GET } from '@/app/api/admin/stats/route';
import { GET as usersGET } from '@/app/api/admin/users/route';
import { AdminAuthorizationError } from '@/lib/api/admin-auth';

const HOUR = 60 * 60 * 1000;
const ADMIN = { uid: 'admin-1', email: 'admin@test.example' };
let store: ReturnType<typeof queryTestDb>;

const stats = (query = '') => GET(new Request(`https://app.test/api/admin/stats${query}`, { headers: { Authorization: 'Bearer t' } }));
const users = (query = '') => usersGET(new Request(`https://app.test/api/admin/users${query}`, { headers: { Authorization: 'Bearer t' } }));

beforeEach(() => {
  store = queryTestDb();
  state.db = store.db;
  state.requireAdmin.mockReset().mockResolvedValue(ADMIN);
  state.audit.mockReset().mockResolvedValue(undefined);
});

describe('GET /api/admin/stats', () => {
  it('serves latest doc and marks stale', async () => {
    store.docs.set('users/u1', { createdAt: new Date() });
    const fresh = new Date(Date.now() - 2 * HOUR).toISOString();
    store.docs.set('admin_metrics/latest', {
      generatedAt: fresh, totalUsers: 42, activeThisWeek: 7, newUsers7d: 3, avgCGPA: 3.1, avgPI: 3,
      cgpaBuckets: {}, degreeClassCounts: {}, departmentBreakdown: [], signupChartData: [], funnel: [],
    });

    const response = await stats();
    expect(response.status).toBe(200);
    const body = await response.json();
    // Old fields are kept; the stored doc is served, not a live scan (only 1 user exists).
    expect(body).toMatchObject({ totalUsers: 42, activeThisWeek: 7, avgCGPA: 3.1, generatedAt: fresh, stale: false, funnel: [] });
    expect(store.writes).toHaveLength(0);

    store.docs.set('admin_metrics/latest', { ...store.docs.get('admin_metrics/latest'), generatedAt: new Date(Date.now() - 37 * HOUR).toISOString() });
    expect((await (await stats()).json()).stale).toBe(true);
  });

  it('computes and stores the numbers when no run has happened yet', async () => {
    store.docs.set('users/u1', { createdAt: new Date(), lastActiveAt: new Date() });
    const body = await (await stats()).json();
    expect(body).toMatchObject({ totalUsers: 1, activeThisWeek: 1, stale: false });
    expect(store.docs.get('admin_metrics/latest')).toMatchObject({ totalUsers: 1 });
    expect(state.audit).not.toHaveBeenCalled();
  });

  it('refresh recomputes, rate limits, audits', async () => {
    store.docs.set('admin_metrics/latest', { generatedAt: new Date(Date.now() - 30 * HOUR).toISOString(), totalUsers: 99 });
    store.docs.set('users/u1', { createdAt: new Date() });
    store.docs.set('users/u1/semesters/s1', { gpa: 4, pi: 4, creditLoaded: 20 });
    store.docs.set('users/u2', { createdAt: new Date() });
    store.docs.set('users/u2/semesters/s1', { gpa: 2, pi: 2, creditLoaded: 20 });

    const first = await (await stats('?refresh=1')).json();
    // Every semester with graded credits counts; the stored doc is replaced.
    expect(first).toMatchObject({ totalUsers: 2, stale: false });
    expect(first.avgCGPA).toBeCloseTo(3, 6);
    expect(store.docs.get('admin_metrics/latest').totalUsers).toBe(2);
    expect(state.audit).toHaveBeenCalledWith(expect.objectContaining({ action: 'metrics.refresh', actorEmail: ADMIN.email, target: 'admin_metrics/latest' }));

    expect((await stats('?refresh=1')).status).toBe(200);
    expect((await stats('?refresh=1')).status).toBe(200);
    const limited = await stats('?refresh=1');
    expect(limited.status).toBe(429);
    expect(limited.headers.get('Retry-After')).toBeTruthy();
    expect(state.audit).toHaveBeenCalledTimes(3);
  });

  it('passes admin auth errors through', async () => {
    state.requireAdmin.mockRejectedValueOnce(new (AdminAuthorizationError as any)(403));
    expect((await stats()).status).toBe(403);
  });
});

describe('GET /api/admin/users (paged)', () => {
  function seedUsers(count: number) {
    for (let i = 0; i < count; i += 1) {
      store.docs.set(`users/p${i}`, { fullName: `P ${i}`, email: `p${i}@test.example`, matric: `m/${i}`, matricNormalized: `M/${i}`, createdAt: new Date(Date.UTC(2026, 0, 1 + i)) });
    }
  }

  it('users GET cgpa equals computeCumulativeCGPA over every semester', async () => {
    store.docs.set('users/mixed', { fullName: 'Mixed', email: 'mixed@test.example', createdAt: new Date() });
    store.docs.set('users/mixed/semesters/a', { gpa: 4, pi: 4, creditLoaded: 20, isComplete: true });
    store.docs.set('users/mixed/semesters/b', { gpa: 2, pi: 2, creditLoaded: 20, isComplete: false });
    const response = await users();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.users).toHaveLength(1);
    expect(body.users[0].cgpa).toBeCloseTo(3, 10);
    expect(body.users[0].pi).toBeCloseTo(3, 10);
    expect(body.users[0].semesterCount).toBe(2);
    expect(body.nextCursor).toBeNull();
  });

  it('pages newest first with a cursor', async () => {
    seedUsers(5);
    const first = await (await users('?limit=2')).json();
    expect(first.users.map((user: { uid: string }) => user.uid)).toEqual(['p4', 'p3']);
    expect(first.nextCursor).toBe('p3');
    const second = await (await users(`?limit=2&cursor=${first.nextCursor}`)).json();
    expect(second.users.map((user: { uid: string }) => user.uid)).toEqual(['p2', 'p1']);
    const third = await (await users(`?limit=2&cursor=${second.nextCursor}`)).json();
    expect(third.users.map((user: { uid: string }) => user.uid)).toEqual(['p0']);
    expect(third.nextCursor).toBeNull();
  });

  it('searches by exact email or matric only', async () => {
    seedUsers(3);
    const byEmail = await (await users('?q=P1@Test.Example')).json();
    expect(byEmail.users.map((user: { uid: string }) => user.uid)).toEqual(['p1']);
    const byMatric = await (await users(`?q=${encodeURIComponent(' m/2 ')}`)).json();
    expect(byMatric.users.map((user: { uid: string }) => user.uid)).toEqual(['p2']);
    const partial = await (await users('?q=p1')).json();
    expect(partial.users).toEqual([]);
    expect(partial.nextCursor).toBeNull();
  });
});
