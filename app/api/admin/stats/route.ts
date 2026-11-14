import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { AdminAuthorizationError, requireAdmin } from '@/lib/api/admin-auth';
import { writeAdminAudit } from '@/lib/api/admin-audit';
import { checkRateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import { toMillis, type AdminMetrics } from '@/lib/admin/metrics';
import { writeAdminMetrics } from '@/lib/cron/metrics';

export const dynamic = 'force-dynamic';

const headers = { 'Cache-Control': 'private, no-store' };
const STALE_AFTER_MS = 36 * 60 * 60 * 1000;
const REFRESH_WINDOWS = [{ name: 'hourly', limit: 3, windowMs: 60 * 60 * 1000 }];

function respond(metrics: Partial<AdminMetrics>) {
  const generatedAtMs = toMillis(metrics.generatedAt);
  return NextResponse.json({
    ...metrics,
    generatedAt: generatedAtMs === null ? null : new Date(generatedAtMs).toISOString(),
    funnel: Array.isArray(metrics.funnel) ? metrics.funnel : [],
    stale: generatedAtMs === null || Date.now() - generatedAtMs > STALE_AFTER_MS,
  }, { headers });
}

/**
 * GET /api/admin/stats
 * Serves the daily roll-up in `admin_metrics/latest` (written by the cron
 * `metricsJob`), with every field the old live scan returned plus `generatedAt`,
 * `funnel` and `stale` (older than 36 h). `?refresh=1` recomputes now: at most
 * 3 times an hour per admin, audited as `metrics.refresh`.
 */
export async function GET(request: Request) {
  try {
    const admin = await requireAdmin(request);
    const refresh = new URL(request.url).searchParams.get('refresh') === '1';

    if (refresh) {
      const limit = await checkRateLimit(admin.uid, 'admin_metrics_refresh', REFRESH_WINDOWS);
      if (!limit.allowed) return rateLimitResponse(limit, 'You can refresh the numbers 3 times an hour. Try again later.');
      const metrics = await writeAdminMetrics({ db: adminDb, now: Date.now() });
      await writeAdminAudit({
        actorEmail: admin.email, actorUid: admin.uid, action: 'metrics.refresh', target: 'admin_metrics/latest',
        summary: 'Recomputed admin metrics', after: { totalUsers: metrics.totalUsers, generatedAt: metrics.generatedAt },
      });
      return respond(metrics);
    }

    const latest = await adminDb.collection('admin_metrics').doc('latest').get();
    if (latest.exists) return respond(latest.data() as Partial<AdminMetrics>);
    // No daily run yet (a new deployment): compute once and store it for everyone.
    return respond(await writeAdminMetrics({ db: adminDb, now: Date.now() }));
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: error.status, headers });
    }
    console.error('Admin stats error');
    return NextResponse.json({ error: 'Unable to load platform statistics.' }, { status: 500, headers });
  }
}
