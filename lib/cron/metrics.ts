import { FieldPath } from 'firebase-admin/firestore';
import { computeAdminMetrics } from '@/lib/admin/metrics';
import type { CronContext, CronJob, CronJobResult } from './jobs';

/** `admin_metrics/latest` plus a dated copy (`admin_metrics/YYYY-MM-DD`) for history. */
export async function writeAdminMetrics(ctx: Pick<CronContext, 'db' | 'now'>) {
  const metrics = await computeAdminMetrics(ctx.db, ctx.now);
  const batch = ctx.db.batch();
  const collection = ctx.db.collection('admin_metrics');
  batch.set(collection.doc('latest'), metrics);
  batch.set(collection.doc(new Date(ctx.now).toISOString().slice(0, 10)), metrics);
  await batch.commit();
  return metrics;
}

export const metricsJob: CronJob = {
  id: 'metrics',
  async run(ctx: CronContext): Promise<CronJobResult> {
    await writeAdminMetrics(ctx);
    return { written: 2 };
  },
};

interface BackfillOptions {
  /** Auth creation time (any `Date.parse` string) for a uid, or null when unknown. */
  getCreationTime?: (uid: string) => Promise<string | null | undefined>;
  pageSize?: number;
  maxPages?: number;
  /** At most this many profiles are written per run (one Auth lookup each). */
  maxWrites?: number;
}

async function authCreationTime(uid: string) {
  // Imported lazily so this module can be loaded without initialising Firebase Admin.
  const { adminAuth } = await import('@/lib/firebase/admin');
  return (await adminAuth.getUser(uid)).metadata.creationTime;
}

/**
 * Old profiles without `createdAt` vanish from `orderBy('createdAt')` queries (the
 * admin Users list) and from sign-up metrics. This job walks `users` by document id,
 * resuming from `_cron_state/createdAt.cursor`, and copies the Auth account's creation
 * time into the profile. At most `maxWrites` (200) profiles a day. When it reaches the
 * end it sets `completedOnce` and starts again from the beginning next time.
 */
export function createCreatedAtBackfillJob(options: BackfillOptions = {}): CronJob {
  const getCreationTime = options.getCreationTime ?? authCreationTime;
  const pageSize = options.pageSize ?? 200;
  const maxPages = options.maxPages ?? 5;
  const maxWrites = options.maxWrites ?? 200;

  return {
    id: 'createdAtBackfill',
    async run(ctx: CronContext): Promise<CronJobResult> {
      const stateRef = ctx.db.collection('_cron_state').doc('createdAt');
      const state = (await stateRef.get()).data() ?? {};
      let cursor: string | null = typeof state.cursor === 'string' ? state.cursor : null;
      let completedOnce = state.completedOnce === true;
      let written = 0;
      let truncated = false;

      pages: for (let page = 0; page < maxPages; page += 1) {
        if (Date.now() > ctx.deadline) { truncated = true; break; }
        let query = ctx.db.collection('users').orderBy(FieldPath.documentId()).limit(pageSize);
        if (cursor) query = query.startAfter(cursor);
        const snapshot = await query.get();

        for (const doc of snapshot.docs) {
          cursor = doc.id;
          if (doc.data()?.createdAt) continue;
          let created: number | null = null;
          try {
            const value = await getCreationTime(doc.id);
            const parsed = value ? Date.parse(value) : Number.NaN;
            created = Number.isFinite(parsed) ? parsed : null;
          } catch {
            created = null; // Auth record gone: leave the profile alone
          }
          if (created === null) continue;
          await doc.ref.set({ createdAt: new Date(created) }, { merge: true });
          written += 1;
          if (written >= maxWrites) { truncated = true; break pages; }
        }

        if (snapshot.size < pageSize) {
          cursor = null;
          completedOnce = true;
          break;
        }
        if (page === maxPages - 1) truncated = true;
      }

      await stateRef.set({ cursor, completedOnce, updatedAt: new Date(ctx.now) }, { merge: true });
      return { written, truncated };
    },
  };
}

export const createdAtBackfillJob = createCreatedAtBackfillJob();
