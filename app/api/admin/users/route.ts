import { NextResponse } from 'next/server';
import { adminAuth, adminDb, adminMessaging, adminRtdb } from '@/lib/firebase/admin';
import { unsubscribeAllTopics } from '@/lib/notifications/topics';
import { CoinWallet, GRANT_MAX_AMOUNT } from '@/lib/ads/reward/coins';
import { RewardError } from '@/lib/ads/reward/errors';
import { getAiEligibility } from '@/lib/user/age';
import { deleteUserData, queueAccountDeletion, settleAccountDeletion } from '@/lib/user/account-deletion';
import { deviceTokens } from '@/lib/admin/user-devices';
import { writeAdminAudit } from '@/lib/api/admin-audit';
import { readAgeStatusFrom, readAiConsent } from '@/lib/user/requirements';
import { computeCumulativeCGPA, resolveGradingScale } from '@/lib/cgpa/academicRules';
import { AdminAuthorizationError, requireAdmin } from '@/lib/api/admin-auth';
import { toMillis } from '@/lib/admin/metrics';
import type { DocumentSnapshot, QueryDocumentSnapshot } from 'firebase-admin/firestore';

const noStore = { 'Cache-Control': 'private, no-store' };

/**
 * GET /api/admin/users?limit=50&cursor=<uid>&q=<email|matric>
 *   -> { users, nextCursor } — newest first (createdAt desc), CGPA computed for the page only.
 *   `q` is an exact match on `email` (lower-cased) or `matricNormalized`, never a scan.
 * POST /api/admin/users — account actions (see below); every change is audited.
 */

const DEFAULT_PAGE = 50;
const MAX_PAGE = 100;

const toIso = (value: unknown): string | null => {
  const ms = toMillis(value);
  return ms === null ? null : new Date(ms).toISOString();
};

async function toUserRow(doc: QueryDocumentSnapshot | DocumentSnapshot) {
  const data = doc.data() ?? {};
  // Student rule: every graded course counts, whether or not its semester is complete.
  const semSnap = await adminDb.collection(`users/${doc.id}/semesters`).get();
  const { cgpa, pi } = computeCumulativeCGPA(
    semSnap.docs.map((semDoc) => semDoc.data() as { gpa: number; pi: number; creditLoaded: number }),
  );
  return {
    uid: doc.id,
    fullName: data.fullName || 'Unknown',
    email: data.email || '',
    matric: data.matric || 'N/A',
    department: data.department || 'N/A',
    currentLevel: data.currentLevel || 100,
    cgpa,
    pi,
    // Read-only scale name, so the CGPA is read on the right scale.
    gradingScale: resolveGradingScale(data.gradingScale).name,
    gradingScaleMax: resolveGradingScale(data.gradingScale).maxPoint,
    semesterCount: semSnap.size,
    disabled: data.disabled || false,
    // Read from the profile already loaded: no extra reads.
    ageStatus: readAgeStatusFrom(data) ?? 'unknown',
    aiConsent: readAiConsent(data),
    createdAt: toIso(data.createdAt),
    lastActiveAt: toIso(data.lastActiveAt),
  };
}

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const params = new URL(request.url).searchParams;
    const requested = Number.parseInt(params.get('limit') ?? '', 10);
    const limit = Number.isFinite(requested) ? Math.min(Math.max(requested, 1), MAX_PAGE) : DEFAULT_PAGE;
    const q = (params.get('q') ?? '').trim().slice(0, 200);
    const users = adminDb.collection('users');

    if (q) {
      const field = q.includes('@') ? 'email' : 'matricNormalized';
      const value = field === 'email' ? q.toLowerCase() : q.toUpperCase().replace(/\s+/g, '');
      const matches = await users.where(field, '==', value).limit(limit).get();
      return NextResponse.json({ users: await Promise.all(matches.docs.map(toUserRow)), nextCursor: null }, { headers: noStore });
    }

    let query = users.orderBy('createdAt', 'desc').limit(limit);
    const cursor = (params.get('cursor') ?? '').trim();
    if (cursor) {
      const cursorDoc = await users.doc(cursor.slice(0, 128)).get();
      if (!cursorDoc.exists) return NextResponse.json({ error: 'Unknown cursor' }, { status: 400, headers: noStore });
      query = query.startAfter(cursorDoc);
    }
    const page = await query.get();
    const rows = await Promise.all(page.docs.map(toUserRow));
    const nextCursor = page.size === limit ? page.docs[page.docs.length - 1].id : null;
    return NextResponse.json({ users: rows, nextCursor }, { headers: noStore });
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: error.status, headers: noStore });
    }
    console.error('Admin users GET error');
    return NextResponse.json({ error: 'Unable to load users.' }, { status: 500, headers: noStore });
  }
}

