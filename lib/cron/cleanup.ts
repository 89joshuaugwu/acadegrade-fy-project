import type { Firestore } from 'firebase-admin/firestore';
import type { CronJob, CronContext, CronJobResult } from './jobs';

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_PAGE_SIZE = 400; // a batch holds at most 500 writes
const DEFAULT_MAX_PAGES = 10; // so at most 4,000 deletes per collection per run

/**
 * What the daily job may purge. Everything here is safe to lose once expired.
 *
 * Deliberately NOT listed (never delete these, however old): `_reward_transactions`
 * and `_coin_requests` (they block replayed rewards and charges), `_coin_ledger`
 * and `_coin_wallets` (money-like records), `_admin_audit` (the audit trail).
 */
export const CLEANUP_TARGETS: readonly { collection: string; field: string; retainMs: number }[] = [
  { collection: 'shared_transcripts', field: 'expiresAt', retainMs: 0 },
  { collection: 'otps', field: 'expiresAt', retainMs: 0 },
  { collection: '_api_rate_limits', field: 'expiresAt', retainMs: 0 },
  { collection: '_reward_sessions', field: 'ttlAt', retainMs: 0 },
  { collection: 'api_logs', field: 'timestamp', retainMs: 90 * DAY_MS },
];

/**
 * Deletes documents whose `field` is earlier than `before`, a page at a time.
 * Documents without the field are never matched. Stops after `maxPages` and
 * reports `truncated` when the last page was full (more may remain for tomorrow).
 */
export async function deleteExpired(
  db: Firestore,
  collection: string,
  field: string,
  before: Date,
  options: { pageSize?: number; maxPages?: number } = {},
): Promise<{ deleted: number; truncated: boolean }> {
  const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;
  const maxPages = options.maxPages ?? DEFAULT_MAX_PAGES;
  let deleted = 0;

  for (let page = 0; page < maxPages; page += 1) {
    const snapshot = await db.collection(collection).where(field, '<', before).limit(pageSize).get();
    if (snapshot.empty) return { deleted, truncated: false };

    const batch = db.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    deleted += snapshot.size;

    if (snapshot.size < pageSize) return { deleted, truncated: false };
  }
  return { deleted, truncated: true };
}

export const cleanupJob: CronJob = {
  id: 'cleanup',
  async run(ctx: CronContext): Promise<CronJobResult> {
    const deleted: Record<string, number> = {};
    let truncated = false;
    for (const target of CLEANUP_TARGETS) {
      if (Date.now() > ctx.deadline) { truncated = true; break; }
      const cutoff = new Date(ctx.now - target.retainMs);
      const result = await deleteExpired(ctx.db, target.collection, target.field, cutoff);
      deleted[target.collection] = result.deleted;
      if (result.truncated) truncated = true;
    }
    return { deleted, truncated };
  },
};
