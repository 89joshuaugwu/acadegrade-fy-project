import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminMessaging } from '@/lib/firebase/admin';
import { getVerifiedApiUser } from '@/lib/api/auth';
import { checkRateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import { syncUserTopics } from '@/lib/notifications/topics';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const headers = { 'Cache-Control': 'private, no-store' };
const WINDOWS = [{ name: 'hourly', limit: 20, windowMs: 60 * 60 * 1000 }];

/**
 * POST /api/notifications/topics (bearer, no body)
 * Re-syncs the caller's announcement topic subscriptions from the tokens and
 * profile already stored on the server. Call it after registering a push token
 * and after a university, level or "admin broadcasts" preference change.
 * -> 200 { topics: string[], changed: boolean } | 401 | 429 | 500
 * Clients must treat any failure as harmless (fail open); the daily job catches up.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getVerifiedApiUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers });
    const limit = await checkRateLimit(user.uid, 'notification_topics', WINDOWS);
    if (!limit.allowed) return rateLimitResponse(limit, 'Notification settings were updated recently. Try again later.');
    const result = await syncUserTopics(adminDb, adminMessaging, user.uid);
    const profile = (await adminDb.collection('users').doc(user.uid).get()).data();
    return NextResponse.json({ topics: Array.isArray(profile?.fcmTopics) ? profile.fcmTopics : [], changed: result.changed }, { headers });
  } catch {
    console.error('Topic sync failed');
    return NextResponse.json({ error: 'Notification topics could not be updated.' }, { status: 500, headers });
  }
}