const REASON_MIN = 5;
const REASON_MAX = 300;
const readReason = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
const badRequest = (error: string, extra: Record<string, unknown> = {}) => NextResponse.json({ error, ...extra }, { status: 400, headers: noStore });

/**
 * POST /api/admin/users { action, uid, ... } — every change is audited as `users.<action>`.
 *   disable | enable
 *   set-age        { ageStatus: 'adult'|'minor', reason ≤ 300 }
 *   reveal-grades  { reason 5–300 } -> { semesters: { label, gpa, creditLoaded, isComplete }[], cgpa }
 *   grant-coins    { amount 1–10, reason 5–300 } -> { granted, balance, monthTotal }
 *                  409 { code: 'CAP_REACHED' | 'BALANCE_CAP' | 'COINS_DISABLED' }, 403 { code: 'AI_NOT_ALLOWED' }
 *   sign-out-all   revokes refresh tokens and clears saved push tokens
 *   delete-account { confirmEmail } must equal the profile email; deletes all data and the Auth user
 */
export async function POST(request: Request) {
  try {
    const admin = await requireAdmin(request);
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    if (!body) return badRequest('Invalid JSON body');
    const action = body.action;
    const uid = typeof body.uid === 'string' ? body.uid.trim() : '';
    if (!uid || uid.length > 128 || uid.includes('/')) return badRequest('Missing uid');

    const actor = { actorUid: admin.uid, actorEmail: admin.email };
    const target = `users/${uid}`;
    const userRef = adminDb.collection('users').doc(uid);

    if (action === 'disable' || action === 'enable') {
      const disabled = action === 'disable';
      const before = (await userRef.get()).data()?.disabled === true;
      await adminAuth.updateUser(uid, { disabled });
      await userRef.update({ disabled });
      await writeAdminAudit({
        ...actor, action: `users.${action}`, target, summary: disabled ? 'Disabled account' : 'Enabled account',
        before: { disabled: before }, after: { disabled },
      });
      return NextResponse.json({ success: true, message: disabled ? 'User disabled.' : 'User enabled.' });
    }

    // Support-only age correction (for example an "adult" who is under 18).
    // Students cannot go adult -> minor themselves; see /api/user/age.
    if (action === 'set-age') {
      if (body.ageStatus !== 'adult' && body.ageStatus !== 'minor') {
        return NextResponse.json({ error: "ageStatus must be 'adult' or 'minor'" }, { status: 400 });
      }
      const reason = readReason(body.reason);
      if (!reason || reason.length > REASON_MAX) {
        return NextResponse.json({ error: 'Give a reason for the correction (up to 300 characters).' }, { status: 400 });
      }
      const current = (await userRef.get()).data();
      if (!current) return NextResponse.json({ error: 'User not found' }, { status: 404 });
      const now = new Date();
      await userRef.set({
        ageStatus: body.ageStatus,
        ...(current.ageDeclaredAt ? {} : { ageDeclaredAt: now }),
        ageCorrectedAt: now,
        ageCorrectedBy: admin.email,
      }, { merge: true });
      await writeAdminAudit({
        ...actor, action: 'users.set-age', target, summary: `Support age correction: ${reason}`,
        before: { ageStatus: current.ageStatus ?? null }, after: { ageStatus: body.ageStatus },
      });
      return NextResponse.json({ success: true, ageStatus: body.ageStatus });
    }

    if (action === 'reveal-grades') {
      const reason = readReason(body.reason);
      if (reason.length < REASON_MIN || reason.length > REASON_MAX) return badRequest('Give a reason of 5 to 300 characters.');
      const snapshot = await userRef.get();
      if (!snapshot.exists) return NextResponse.json({ error: 'User not found' }, { status: 404, headers: noStore });
      const semesters = (await userRef.collection('semesters').get()).docs.map((doc) => doc.data() ?? {});
      const rows = semesters.map((semester) => ({
        label: typeof semester.label === 'string' && semester.label ? semester.label : 'Semester',
        gpa: Number(semester.gpa) || 0,
        creditLoaded: Number(semester.creditLoaded) || 0,
        isComplete: semester.isComplete === true,
      }));
      const { cgpa } = computeCumulativeCGPA(semesters.map((semester) => ({
        gpa: Number(semester.gpa) || 0, pi: Number(semester.pi) || 0, creditLoaded: Number(semester.creditLoaded) || 0,
      })));
      // The reason and the fact of access are recorded; the grades themselves are not copied into the log.
      await writeAdminAudit({
        ...actor, action: 'users.reveal-grades', target, summary: `Revealed grades: ${reason}`, after: { semesterCount: rows.length },
      });
      return NextResponse.json({ semesters: rows, cgpa }, { headers: noStore });
    }

    if (action === 'grant-coins') {
      const reason = readReason(body.reason);
      if (reason.length < REASON_MIN || reason.length > REASON_MAX) return badRequest('Give a reason of 5 to 300 characters.');
      const amount = body.amount;
      if (typeof amount !== 'number' || !Number.isInteger(amount) || amount < 1 || amount > GRANT_MAX_AMOUNT) {
        return badRequest(`Grant between 1 and ${GRANT_MAX_AMOUNT} whole coins.`);
      }
      if (!(await userRef.get()).exists) return NextResponse.json({ error: 'User not found' }, { status: 404, headers: noStore });
      // Coins exist only for AI features; never offer them to accounts that cannot use AI (minors included).
      const eligibility = await getAiEligibility(uid);
      if (!eligibility.aiAllowed) {
        return NextResponse.json({ error: 'This account cannot use AI features, so it cannot receive coins.', code: 'AI_NOT_ALLOWED' }, { status: 403, headers: noStore });
      }
      try {
        const result = await new CoinWallet(adminDb).grant(uid, amount, { actorEmail: admin.email, reason });
        await writeAdminAudit({
          ...actor, action: 'users.grant-coins', target, summary: `Granted ${amount} coin${amount === 1 ? '' : 's'}: ${reason}`,
          after: { amount, balance: result.balance },
        });
        return NextResponse.json(result, { headers: noStore });
      } catch (error) {
        if (error instanceof RewardError) {
          return NextResponse.json({ error: error.message, ...(error.details ?? {}) }, { status: error.status, headers: noStore });
        }
        throw error;
      }
    }

    if (action === 'sign-out-all') {
      const snapshot = await userRef.get();
      if (!snapshot.exists) return NextResponse.json({ error: 'User not found' }, { status: 404, headers: noStore });
      const devices = deviceTokens(snapshot.data()).length;
      await adminAuth.revokeRefreshTokens(uid);
      // Stop announcement pushes to these devices too (best effort; tokens are cleared below either way).
      try {
        await unsubscribeAllTopics(adminDb, adminMessaging, uid, snapshot.data());
      } catch {
        console.warn('[admin users] topic unsubscribe failed');
      }
      await userRef.set({ fcmTokens: [], ...(snapshot.data()?.fcmToken ? { fcmToken: null } : {}) }, { merge: true });
      await writeAdminAudit({
        ...actor, action: 'users.sign-out-all', target, summary: 'Signed out of every device and cleared push tokens',
        before: { devices }, after: { devices: 0 },
      });
      return NextResponse.json({ success: true }, { headers: noStore });
    }

    if (action === 'delete-account') {
      const snapshot = await userRef.get();
      if (!snapshot.exists) return NextResponse.json({ error: 'User not found' }, { status: 404, headers: noStore });
      const email = String(snapshot.data()?.email ?? '').trim().toLowerCase();
      const confirm = typeof body.confirmEmail === 'string' ? body.confirmEmail.trim().toLowerCase() : '';
      if (!email || confirm !== email) return badRequest("Type the student's email exactly to confirm.");
      // Queued first: anything left behind is finished by the daily follow-up job.
      const identity = await queueAccountDeletion(adminDb, uid, 'admin');
      const report = await deleteUserData(adminDb, uid, { identity });
      await adminRtdb.ref(`notif_counts/${uid}`).remove().catch(() => {});
      try {
        await adminAuth.deleteUser(uid);
      } catch (error) {
        if ((error as { code?: string })?.code !== 'auth/user-not-found') throw error;
      }
      await settleAccountDeletion(adminDb, uid, report).catch(() => console.warn('[admin users] could not settle the deletion queue entry'));
      await writeAdminAudit({
        ...actor, action: 'users.delete-account', target, summary: 'Deleted the account and its data',
        after: { deleted: report.deleted, truncated: report.truncated },
      });
      return NextResponse.json({ success: true, truncated: report.truncated }, { headers: noStore });
    }

    return badRequest('Invalid action');
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: error.status, headers: noStore });
    }
    console.error('Admin users POST failed');
    return NextResponse.json({ error: 'The change could not be completed.' }, { status: 500, headers: noStore });
  }
}