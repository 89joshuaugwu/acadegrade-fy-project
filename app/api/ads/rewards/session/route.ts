import { NextRequest, NextResponse } from 'next/server';
import { getVerifiedApiUser } from '@/lib/api/auth';
import { RewardError, rewards } from '@/lib/ads/reward';
import { checkPlatformAccess } from '@/lib/platform/settings-server';
import { aiAgeGate } from '@/lib/user/age';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
function failure(error: unknown) {
  if (error instanceof RewardError) return json({ error: error.message, ...error.details }, error.status);
  return json({ error: 'Reward service temporarily unavailable' }, 503);
}
export async function POST(request: NextRequest) {
  try {
    const user = await getVerifiedApiUser(request);
    if (!user) return json({ error: 'Unauthorized' }, 401);
    const blocked = await checkPlatformAccess({ email: user.email });
    if (blocked) return blocked;
    let body;
    try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
    // Both coin and legacy refresh sessions pay for AI, so they need an AI-eligible adult.
    // Unknown reward types still reach createSession for its 400.
    if (body?.reward === undefined || body?.reward === null || body?.reward === 'coins') {
      const ageBlocked = await aiAgeGate(user.uid);
      if (ageBlocked) return ageBlocked;
    }
    // `reward: 'coins'` earns wallet coins; omitted keeps the legacy Written Analysis refresh session.
    return json(await rewards.createSession(user.uid, body?.platform, body?.reward));
  } catch (error) { return failure(error); }
}
export async function GET(request: NextRequest) {
  try {
    const user = await getVerifiedApiUser(request);
    if (!user) return json({ error: 'Unauthorized' }, 401);
    return json(await rewards.status(user.uid, request.nextUrl.searchParams.get('sessionId') ?? ''));
  } catch (error) { return failure(error); }
}
export async function DELETE(request: NextRequest) {
  try {
    const user = await getVerifiedApiUser(request);
    if (!user) return json({ error: 'Unauthorized' }, 401);
    return json(await rewards.cancel(user.uid, request.nextUrl.searchParams.get('sessionId') ?? ''));
  } catch (error) { return failure(error); }
}
