import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getVerifiedApiUser } from '@/lib/api/auth';
import { coins } from '@/lib/ads/reward';
import { adminDb } from '@/lib/firebase/admin';
import { getAiEligibility } from '@/lib/user/age';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const headers = { 'Cache-Control': 'private, no-store' };
const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 100;

const toMs = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (value instanceof Date) return value.getTime();
  if (value && typeof (value as { toMillis?: unknown }).toMillis === 'function') return (value as { toMillis: () => number }).toMillis();
  return null;
};

/**
 * GET /api/coins/history?limit=30 (signed in; default 30, max 100)
 * -> { entries: { type: 'earn'|'spend'|'refund'|'grant', amount, feature?, at: ISO, balanceAfter }[], balance }
 * Newest first, the caller's own ledger only. Session ids, request ids and admin emails are never returned.
 * Accounts that may not use AI (minors, no consent) get `{ entries: [], balance: 0 }`: coins are never offered to them.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getVerifiedApiUser(request);
    if (!user?.uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers });
    const asked = Number.parseInt(new URL(request.url).searchParams.get('limit') ?? '', 10);
    const limit = Number.isFinite(asked) ? Math.min(Math.max(asked, 1), MAX_LIMIT) : DEFAULT_LIMIT;

    if (!(await getAiEligibility(user.uid)).aiAllowed) return NextResponse.json({ entries: [], balance: 0 }, { headers });

    const uidHash = createHash('sha256').update(user.uid).digest('hex');
    const [snapshot, balance] = await Promise.all([
      adminDb.collection('_coin_ledger').where('uidHash', '==', uidHash).orderBy('at', 'desc').limit(limit).get(),
      coins.balance(user.uid),
    ]);
    const entries = snapshot.docs.flatMap((doc) => {
      const entry = doc.data() as Record<string, unknown>;
      const at = toMs(entry.at);
      if (at === null || typeof entry.type !== 'string') return [];
      return [{
        type: entry.type,
        amount: entry.amount,
        ...(typeof entry.feature === 'string' ? { feature: entry.feature } : {}),
        at: new Date(at).toISOString(),
        balanceAfter: entry.balanceAfter,
      }];
    });
    return NextResponse.json({ entries, balance }, { headers });
  } catch {
    return NextResponse.json({ error: 'Unable to load coin history.' }, { status: 500, headers });
  }
}
