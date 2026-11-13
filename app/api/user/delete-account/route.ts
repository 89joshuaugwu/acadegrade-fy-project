import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb, adminRtdb } from '@/lib/firebase/admin';
import { logApiCall, apiTimer } from '@/lib/api/logger';
import { deleteUserData } from '@/lib/user/account-deletion';

/**
 * POST /api/user/delete-account
 *
 * Fully deletes a student's account. Requires a fresh ID token
 * (checkRevoked = true), then:
 *   1. deletes every Firestore document found for the user (see
 *      lib/user/account-deletion.ts for the full list: profile, semesters and
 *      courses, notifications, analytics, share codes, shared transcripts,
 *      coin wallet/ledger/requests, reward sessions/tombstones/daily counters,
 *      AI feedback, api_logs, rate-limit counters, the matric reservation,
 *      OTP and registration-ticket leftovers) and the Cloudinary avatar;
 *   2. removes the RTDB unread-notification counter;
 *   3. deletes the Firebase Auth user.
 *
 * Maintenance mode does not block deletion (a data-subject right).
 * The response shape `{ success: true }` is unchanged for installed apps.
 */
export async function POST(request: NextRequest) {
  const timer = apiTimer();

  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    // checkRevoked=true so a stale/older token can't be replayed to trigger
    // a deletion after the user has already re-authenticated and moved on.
    const decoded = await adminAuth.verifyIdToken(token, true);
    const uid = decoded.uid;

    const report = await deleteUserData(adminDb, uid);
    if (report.truncated.length) {
      // Collection names only: never the uid.
      console.warn('[account deletion] page bound reached; documents remain in', report.truncated);
    }
    if (report.avatar === 'failed') console.warn('[account deletion] Cloudinary avatar delete failed');

    await adminRtdb.ref(`notif_counts/${uid}`).remove().catch(() => {});
    await adminAuth.deleteUser(uid);

    // Logged without the uid: this record must not re-create personal data.
    logApiCall({ endpoint: '/api/user/delete-account', category: 'auth', uid: null, status: 200, durationMs: timer() });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Account deletion failed:', error?.code ?? 'unknown');
    if (typeof error?.code === 'string' && error.code.startsWith('auth/')) {
      return NextResponse.json({ error: 'Please sign in again, then retry deleting your account.' }, { status: 401 });
    }
    logApiCall({
      endpoint: '/api/user/delete-account',
      category: 'auth',
      uid: null,
      status: 500,
      durationMs: timer(),
      error: error?.message || 'Unknown error',
    });
    return NextResponse.json(
      { error: 'Failed to delete account. Please try again or contact support.' },
      { status: 500 }
    );
  }
}
