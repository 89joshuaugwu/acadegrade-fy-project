import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { getVerifiedApiUser } from '@/lib/api/auth';
import { checkRateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import { checkPlatformAccess } from '@/lib/platform/settings-server';
import {
  SUPPORT_STUDENT_LIST_LIMIT, SupportValidationError, parseSupportTicket, studentTicketView,
} from '@/lib/support/tickets';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const headers = { 'Cache-Control': 'private, no-store' };
const WINDOWS = [
  { name: 'hourly', limit: 3, windowMs: 60 * 60 * 1000 },
  { name: 'daily', limit: 10, windowMs: 24 * 60 * 60 * 1000 },
];

/**
 * POST /api/support/tickets (bearer)
 *   { category: 'bug'|'account'|'grades'|'ai'|'ads'|'privacy'|'other', message: 10-2000 chars,
 *     platform: 'web'|'android', appVersion?: ≤ 32 chars, route?: ≤ 120 chars }
 *   -> 201 { ticketId } | 400 { error } | 401 | 429 (3/hour, 10/day) | 503 { code: 'FEATURE_DISABLED', feature: 'support' }
 * Open to minors and during maintenance.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getVerifiedApiUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers });
    const blocked = await checkPlatformAccess({ feature: 'support', maintenance: false });
    if (blocked) return blocked;

    let input;
    try {
      input = parseSupportTicket(await request.json().catch(() => null));
    } catch (error) {
      if (error instanceof SupportValidationError) return NextResponse.json({ error: error.message }, { status: 400, headers });
      throw error;
    }

    const limit = await checkRateLimit(user.uid, 'support_ticket', WINDOWS);
    if (!limit.allowed) return rateLimitResponse(limit, 'You have sent several requests already. Please wait before sending another.');

    const profile = (await adminDb.collection('users').doc(user.uid).get()).data() ?? {};
    const now = new Date();
    const ref = adminDb.collection('support_tickets').doc();
    await ref.set({
      uid: user.uid,
      email: typeof profile.email === 'string' && profile.email ? profile.email : user.email ?? null,
      name: typeof profile.fullName === 'string' && profile.fullName ? profile.fullName : null,
      ...input,
      status: 'open',
      createdAt: now,
      updatedAt: now,
      closedAt: null,
      purgeAt: null,
      replies: [],
    });
    return NextResponse.json({ ticketId: ref.id }, { status: 201, headers });
  } catch {
    console.error('Support ticket create failed');
    return NextResponse.json({ error: 'Your request could not be sent. Please try again.' }, { status: 500, headers });
  }
}

/** GET /api/support/tickets (bearer) -> { tickets } — the caller's 20 newest requests. */
export async function GET(request: NextRequest) {
  try {
    const user = await getVerifiedApiUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers });
    const snapshot = await adminDb.collection('support_tickets')
      .where('uid', '==', user.uid)
      .orderBy('createdAt', 'desc')
      .limit(SUPPORT_STUDENT_LIST_LIMIT)
      .get();
    return NextResponse.json({ tickets: snapshot.docs.map((doc) => studentTicketView(doc.id, doc.data())) }, { headers });
  } catch {
    console.error('Support ticket list failed');
    return NextResponse.json({ error: 'Your requests could not be loaded.' }, { status: 500, headers });
  }
}
