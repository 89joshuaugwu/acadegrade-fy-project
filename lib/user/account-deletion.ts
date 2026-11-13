import 'server-only';

import { createHash } from 'node:crypto';
import { FieldPath, type DocumentReference, type Firestore, type Query } from 'firebase-admin/firestore';
import { destroyCloudinaryAvatar, type CloudinaryDeleteResult } from '@/lib/cloudinary/server';

/**
 * Deletes every Firestore document that can be found for a user, in bounded,
 * batched pages. Firebase Auth and RTDB are handled by the route.
 *
 * Found by uid:        users/{uid} (+ semesters/courses), notifications/{uid} (+ items),
 *                      analytics/{uid}, shareCodes.authorId, shared_transcripts.uid,
 *                      api_logs.uid, _api_rate_limits.uid, _reward_sessions.uid,
 *                      _reward_transactions.uid, _matric_numbers.uid,
 *                      _academic_catalog_suggestions.uid
 * Found by sha256(uid): _coin_wallets/{hash}, _coin_ledger.uidHash, _coin_requests.uidHash,
 *                      _reward_daily/{hash}_{day}, _ai_feedback.uidHash
 * Found by profile:    _matric_numbers/{sha256(matricNormalized)}, otps/{email}_*,
 *                      _registration_tickets.email, the Cloudinary avatar
 */
export interface DeletionOptions {
  cloudinary?: (url: string) => Promise<CloudinaryDeleteResult>;
  pageSize?: number;
  maxPages?: number;
}
export interface DeletionReport {
  deleted: Record<string, number>;
  /** Collections where the page bound was hit and documents remain. */
  truncated: string[];
  avatar: CloudinaryDeleteResult;
}

const BATCH_LIMIT = 450;
const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

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

  // Matric reservation: by hashed matric (only if still ours) and by uid.
  const matric = typeof profile.matricNormalized === 'string' ? profile.matricNormalized
    : typeof profile.matric === 'string' ? profile.matric.trim().toUpperCase().replace(/\s+/g, '') : '';
  if (matric) {
    const reservation = db.collection('_matric_numbers').doc(sha256(matric));
    if ((await reservation.get()).data()?.uid === uid) await deleteRefs('_matric_numbers', [reservation]);
  }
  await deleteQuery('_matric_numbers', db.collection('_matric_numbers').where('uid', '==', uid));

  // Email-keyed auth leftovers.
  const email = typeof profile.email === 'string' ? profile.email.trim().toLowerCase() : '';
  if (email) {
    await deleteQuery('otps', prefixQuery('otps', `${email}_`));
    await deleteQuery('_registration_tickets', db.collection('_registration_tickets').where('email', '==', email));
  }

  if (typeof profile.avatarUrl === 'string' && profile.avatarUrl) {
    report.avatar = await (options.cloudinary ?? destroyCloudinaryAvatar)(profile.avatarUrl);
  }

  // The profile last, so a failure above can be retried with the same token.
  await deleteDoc('users', userRef);
  return report;
}
