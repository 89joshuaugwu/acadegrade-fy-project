import 'server-only';

import { createHash } from 'node:crypto';
import { FieldPath, type DocumentReference, type Firestore, type Query } from 'firebase-admin/firestore';
import { destroyCloudinaryAvatar, type CloudinaryDeleteResult } from '@/lib/cloudinary/server';

/**
 * Deletes every Firestore document that can be found for a user, in bounded,
 * batched pages. Firebase Auth and RTDB are handled by the route.
 *
 * Found by uid:        users/{uid} (+ semesters/courses, timetables, olevel, admission), notifications/{uid} (+ items),
 *                      analytics/{uid}, shareCodes.authorId, shared_transcripts.uid,
 *                      api_logs.uid, _api_rate_limits.uid, _reward_sessions.uid,
 *                      _reward_transactions.uid, _matric_numbers.uid,
 *                      _academic_catalog_suggestions.uid, support_tickets.uid
 * Redacted, not deleted: _academic_catalog_assignments (changes.{uid}, suggestionUid)
 * Found by sha256(uid): _coin_wallets/{hash}, _coin_ledger.uidHash, _coin_requests.uidHash,
 *                      _reward_daily/{hash}_{day}, _ai_feedback.uidHash
 * Found by profile:    _matric_numbers/{sha256(matricNormalized)}, otps/{email}_*,
 *                      _registration_tickets.email, the Cloudinary avatar
 */
/** What a follow-up run needs once the profile document is gone. */
export interface DeletionIdentity {
  email?: string | null;
  matric?: string | null;
  avatarUrl?: string | null;
}
export interface DeletionOptions {
  cloudinary?: (url: string) => Promise<CloudinaryDeleteResult>;
  pageSize?: number;
  maxPages?: number;
  /** Used when `users/{uid}` no longer exists (a follow-up run). The profile wins when present. */
  identity?: DeletionIdentity;
}
export interface DeletionReport {
  deleted: Record<string, number>;
  /** Collections where the page bound was hit and documents remain. */
  truncated: string[];
  avatar: CloudinaryDeleteResult;
}

const BATCH_LIMIT = 450;
const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

function profileEmail(profile: Record<string, unknown>): string {
  return typeof profile.email === 'string' ? profile.email.trim().toLowerCase() : '';
}
function profileMatric(profile: Record<string, unknown>): string {
  if (typeof profile.matricNormalized === 'string') return profile.matricNormalized;
  return typeof profile.matric === 'string' ? profile.matric.trim().toUpperCase().replace(/\s+/g, '') : '';
}

