import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryTestDb } from './query-test-db';
import type { CronJob } from '@/lib/cron/jobs';

const SECRET = 'c'.repeat(40);
const state = vi.hoisted(() => ({ db: null as any, jobs: [] as CronJob[], requireAdmin: vi.fn() }));

vi.mock('@/lib/firebase/admin', () => ({ get adminDb() { return state.db; }, adminAuth: { verifyIdToken: vi.fn() } }));
vi.mock('@/lib/api/logger', () => ({ apiTimer: () => () => 5, logApiCall: vi.fn() }));
vi.mock('@/lib/cron/registry', () => ({ get DAILY_JOBS() { return state.jobs; } }));
vi.mock('@/lib/api/admin-auth', () => ({
  requireAdmin: state.requireAdmin,
  AdminAuthorizationError: class extends Error { status = 403; },
}));

import { GET } from '@/app/api/cron/daily/route';
import { GET as adminGET } from '@/app/api/admin/cron/route';
import { runCronJobs } from '@/lib/cron/jobs';

let store: ReturnType<typeof queryTestDb>;
const original = process.env.CRON_SECRET;
const call = (authorization?: string) => GET(new Request('https://app.test/api/cron/daily', { headers: authorization ? { Authorization: authorization } : {} }) as never);

beforeEach(() => {
  store = queryTestDb();
  state.db = store.db;
  state.jobs = [];
  process.env.CRON_SECRET = SECRET;
  state.requireAdmin.mockReset().mockResolvedValue({ uid: 'admin', email: 'admin@test.example' });
});
afterEach(() => {
  if (original === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = original;
});

describe('GET /api/cron/daily', () => {
  it('returns 401 without the secret and runs nothing', async () => {
    const run = vi.fn().mockResolvedValue({});
    state.jobs = [{ id: 'job', run }];
    expect((await call()).status).toBe(401);
    expect((await call('Bearer wrong-secret-wrong-secret-wrong')).status).toBe(401);
    expect(run).not.toHaveBeenCalled();
    expect(store.paths('_cron_runs/')).toHaveLength(0);
  });

  it('runs the jobs, records the run, and one throwing job does not stop the others', async () => {
    const good = vi.fn().mockResolvedValue({ deleted: { otps: 3 } });
    state.jobs = [
      { id: 'broken', run: async () => { throw new Error('boom'); } },
      { id: 'good', run: good },
    ];

    const response = await call(`Bearer ${SECRET}`);
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    const body = await response.json();
    expect(body.ok).toBe(false); // one job failed, so the run is reported as not fully OK
    expect(body.results.broken).toEqual({ error: 'boom' });
    expect(body.results.good).toEqual({ deleted: { otps: 3 } });
    expect(good).toHaveBeenCalledTimes(1);

    const [path] = store.paths('_cron_runs/');
    expect(path).toMatch(/^_cron_runs\/\d{4}-\d{2}-\d{2}$/);
    expect(store.docs.get(path)).toMatchObject({ results: { good: { deleted: { otps: 3 } } } });
  });
});

describe('GET /api/cron/daily when every job succeeds', () => {
  it('reports ok: true', async () => {
    state.jobs = [{ id: 'good', run: async () => ({ deleted: {} }) }];
    const body = await (await call(`Bearer ${SECRET}`)).json();
    expect(body.ok).toBe(true);
  });
});

describe('runCronJobs', () => {
  it('skips jobs that would start after the deadline', async () => {
    const late = vi.fn().mockResolvedValue({});
    const results = await runCronJobs([{ id: 'late', run: late }], { db: store.db, now: Date.now(), deadline: Date.now() - 1 });
    expect(results.late).toEqual({ skipped: 'deadline' });
    expect(late).not.toHaveBeenCalled();
  });

  it('truncates very long error messages', async () => {
    const results = await runCronJobs([{ id: 'x', run: async () => { throw new Error('e'.repeat(1000)); } }], { db: store.db, now: Date.now(), deadline: Date.now() + 10_000 });
    expect((results.x as { error: string }).error).toHaveLength(300);
  });
});

describe('GET /api/admin/cron', () => {
  it('returns null before any run, then the latest run', async () => {
    const empty = await (await adminGET(new Request('https://app.test/api/admin/cron'))).json();
    expect(empty.lastRun).toBeNull();

    store.docs.set('_cron_runs/2026-11-13', { startedAt: new Date('2026-11-13T03:00:00Z'), finishedAt: new Date('2026-11-13T03:00:02Z'), results: { cleanup: { deleted: { otps: 1 } } } });
    store.docs.set('_cron_runs/2026-11-14', { startedAt: new Date('2026-11-14T03:00:00Z'), finishedAt: new Date('2026-11-14T03:00:03Z'), results: { cleanup: { deleted: { otps: 2 } } } });
    const body = await (await adminGET(new Request('https://app.test/api/admin/cron'))).json();
    expect(body.lastRun.date).toBe('2026-11-14');
    expect(body.lastRun.results.cleanup.deleted.otps).toBe(2);
    expect(body.lastRun.finishedAt).toBe('2026-11-14T03:00:03.000Z');
  });
});
