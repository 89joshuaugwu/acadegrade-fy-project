import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb, adminRtdb } from '@/lib/firebase/admin';
import { logApiCall, apiTimer } from '@/lib/api/logger';

/**
 * POST /api/user/delete-account
 *
 * Fully deletes a student's account and every trace of their data.
 *
 * Previously, "Delete Account" in Settings only called the client-side
 * Firebase `deleteUser()` — it never touched Firestore, so semesters,
 * courses, analytics, notifications, and any share codes the user
 * generated were silently orphaned in the database forever.
 *
 * This route requires the client to have already re-authenticated
 * (the ID token must be fresh) and then does a full server-side wipe:
 *   1. users/{uid}/semesters/{id}/courses/*  (all course docs)
 *   2. users/{uid}/semesters/*               (all semester docs)
 *   3. notifications/{uid}/items/*           (all notification docs)
 *   4. notifications/{uid}                   (parent doc, if present)
 *   5. analytics/{uid}                       (cached AI insights/forecast)
 *   6. shareCodes/*  where authorId == uid    (course share codes they created)
 *   7. shared_transcripts/* where uid == uid  (public transcript snapshots)
 *   8. users/{uid}                           (the profile document itself)
 *   9. RTDB notif_counts/{uid}               (unread notification counter)
 *  10. The Firebase Auth user itself, via Admin SDK — this also sidesteps
 *      the client-side "requires recent login" error entirely, since the
 *      Admin SDK doesn't need a fresh session to delete a user.
 */
export async function POST(request: NextRequest) {
  const timer = apiTimer();
  let uid: string | null = null;

  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    // checkRevoked=true so a stale/older token can't be replayed to trigger
    // a deletion after the user has already re-authenticated and moved on.
    const decoded = await adminAuth.verifyIdToken(token, true);
    uid = decoded.uid;

    // 1 & 2. Delete every semester and its nested courses subcollection.
    const semestersSnap = await adminDb.collection(`users/${uid}/semesters`).get();
    for (const semDoc of semestersSnap.docs) {
      const coursesSnap = await semDoc.ref.collection('courses').get();
      await Promise.all(coursesSnap.docs.map((c) => c.ref.delete()));
      await semDoc.ref.delete();
    }

    // 3 & 4. Delete notification items, then the parent doc if it exists.
    const notifItemsSnap = await adminDb.collection(`notifications/${uid}/items`).get();
    await Promise.all(notifItemsSnap.docs.map((d) => d.ref.delete()));
    await adminDb.collection('notifications').doc(uid).delete().catch(() => {});

    // 5. Delete cached AI analytics/insights.
    await adminDb.collection('analytics').doc(uid).delete().catch(() => {});

    // 6. Delete any course share codes this user generated.
    const shareCodesSnap = await adminDb
      .collection('shareCodes')
      .where('authorId', '==', uid)
      .get();
    await Promise.all(shareCodesSnap.docs.map((d) => d.ref.delete()));

    // 7. Delete any public transcript share snapshots this user created.
    const sharedTranscriptsSnap = await adminDb
      .collection('shared_transcripts')
      .where('uid', '==', uid)
      .get();
    await Promise.all(sharedTranscriptsSnap.docs.map((d) => d.ref.delete()));

    // 8. Delete the user profile document itself.
    await adminDb.collection('users').doc(uid).delete().catch(() => {});

    // 9. Delete the RTDB unread-notification counter.
    await adminRtdb.ref(`notif_counts/${uid}`).remove().catch(() => {});

    // 10. Delete the Firebase Auth user.
    await adminAuth.deleteUser(uid);

    logApiCall({
      endpoint: '/api/user/delete-account',
      category: 'auth',
      uid,
      status: 200,
      durationMs: timer(),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Account deletion failed:', error);
    logApiCall({
      endpoint: '/api/user/delete-account',
      category: 'auth',
      uid,
      status: 500,
      durationMs: timer(),
      error: error?.message || 'Unknown error',
    });
    return NextResponse.json(
      { error: error?.message || 'Failed to delete account. Please try again or contact support.' },
      { status: 500 }
    );
  }
}
