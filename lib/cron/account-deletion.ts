import { randomBytes } from 'node:crypto';
import type { Firestore } from 'firebase-admin/firestore';
import type { CloudinaryDeleteResult } from '@/lib/cloudinary/server';
import {
  DELETION_QUEUE_COLLECTION, deleteUserData, settleAccountDeletion, type DeletionIdentity,
} from '@/lib/user/account-deletion';
import type { CronContext, CronJob, CronJobResult } from './jobs';

/** At most this many accounts per daily run; the rest wait for tomorrow (well inside 21 days). */
const MAX_ACCOUNTS_PER_RUN = 10;
/** Leftovers keyed by email; only these need the saved email on a follow-up run. */
const EMAIL_KEYED = new Set(['otps', '_registration_tickets']);

export interface AccountDeletionFollowUpDeps {
  deleteAuthUser?: (uid: string) => Promise<void>;
  removeUnreadCounter?: (uid: string) => Promise<void>;
  cloudinary?: (url: string) => Promise<CloudinaryDeleteResult>;
  maxAccounts?: number;
}

const toMillis = (value: unknown): number => {
  if (value instanceof Date) return value.getTime();
  const stamp = value as { toMillis?: () => number } | null | undefined;
  return typeof stamp?.toMillis === 'function' ? stamp.toMillis() : 0;
};

async function defaultDeleteAuthUser(uid: string) {
  const { adminAuth } = await import('@/lib/firebase/admin');
  await adminAuth.deleteUser(uid);
}

async function defaultRemoveUnreadCounter(uid: string) {
  const { adminRtdb } = await import('@/lib/firebase/admin');
  await adminRtdb.ref(`notif_counts/${uid}`).remove();
}

/** Same shape as `writeAdminAudit`; the actor is the daily job. Never the uid or email. */
async function auditFollowUp(db: Firestore, target: string, summary: string, after: Record<string, unknown>) {
  try {
    const now = new Date();
    await db.collection('_admin_audit').doc(`${now.getTime()}-${randomBytes(6).toString('hex')}`).create({
      actorUid: null,
      actorEmail: 'daily-job',
      action: 'account-deletion.follow-up',
      target,
      summary,
      before: null,
      after,
      createdAt: now,
      createdAtMs: now.getTime(),
    });
  } catch {
    console.warn('[account deletion follow-up] audit write failed');
  }
}

/**
 * Finishes account deletions that stopped part-way (owner decision A3). Idempotent:
 * every step deletes only what still exists, and an Auth user that is already gone
 * counts as done. Each account is audited without its uid or email.
 */
export function createAccountDeletionFollowUpJob(deps: AccountDeletionFollowUpDeps = {}): CronJob {
  const deleteAuthUser = deps.deleteAuthUser ?? defaultDeleteAuthUser;
  const removeUnreadCounter = deps.removeUnreadCounter ?? defaultRemoveUnreadCounter;
  const maxAccounts = deps.maxAccounts ?? MAX_ACCOUNTS_PER_RUN;

  return {
    id: 'accountDeletionFollowUp',
    async run(ctx: CronContext): Promise<CronJobResult> {
      const now = new Date(ctx.now);
      const due = await ctx.db.collection(DELETION_QUEUE_COLLECTION)
        .where('nextAttemptAt', '<=', now)
        .limit(maxAccounts + 1)
        .get();
      const entries = due.docs.slice(0, maxAccounts);
      let truncated = due.size > maxAccounts;
      const deleted: Record<string, number> = {};
      let completed = 0;
      let pending = 0;
      let failed = 0;
      let overdue = 0;

      for (const entry of entries) {
        if (Date.now() > ctx.deadline) { truncated = true; break; }
        const data = entry.data() as Record<string, unknown>;
        const target = `${DELETION_QUEUE_COLLECTION}/${entry.id}`;
        const attempts = (typeof data.attempts === 'number' ? data.attempts : 0) + 1;
        const uid = typeof data.uid === 'string' ? data.uid : '';
        if (!uid) {
          await entry.ref.delete();
          continue;
        }

        const leftovers = Array.isArray(data.truncated) ? data.truncated as string[] : [];
        // A request that crashed before settling never finished its email-keyed clean-up.
        const needsEmail = data.status === 'running' || leftovers.some((name) => EMAIL_KEYED.has(name));
        const identity: DeletionIdentity = {
          email: needsEmail && typeof data.email === 'string' ? data.email : null,
          matric: typeof data.matric === 'string' ? data.matric : null,
          avatarUrl: typeof data.avatarUrl === 'string' ? data.avatarUrl : null,
        };

        try {
          const report = await deleteUserData(ctx.db, uid, { identity, cloudinary: deps.cloudinary });
          for (const [name, amount] of Object.entries(report.deleted)) deleted[name] = (deleted[name] ?? 0) + amount;
          await removeUnreadCounter(uid).catch(() => undefined);
          try {
            await deleteAuthUser(uid);
          } catch (error) {
            if ((error as { code?: string })?.code !== 'auth/user-not-found') throw error;
          }
          const outcome = await settleAccountDeletion(ctx.db, uid, report, now, attempts);
          if (outcome === 'complete') completed += 1;
          else {
            pending += 1;
            if (toMillis(data.dueBy) < ctx.now) overdue += 1;
          }
          await auditFollowUp(ctx.db, target, outcome === 'complete'
            ? 'Finished an unfinished account deletion'
            : `Continued an account deletion; documents remain in ${report.truncated.length} collection(s)`, {
            outcome, attempts, deleted: report.deleted, truncated: report.truncated, avatar: report.avatar,
          });
        } catch (error) {
          failed += 1;
          if (toMillis(data.dueBy) < ctx.now) overdue += 1;
          const code = (error as { code?: string })?.code;
          const lastError = (typeof code === 'string' ? code : error instanceof Error ? error.message : 'failed').slice(0, 200);
          await entry.ref.set({ status: 'pending', attempts, lastError, nextAttemptAt: now, updatedAt: now }, { merge: true });
          await auditFollowUp(ctx.db, target, 'An account deletion follow-up failed; it will be retried tomorrow', { outcome: 'failed', attempts, error: lastError });
        }
      }

      if (overdue) console.warn(`[account deletion follow-up] ${overdue} deletion(s) past the 21-day date`);
      const parts = [`${completed} finished`, `${pending} still pending`, `${failed} failed`];
      if (overdue) parts.push(`${overdue} past the 21-day date`);
      return { deleted, written: completed, truncated, note: parts.join(', ') };
    },
  };
}

export const accountDeletionFollowUpJob = createAccountDeletionFollowUpJob();
