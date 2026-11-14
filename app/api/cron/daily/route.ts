import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { apiTimer, logApiCall } from '@/lib/api/logger';
import { isCronRequest } from '@/lib/cron/auth';
import { runCronJobs } from '@/lib/cron/jobs';
import { DAILY_JOBS } from '@/lib/cron/registry';

export const dynamic = 'force-dynamic';
// Hobby allows up to 300 s. Jobs stop starting after 240 s so the run can still be recorded.
export const maxDuration = 300;

const NO_STORE = { 'Cache-Control': 'no-store' };
const JOB_BUDGET_MS = 240_000;

/** Vercel Cron calls this with `Authorization: Bearer <CRON_SECRET>`. Anyone else gets 401. */
export async function GET(request: Request) {
  if (!isCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_STORE });
  }

  const timer = apiTimer();
  const startedAt = new Date();
  const results = await runCronJobs(DAILY_JOBS, { db: adminDb, now: startedAt.getTime(), deadline: startedAt.getTime() + JOB_BUDGET_MS });
  const finishedAt = new Date();
  const failed = Object.values(results).some((outcome) => 'error' in outcome);

  try {
    // One document per UTC day. A re-run on the same day replaces it.
    await adminDb.collection('_cron_runs').doc(startedAt.toISOString().slice(0, 10)).set({ startedAt, finishedAt, results });
  } catch {
    console.warn('[cron] could not record the run');
  }

  logApiCall({ endpoint: '/api/cron/daily', category: 'admin', uid: null, status: failed ? 500 : 200, durationMs: timer() });
  return NextResponse.json({ ok: !failed, results }, { status: 200, headers: NO_STORE });
}
