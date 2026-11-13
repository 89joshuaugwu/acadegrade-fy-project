import { NextRequest, NextResponse } from 'next/server';
import { RewardError, rewards } from '@/lib/ads/reward';
import { verifyRewardCallback } from '@/lib/ads/reward/ssv';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  const headers = { 'Cache-Control': 'no-store' };
  try {
    // Do not reconstruct the query: Google signs its original encoded bytes.
    const callback = await verifyRewardCallback(request.url);
    return NextResponse.json({ verified: true, ...await rewards.grant(callback) }, { headers });
  } catch (error) {
    // Reason only (no query, ids or signature) so a rejected AdMob callback is diagnosable in Vercel logs.
    console.warn('[ssv] callback rejected:', error instanceof Error ? error.message : 'unknown error');
    return NextResponse.json({ error: error instanceof RewardError ? error.message : 'SSV verification unavailable' }, {
      status: error instanceof RewardError ? error.status : 503, headers,
    });
  }
}
