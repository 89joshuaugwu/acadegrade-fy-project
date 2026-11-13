import { NextRequest, NextResponse } from 'next/server';
import { getVerifiedApiUser } from '@/lib/api/auth';
import { checkRateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import { adminDb } from '@/lib/firebase/admin';
import { checkPlatformAccess } from '@/lib/platform/settings-server';
import { parseAnswers, RequirementError } from '@/lib/user/requirements';
import { applyRequirementAnswers, readLegal, requirementErrorResponse, requirementsBody, userNoStore } from '@/lib/user/requirements-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ANSWER_WINDOWS = [
  { name: 'hourly', limit: 20, windowMs: 60 * 60 * 1000 },
  { name: 'daily', limit: 60, windowMs: 24 * 60 * 60 * 1000 },
];

/** GET /api/user/requirements -> { items, checkedAt }. Read-only; open during maintenance. */
export async function GET(request: NextRequest) {
  try {
    const user = await getVerifiedApiUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: userNoStore });
    const [snapshot, legal] = await Promise.all([adminDb.collection('users').doc(user.uid).get(), readLegal()]);
    return NextResponse.json(requirementsBody(snapshot.data(), legal), { headers: userNoStore });
  } catch {
    console.error('Requirements read failed');
    return NextResponse.json({ error: 'Unable to load account requirements.' }, { status: 500, headers: userNoStore });
  }
}

/**
 * POST /api/user/requirements
 * { answers: { age?, terms?: { version }, privacy?: { version }, aiConsent?, marketingConsent? } }
 * -> { items, checkedAt } (the items still pending after saving)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getVerifiedApiUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: userNoStore });
    const blocked = await checkPlatformAccess({ email: user.email });
    if (blocked) return blocked;

    let body: unknown;
    try { body = await request.json(); } catch { body = null; }
    const answers = parseAnswers(body);

    const limit = await checkRateLimit(user.uid, 'user_requirements', ANSWER_WINDOWS);
    if (!limit.allowed) return rateLimitResponse(limit, 'Too many updates. Please try again later.');

    const { user: updated, legal } = await applyRequirementAnswers(user.uid, answers);
    return NextResponse.json(requirementsBody(updated, legal), { headers: userNoStore });
  } catch (error) {
    if (error instanceof RequirementError) return requirementErrorResponse(error);
    console.error('Requirements update failed');
    return NextResponse.json({ error: 'Unable to save your answers. Please try again.' }, { status: 500, headers: userNoStore });
  }
}
