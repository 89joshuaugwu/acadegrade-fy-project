import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { AdminAuthorizationError, requireAdmin } from '@/lib/api/admin-auth';

export const dynamic = 'force-dynamic';

const headers = { 'Cache-Control': 'private, no-store' };
const DEFAULT_DAYS = 30;
const MAX_DAYS = 90;
const ROW_LIMIT = 5000;
const REPORT_LIST = 50;

type Counts = { helpful: number; notHelpful: number; reports: number };
const empty = (): Counts => ({ helpful: 0, notHelpful: 0, reports: 0 });

function toMs(value: unknown): number {
  if (value instanceof Date) return value.getTime();
  if (value && typeof (value as { toDate?: unknown }).toDate === 'function') return (value as { toDate: () => Date }).toDate().getTime();
  return 0;
}
const text = (value: unknown, max: number) => (typeof value === 'string' ? value.slice(0, max) : null);

/**
 * GET /api/admin/ai/feedback?days=30 (admin). Aggregates `_ai_feedback` by feature, provider/model and reason.
 * A "Not helpful" rating is one row without a reason; a reason chip afterwards is a second not_helpful row WITH
 * a reason, counted only under `notHelpfulReasons` so the rating is never double counted.
 * Notes are returned only for `report` rows (the newest 50); never the student's uidHash.
 */
export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const asked = Number.parseInt(new URL(request.url).searchParams.get('days') ?? '', 10);
    const days = Number.isFinite(asked) ? Math.min(Math.max(asked, 1), MAX_DAYS) : DEFAULT_DAYS;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const snap = await adminDb.collection('_ai_feedback').where('createdAt', '>=', since).limit(ROW_LIMIT).get();

    const byFeature: Record<string, Counts> = {};
    const models = new Map<string, Counts & { providerId: string; modelId: string }>();
    const notHelpfulReasons: Record<string, number> = {};
    const reports: { feature: string; reason: string | null; note: string | null; platform: string; providerId: string | null; modelId: string | null; createdAt: string }[] = [];
    let total = 0;

    for (const doc of snap.docs) {
      const d = doc.data() as Record<string, unknown>;
      const kind = d.kind;
      if (kind !== 'helpful' && kind !== 'not_helpful' && kind !== 'report') continue;
      const feature = text(d.feature, 24) ?? 'unknown';
      if (kind === 'not_helpful' && d.reason) {
        const reason = text(d.reason, 24) ?? 'other';
        notHelpfulReasons[reason] = (notHelpfulReasons[reason] ?? 0) + 1;
        continue;
      }
      total += 1;
      const field: keyof Counts = kind === 'helpful' ? 'helpful' : kind === 'not_helpful' ? 'notHelpful' : 'reports';
      (byFeature[feature] ??= empty())[field] += 1;
      const providerId = text(d.providerId, 64);
      const modelId = text(d.modelId, 128);
      if (providerId && modelId) {
        const entry = models.get(`${providerId}/${modelId}`) ?? { providerId, modelId, ...empty() };
        entry[field] += 1;
        models.set(`${providerId}/${modelId}`, entry);
      }
      if (kind === 'report') {
        reports.push({
          feature, reason: text(d.reason, 24), note: text(d.note, 500), platform: text(d.platform, 16) ?? 'unknown',
          providerId, modelId, createdAt: new Date(toMs(d.createdAt)).toISOString(),
        });
      }
    }

    const byModel = [...models.values()].map((entry) => {
      const rated = entry.helpful + entry.notHelpful;
      return { ...entry, helpfulRate: rated ? entry.helpful / rated : null };
    }).sort((a, b) => (b.helpful + b.notHelpful + b.reports) - (a.helpful + a.notHelpful + a.reports));
    reports.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return NextResponse.json({
      days, total, truncated: snap.size >= ROW_LIMIT, byFeature, byModel, notHelpfulReasons, reports: reports.slice(0, REPORT_LIST),
    }, { headers });
  } catch (error) {
    if (error instanceof AdminAuthorizationError) return NextResponse.json({ error: error.message }, { status: error.status, headers });
    console.error('Admin AI feedback stats failed');
    return NextResponse.json({ error: 'Unable to load feedback.' }, { status: 500, headers });
  }
}
