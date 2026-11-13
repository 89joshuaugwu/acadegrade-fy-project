import { NextRequest, NextResponse } from 'next/server';
import { getVerifiedApiUser } from '@/lib/api/auth';
import { coins, rewards } from '@/lib/ads/reward';
import { getUsageSummary } from '@/lib/usage/server';
import { getAiEligibility } from '@/lib/user/age';

const headers = { 'Cache-Control': 'private, no-store' };

// Read-only: never creates sessions, sweeps holds or increments counters.
export async function GET(request: NextRequest) {
  try {
    const user = await getVerifiedApiUser(request);
    if (!user?.uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers });
    const [summary, writtenRewards, wallet, eligibility] = await Promise.all([
      getUsageSummary(user.uid), rewards.dailySummary(user.uid), coins.summary(user.uid), getAiEligibility(user.uid),
    ]);
    // When AI is not allowed (age or consent), coins can be neither earned nor spent.
    const aiAllowed = eligibility.aiAllowed;
    const coin = (value: { enabled: boolean } | null | undefined) => (value ? (aiAllowed ? value : { ...value, enabled: false }) : null);
    return NextResponse.json({
      ...summary,
      features: summary.features.map(feature => ({ ...feature, coin: coin(wallet.features[feature.id]) })),
      writtenRewards,
      coins: coin(wallet.coins),
      age: { status: eligibility.status, aiAllowed, aiConsent: eligibility.aiConsent },
    }, { headers });
  } catch {
    return NextResponse.json({ error: 'Unable to load usage.' }, { status: 500, headers });
  }
}
