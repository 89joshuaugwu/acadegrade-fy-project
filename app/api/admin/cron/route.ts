import { NextResponse } from 'next/server';
import { FieldPath } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/admin';
import { AdminAuthorizationError, requireAdmin } from '@/lib/api/admin-auth';

export const dynamic = 'force-dynamic';

const headers = { 'Cache-Control': 'private, no-store' };

const toIso = (value: unknown): string | null => {
  const withToDate = value as { toDate?: () => Date } | null;
  const date = withToDate && typeof withToDate.toDate === 'function' ? withToDate.toDate() : value instanceof Date ? value : null;
  return date && Number.isFinite(date.getTime()) ? date.toISOString() : null;
};

/** The most recent daily-job run, so the admin Overview can warn when jobs have stopped. */
export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    // Document ids are YYYY-MM-DD, so ordering by id gives the newest first.
    const snapshot = await adminDb.collection('_cron_runs').orderBy(FieldPath.documentId(), 'desc').limit(1).get();
    if (snapshot.empty) return NextResponse.json({ lastRun: null }, { headers });
    const doc = snapshot.docs[0];
    const data = doc.data();
    return NextResponse.json({
      lastRun: { date: doc.id, finishedAt: toIso(data.finishedAt), results: data.results ?? {} },
    }, { headers });
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: error.status, headers });
    }
    return NextResponse.json({ error: 'Unable to read the daily job status.' }, { status: 500, headers });
  }
}
