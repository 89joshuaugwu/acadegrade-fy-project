import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { AdminAuthorizationError, requireAdmin } from '@/lib/api/admin-auth';
import { WalletState, walletRef } from '@/lib/ads/reward/coins';
import { getUsageSummary } from '@/lib/usage/server';
import { currentAnswers } from '@/lib/user/requirements';
import { toMillis } from '@/lib/admin/metrics';
import { deviceTokens } from '@/lib/admin/user-devices';
import { resolveGradingScale } from '@/lib/cgpa/academicRules';

export const dynamic = 'force-dynamic';

const headers = { 'Cache-Control': 'private, no-store' };
const LEDGER_LIMIT = 50;
const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');
const toIso = (value: unknown) => {
  const ms = toMillis(value);
  return ms === null ? null : new Date(ms).toISOString();
};
const text = (value: unknown) => (typeof value === 'string' && value.trim() ? value : null);

/**
 * GET /api/admin/users/[uid] — one student's account for the Users drawer.
 * Grades are deliberately absent: use POST /api/admin/users { action: 'reveal-grades' }
 * with a reason, which is audited.
 */
export async function GET(request: Request, { params }: { params: Promise<{ uid: string }> }) {
  try {
    await requireAdmin(request);
    const { uid: raw } = await params;
    const uid = decodeURIComponent(raw ?? '').trim();
    if (!uid || uid.length > 128 || uid.includes('/')) return NextResponse.json({ error: 'Invalid uid' }, { status: 400, headers });

    const userRef = adminDb.collection('users').doc(uid);
    const snapshot = await userRef.get();
    if (!snapshot.exists) return NextResponse.json({ error: 'User not found' }, { status: 404, headers });
    const data = (snapshot.data() ?? {}) as Record<string, unknown>;
    const answers = currentAnswers(data);

    const [semesters, usage, walletSnap, ledgerSnap] = await Promise.all([
      userRef.collection('semesters').get(),
      getUsageSummary(uid),
      walletRef(adminDb, uid).get(),
      adminDb.collection('_coin_ledger').where('uidHash', '==', sha256(uid)).orderBy('at', 'desc').limit(LEDGER_LIMIT).get(),
    ]);
    const wallet = new WalletState(walletSnap.data() as ConstructorParameters<typeof WalletState>[0], Date.now());

    return NextResponse.json({
      profile: {
        uid,
        fullName: text(data.fullName),
        email: text(data.email),
        matric: text(data.matric),
        university: text(data.university),
        department: text(data.department),
        programme: text(data.programme),
        currentLevel: typeof data.currentLevel === 'number' ? data.currentLevel : null,
        createdAt: toIso(data.createdAt),
        lastActiveAt: toIso(data.lastActiveAt),
        disabled: data.disabled === true,
        ageStatus: answers.ageStatus,
        aiConsent: answers.aiConsent,
        marketingConsent: answers.marketingConsent,
        // Read-only: the scale's name (5-point when none is stored).
        gradingScale: resolveGradingScale(data.gradingScale).name,
      },
      academic: {
        semesterCount: semesters.size,
        completedCount: semesters.docs.filter((doc) => doc.data()?.isComplete === true).length,
      },
      devices: { count: deviceTokens(data).length },
      usage,
      coins: {
        balance: wallet.balance,
        earnedToday: wallet.earnedToday,
        // Session and request ids are internal; only what support needs to explain a balance.
        ledger: ledgerSnap.docs.map((doc) => {
          const entry = doc.data();
          return {
            type: entry.type,
            amount: entry.amount,
            ...(entry.feature ? { feature: entry.feature } : {}),
            at: toIso(entry.at),
            balanceAfter: entry.balanceAfter,
          };
        }),
      },
    }, { headers });
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: error.status, headers });
    }
    console.error('Admin user detail failed');
    return NextResponse.json({ error: 'Unable to load this account.' }, { status: 500, headers });
  }
}
