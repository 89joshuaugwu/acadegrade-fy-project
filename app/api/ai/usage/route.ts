import { NextRequest, NextResponse } from 'next/server';
import { getVerifiedApiUser } from '@/lib/api/auth';
import { rewards } from '@/lib/ads/reward';
import { getUsageSummary } from '@/lib/usage/server';

const headers = { 'Cache-Control': 'private, no-store' };

export async function GET(request: NextRequest) {
  try {
    const user = await getVerifiedApiUser(request);
    if (!user?.uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers });
    const [summary, writtenRewards] = await Promise.all([getUsageSummary(user.uid), rewards.dailySummary(user.uid)]);
    return NextResponse.json({ ...summary, writtenRewards }, { headers });
  } catch {
    return NextResponse.json({ error: 'Unable to load usage.' }, { status: 500, headers });
  }
}
