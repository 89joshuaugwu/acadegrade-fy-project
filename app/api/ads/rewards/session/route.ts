import { NextRequest, NextResponse } from 'next/server';
import { getVerifiedApiUser } from '@/lib/api/auth';
import { RewardError, rewards } from '@/lib/ads/reward';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
function failure(error: unknown) {
  if (error instanceof RewardError) return json({ error: error.message }, error.status);
  return json({ error: 'Reward service temporarily unavailable' }, 503);
}
export async function POST(request: NextRequest) {
  try {
    const user = await getVerifiedApiUser(request);
    if (!user) return json({ error: 'Unauthorized' }, 401);
    let body;
    try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
    return json(await rewards.createSession(user.uid, body?.platform));
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
