import { NextRequest, NextResponse } from 'next/server';
import { generateDeepInsightJSON } from '@/lib/ai/manager';
import { adminDb } from '@/lib/firebase/admin';
import { logApiCall, apiTimer } from '@/lib/api/logger';
import { getVerifiedApiUser } from '@/lib/api/auth';
import { checkRateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import type { InsightResponse } from '@/types/ai';

const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
const INSIGHT_LIMITS = [
  { name: 'hourly', limit: 2, windowMs: 60 * 60 * 1000 },
  { name: 'daily', limit: 3, windowMs: TWENTY_FOUR_HOURS_MS },
];

function timestampMillis(value: any): number {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.toDate === 'function') return value.toDate().getTime();
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

export async function POST(request: NextRequest) {
  const timer = apiTimer();
  let uid: string | null = null;
  let analyticsData: any = null;

  try {
    const verifiedUser = await getVerifiedApiUser(request);
    if (!verifiedUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    uid = verifiedUser.uid;

    const body = await request.json();
    const { forceRegenerate = false, semesterData } = body;
    if (!Array.isArray(semesterData) || semesterData.length > 20 || JSON.stringify(semesterData).length > 100_000) {
      return NextResponse.json({ error: 'Semester data is missing or exceeds the supported size.' }, { status: 400 });
    }

    const rawAcademicContext = body.academicContext;
    const academicContext = rawAcademicContext && typeof rawAcademicContext === 'object'
      ? {
          remainingSemesters: Math.max(0, Math.min(20, Number(rawAcademicContext.remainingSemesters) || 0)),
          isGraduated: rawAcademicContext.isGraduated === true,
          graduationSession: typeof rawAcademicContext.graduationSession === 'string'
            ? rawAcademicContext.graduationSession.slice(0, 20)
            : undefined,
        }
      : undefined;
    const inputSignature = JSON.stringify({ semesterData, academicContext });

    const analyticsRef = adminDb.collection('analytics').doc(uid);
    const analyticsDoc = await analyticsRef.get();
    analyticsData = analyticsDoc.data();
    const lastCallMs = timestampMillis(analyticsData?.lastInsight?.timestamp);
    const ageMs = lastCallMs ? Date.now() - lastCallMs : Number.POSITIVE_INFINITY;

    // Normal loads use the last known result for 24 hours without consuming provider quota.
    if (!forceRegenerate && analyticsData?.lastInsight?.data && analyticsData?.lastInsight?.inputSignature === inputSignature && ageMs < TWENTY_FOUR_HOURS_MS) {
      return NextResponse.json(analyticsData.lastInsight.data, { headers: { 'X-AI-Cache': 'HIT' } });
    }

    // A forced refresh can never bypass the strict 12-hour per-user generation boundary.
    if (forceRegenerate && analyticsData?.lastInsight?.data && ageMs < TWELVE_HOURS_MS) {
      const retryAfterSeconds = Math.max(1, Math.ceil((TWELVE_HOURS_MS - ageMs) / 1000));
      logApiCall({ endpoint: '/api/ai/insights', category: 'ai', uid, status: 429, durationMs: timer(), provider: 'deepseek', error: '12-hour regeneration cooldown' });
      return NextResponse.json(
        { error: 'Please wait at least 12 hours before regenerating.', retryAfterSeconds },
        { status: 429, headers: { 'Retry-After': String(retryAfterSeconds), 'Cache-Control': 'no-store' } },
      );
    }

    const rateLimit = await checkRateLimit(uid, 'ai_insights', INSIGHT_LIMITS);
    if (!rateLimit.allowed) {
      logApiCall({ endpoint: '/api/ai/insights', category: 'ai', uid, status: 429, durationMs: timer(), provider: 'deepseek', error: 'Per-user rate limit exceeded' });
      return rateLimitResponse(rateLimit, `Written Analysis limit reached. Try again in ${rateLimit.retryAfterSeconds} seconds.`);
    }

    const settingsDoc = await adminDb.collection('config').doc('settings').get();
    const basePrompt = settingsDoc.data()?.aiSystemPrompt || 'You are an expert academic advisor at a top Nigerian University.';
    const prompt = `
      ${basePrompt}

      Analyze the following student data and provide a structured JSON response.

      Student Data:
      ${JSON.stringify(semesterData)}

      Academic Timeline:
      ${academicContext
        ? `${academicContext.remainingSemesters} semester(s) remain. Graduation session: ${academicContext.graduationSession || 'not provided'}. Programme complete: ${academicContext.isGraduated ? 'yes' : 'no'}.`
        : 'Timeline details were not provided.'}

      ${academicContext?.isGraduated
        ? 'This student has completed every planned semester. Provide a final academic review; do not predict or invent future semesters.'
        : academicContext
          ? `Keep all recommendations and trajectory statements within the ${academicContext.remainingSemesters} remaining semester(s). Do not project beyond graduation.`
          : ''}

      Return EXACTLY this JSON structure, and nothing else (no markdown blocks, no formatting around it):
      {
        "strengths": ["string", "string"],
        "concerns": ["string", "string"],
        "recommendations": ["string", "string"],
        "degreeOutlook": "string paragraph explaining their current trajectory"
      }
    `;

    const insightData = await generateDeepInsightJSON<InsightResponse>(prompt);
    await analyticsRef.set({
      lastInsight: { timestamp: new Date(), data: insightData, inputSignature },
      insightsStale: false,
    }, { merge: true });

    logApiCall({ endpoint: '/api/ai/insights', category: 'ai', uid, status: 200, durationMs: timer(), provider: 'deepseek' });
    return NextResponse.json(insightData, {
      headers: {
        'X-RateLimit-Remaining': String(rateLimit.remaining),
        'X-AI-Cache': 'MISS',
      },
    });
  } catch (error: any) {
    console.error('Insights Error:', error);
    logApiCall({ endpoint: '/api/ai/insights', category: 'ai', uid, status: 500, durationMs: timer(), provider: 'deepseek', error: error?.message });

    if (error?.message?.includes('429')) {
      return NextResponse.json({ error: 'AI quota temporarily reached. Please try again later.' }, { status: 429 });
    }
    if (analyticsData?.lastInsight?.data) {
      return NextResponse.json({
        ...analyticsData.lastInsight.data,
        stale: true,
        staleMessage: 'Showing your last saved insight — live generation is temporarily unavailable.',
      });
    }
    return NextResponse.json({ error: 'Failed to generate insights' }, { status: 500 });
  }
}