export async function deleteUserData(db: Firestore, uid: string, options: DeletionOptions = {}): Promise<DeletionReport> {
  const pageSize = Math.min(options.pageSize ?? 400, BATCH_LIMIT);
  const maxPages = options.maxPages ?? 20;
  const report: DeletionReport = { deleted: {}, truncated: [], avatar: 'skipped' };
  const uidHash = sha256(uid);
  const count = (collection: string, amount: number) => {
    if (amount) report.deleted[collection] = (report.deleted[collection] ?? 0) + amount;
  };

  async function deleteRefs(collection: string, refs: DocumentReference[]) {
    for (let index = 0; index < refs.length; index += BATCH_LIMIT) {
      const batch = db.batch();
      const chunk = refs.slice(index, index + BATCH_LIMIT);
      chunk.forEach((ref) => batch.delete(ref));
      await batch.commit();
    }
    count(collection, refs.length);
  }

  async function deleteDoc(collection: string, ref: DocumentReference) {
    if ((await ref.get()).exists) await deleteRefs(collection, [ref]);
  }

  /**
   * Catalogue Assign records (`_academic_catalog_assignments`) keep each changed
   * student's uid and old values (`changes.{uid}`) and the suggesting student's
   * uid, for Undo. The record stays for the other students; this student's entry
   * and uid are removed (counted under the collection name). Assign records are
   * few (one per admin action), so they are read in bounded id-ordered pages.
   */
  async function redactCatalogAssignments() {
    const collection = '_academic_catalog_assignments';
    let cursor: string | null = null;
    for (let page = 0; page < maxPages; page += 1) {
      let query: Query = db.collection(collection).orderBy(FieldPath.documentId()).limit(pageSize);
      if (cursor) query = query.startAfter(cursor);
      const snapshot = await query.get();
      for (const document of snapshot.docs) {
        const data = document.data() ?? {};
        const changes = data.changes && typeof data.changes === 'object' ? data.changes as Record<string, unknown> : {};
        if (data.suggestionUid !== uid && !Object.prototype.hasOwnProperty.call(changes, uid)) continue;
        await db.runTransaction(async (transaction) => {
          const fresh = await transaction.get(document.ref);
          if (!fresh.exists) return;
          const current = fresh.data() ?? {};
          const currentChanges = current.changes && typeof current.changes === 'object' ? { ...(current.changes as Record<string, unknown>) } : {};
          delete currentChanges[uid];
          // A full replace (not merge), so the removed map key really goes.
          transaction.set(document.ref, {
            ...current,
            changes: currentChanges,
            ...(typeof current.changedCount === 'number' ? { changedCount: Object.keys(currentChanges).length } : {}),
            ...(current.suggestionUid === uid ? { suggestionUid: null } : {}),
          });
        });
        count(collection, 1);
      }
      if (snapshot.size < pageSize) return;
      cursor = snapshot.docs[snapshot.docs.length - 1].id;
    }
    report.truncated.push(collection);
  }

  async function deleteQuery(collection: string, query: Query) {
    for (let page = 0; page < maxPages; page += 1) {
      const snapshot = await query.limit(pageSize).get();
      if (snapshot.empty) return;
      await deleteRefs(collection, snapshot.docs.map((doc) => doc.ref));
      if (snapshot.size < pageSize) return;
    }
    if (!(await query.limit(1).get()).empty) report.truncated.push(collection);
  }

  const prefixQuery = (collection: string, prefix: string) => db.collection(collection)
    .where(FieldPath.documentId(), '>=', prefix)
    .where(FieldPath.documentId(), '<', `${prefix}`);

  const userRef = db.collection('users').doc(uid);
  const profile = (await userRef.get()).data() ?? {};

  // Academic records.
  const semesters = await userRef.collection('semesters').get();
  for (const semester of semesters.docs) {
    await deleteQuery('courses', semester.ref.collection('courses'));
  }
  await deleteRefs('semesters', semesters.docs.map((doc) => doc.ref));
  await deleteQuery('timetables', userRef.collection('timetables'));
  // Phase 2 record types: one document each ('current').
  await deleteQuery('olevel', userRef.collection('olevel'));
  await deleteQuery('admission', userRef.collection('admission'));

  await deleteQuery('notifications', db.collection('notifications').doc(uid).collection('items'));
  await deleteDoc('notifications', db.collection('notifications').doc(uid));
  await deleteDoc('analytics', db.collection('analytics').doc(uid));
  await deleteQuery('shareCodes', db.collection('shareCodes').where('authorId', '==', uid));
  await deleteQuery('shared_transcripts', db.collection('shared_transcripts').where('uid', '==', uid));

  // Coins, rewards and AI feedback.
  await deleteDoc('_coin_wallets', db.collection('_coin_wallets').doc(uidHash));
  await deleteQuery('_coin_ledger', db.collection('_coin_ledger').where('uidHash', '==', uidHash));
  await deleteQuery('_coin_requests', db.collection('_coin_requests').where('uidHash', '==', uidHash));
  await deleteQuery('_reward_sessions', db.collection('_reward_sessions').where('uid', '==', uid));
  // Replay tombstones carry the uid. Their sessions are gone, so a replayed
  // callback is rejected as "session not found".
  await deleteQuery('_reward_transactions', db.collection('_reward_transactions').where('uid', '==', uid));
  await deleteQuery('_reward_daily', prefixQuery('_reward_daily', `${uidHash}_`));
  await deleteQuery('_ai_feedback', db.collection('_ai_feedback').where('uidHash', '==', uidHash));

  // Logs and counters.
  await deleteQuery('api_logs', db.collection('api_logs').where('uid', '==', uid));
  await deleteQuery('_api_rate_limits', db.collection('_api_rate_limits').where('uid', '==', uid));
  await deleteQuery('_academic_catalog_suggestions', db.collection('_academic_catalog_suggestions').where('uid', '==', uid));
  await deleteQuery('support_tickets', db.collection('support_tickets').where('uid', '==', uid));
  await redactCatalogAssignments();

  // Matric reservation: by hashed matric (only if still ours) and by uid.
  const matric = profileMatric(profile) || options.identity?.matric || '';
  if (matric) {
    const reservation = db.collection('_matric_numbers').doc(sha256(matric));
    if ((await reservation.get()).data()?.uid === uid) await deleteRefs('_matric_numbers', [reservation]);
  }
  await deleteQuery('_matric_numbers', db.collection('_matric_numbers').where('uid', '==', uid));

  // Email-keyed auth leftovers.
  const email = profileEmail(profile) || options.identity?.email?.trim().toLowerCase() || '';
  if (email) {
    await deleteQuery('otps', prefixQuery('otps', `${email}_`));
    await deleteQuery('_registration_tickets', db.collection('_registration_tickets').where('email', '==', email));
  }

  const avatarUrl = typeof profile.avatarUrl === 'string' && profile.avatarUrl ? profile.avatarUrl : options.identity?.avatarUrl || '';
  if (avatarUrl) {
    report.avatar = await (options.cloudinary ?? destroyCloudinaryAvatar)(avatarUrl);
  }

  // The profile last, so a failure above can be retried with the same token.
  await deleteDoc('users', userRef);
  return report;
}

