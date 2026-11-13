import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getVerifiedApiUser } from '@/lib/api/auth';
import { checkRateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import { adminDb } from '@/lib/firebase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const headers = { 'Cache-Control': 'no-store' };
const REPORT_WINDOWS = [{ name: 'daily', limit: 20, windowMs: 24 * 60 * 60 * 1000 }];

const reportSchema = z.object({
  feature: z.enum(['insights', 'forecast', 'whatif', 'ocr']),
  kind: z.enum(['report', 'helpful', 'not_helpful']),
  reason: z.enum(['inaccurate', 'offensive', 'unsafe', 'other']).optional(),
  note: z.string().trim().max(500).optional(),
  platform: z.enum(['web', 'android', 'ios']).optional(),
  // Accepted for forward compatibility; provider/model come from the saved result instead.
  provenanceId: z.string().max(128).optional(),
}).strict();

/** Provider and model of the user's saved result, where the server keeps one. Never the result. */
async function savedProvenance(uid: string, feature: string) {
  if (feature !== 'insights' && feature !== 'forecast') return { providerId: null, modelId: null };
  const analytics = (await adminDb.collection('analytics').doc(uid).get()).data();
  const provenance = feature === 'insights' ? analytics?.lastInsight?.provenance : analytics?.forecast?.provenance;
  const text = (value: unknown) => (typeof value === 'string' && value.length <= 128 ? value : null);
  return { providerId: text(provenance?.providerId), modelId: text(provenance?.modelId) };
}

/**
 * POST /api/ai/report
 * { feature: 'insights'|'forecast'|'whatif'|'ocr', kind: 'report'|'helpful'|'not_helpful',
 *   reason?: 'inaccurate'|'offensive'|'unsafe'|'other', note?: string (<=500), platform?: 'web'|'android'|'ios' }
 * -> { ok: true }. Stored in `_ai_feedback` with a hashed uid; no academic content.
 * Open during maintenance (harmless) and rate limited to 20 per day.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getVerifiedApiUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers });

    let body: unknown;
    try { body = await request.json(); } catch { body = null; }
    const parsed = reportSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Check the report and try again.' }, { status: 400, headers });

    const limit = await checkRateLimit(user.uid, 'ai_report', REPORT_WINDOWS);
    if (!limit.allowed) return rateLimitResponse(limit, 'You have sent a lot of feedback today. Please try again tomorrow.');

    const { feature, kind, reason, note, platform } = parsed.data;
    await adminDb.collection('_ai_feedback').doc().set({
      uidHash: createHash('sha256').update(user.uid).digest('hex'),
      feature,
      kind,
      reason: reason ?? null,
      note: note ? note : null,
      platform: platform ?? 'unknown',
      ...(await savedProvenance(user.uid, feature)),
      createdAt: new Date(),
    });
    return NextResponse.json({ ok: true }, { headers });
  } catch {
    console.error('AI feedback write failed');
    return NextResponse.json({ error: 'Unable to send feedback right now.' }, { status: 500, headers });
  }
}
