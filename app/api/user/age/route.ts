import { NextRequest, NextResponse } from 'next/server';
import { getVerifiedApiUser } from '@/lib/api/auth';
import { checkRateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import { checkPlatformAccess } from '@/lib/platform/settings-server';
import { RequirementError } from '@/lib/user/requirements';
import { ageSummary, applyRequirementAnswers, requirementErrorResponse, userNoStore } from '@/lib/user/requirements-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const AGE_WINDOWS = [
  { name: 'hourly', limit: 10, windowMs: 60 * 60 * 1000 },
  { name: 'daily', limit: 30, windowMs: 24 * 60 * 60 * 1000 },
];

/**
 * POST /api/user/age  { status: 'adult' | 'minor' } -> { ageStatus, aiAllowed }
 * Unknown -> either; minor -> adult records ageUpgradedAt; adult -> minor is 409.
 * Same value is an idempotent 200. A thin wrapper over the requirements answers.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getVerifiedApiUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: userNoStore });
    const blocked = await checkPlatformAccess({ email: user.email });
    if (blocked) return blocked;

    let body: unknown;
    try { body = await request.json(); } catch { body = null; }
    const status = body && typeof body === 'object' ? (body as { status?: unknown }).status : undefined;
    if (status !== 'adult' && status !== 'minor') {
      return NextResponse.json({ error: "Choose 'adult' or 'minor'.", code: 'INVALID_ANSWERS' }, { status: 400, headers: userNoStore });
    }

    const limit = await checkRateLimit(user.uid, 'user_age', AGE_WINDOWS);
    if (!limit.allowed) return rateLimitResponse(limit, 'Too many age updates. Please try again later.');

    const { user: updated } = await applyRequirementAnswers(user.uid, { age: status });
    return NextResponse.json(await ageSummary(updated), { headers: userNoStore });
  } catch (error) {
    if (error instanceof RequirementError) return requirementErrorResponse(error);
    console.error('Age update failed');
    return NextResponse.json({ error: 'Unable to save your age. Please try again.' }, { status: 500, headers: userNoStore });
  }
}