/*
 * Follow-up queue (owner decision A3, 17 Nov 2026). `deleteUserData` stops after a
 * bounded amount of work, and a request can fail part-way. So every deletion is
 * queued in `_account_deletion_queue/{sha256(uid)}` (server-only) BEFORE any data is
 * deleted, and the entry is removed only once nothing is left. The daily cron job
 * (`lib/cron/account-deletion.ts`) finishes whatever remains, including the Auth user,
 * well inside the 21 days the account-deletion page promises.
 *
 * The entry holds the uid and the email/matric/avatar needed to find leftovers once
 * the profile is gone; it is deleted as soon as the deletion completes.
 */
export const DELETION_QUEUE_COLLECTION = '_account_deletion_queue';
export const DELETION_PROMISE_MS = 21 * 24 * 60 * 60 * 1000;
/** A request in progress is left alone by the daily job for this long. */
export const DELETION_GRACE_MS = 60 * 60 * 1000;

export type DeletionSource = 'self' | 'admin';

export function deletionQueueId(uid: string): string {
  return sha256(uid);
}

/** Records the request (keeping the first request date) and returns the identity to delete with. */
export async function queueAccountDeletion(db: Firestore, uid: string, source: DeletionSource, now = new Date()): Promise<Required<DeletionIdentity>> {
  const profile = ((await db.collection('users').doc(uid).get()).data() ?? {}) as Record<string, unknown>;
  const identity = {
    email: profileEmail(profile) || null,
    matric: profileMatric(profile) || null,
    avatarUrl: typeof profile.avatarUrl === 'string' && profile.avatarUrl ? profile.avatarUrl : null,
  };
  const ref = db.collection(DELETION_QUEUE_COLLECTION).doc(deletionQueueId(uid));
  const existing = (await ref.get()).data();
  const requestedAt = existing?.requestedAt ?? now;
  const requestedMs = requestedAt instanceof Date ? requestedAt.getTime()
    : typeof requestedAt?.toMillis === 'function' ? requestedAt.toMillis() : now.getTime();
  await ref.set({
    uid,
    // A re-queue after the profile is gone must not erase what is still needed.
    email: identity.email ?? existing?.email ?? null,
    matric: identity.matric ?? existing?.matric ?? null,
    avatarUrl: identity.avatarUrl ?? existing?.avatarUrl ?? null,
    source: existing?.source ?? source,
    status: 'running',
    attempts: typeof existing?.attempts === 'number' ? existing.attempts : 0,
    truncated: Array.isArray(existing?.truncated) ? existing.truncated : [],
    lastError: null,
    requestedAt,
    dueBy: new Date(requestedMs + DELETION_PROMISE_MS),
    nextAttemptAt: new Date(now.getTime() + DELETION_GRACE_MS),
    updatedAt: now,
  });
  return {
    email: identity.email ?? existing?.email ?? null,
    matric: identity.matric ?? existing?.matric ?? null,
    avatarUrl: identity.avatarUrl ?? existing?.avatarUrl ?? null,
  };
}

/**
 * Call after Firestore, RTDB and Auth were handled. Removes the entry when nothing
 * is left, otherwise marks it for the next daily run.
 */
export async function settleAccountDeletion(
  db: Firestore,
  uid: string,
  report: DeletionReport,
  now = new Date(),
  attempts?: number,
): Promise<'complete' | 'pending'> {
  const ref = db.collection(DELETION_QUEUE_COLLECTION).doc(deletionQueueId(uid));
  if (!report.truncated.length && report.avatar !== 'failed') {
    await ref.delete();
    return 'complete';
  }
  await ref.set({
    status: 'pending',
    truncated: report.truncated,
    avatarFailed: report.avatar === 'failed',
    nextAttemptAt: now,
    updatedAt: now,
    ...(attempts !== undefined ? { attempts } : {}),
  }, { merge: true });
  return 'pending';
}
