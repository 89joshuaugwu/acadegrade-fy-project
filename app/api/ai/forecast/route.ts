import { NextRequest, NextResponse } from 'next/server';
import { computeForecast, getTrendDirection } from '@/lib/ai/forecast';
import { generateDeepInsight } from '@/lib/ai/manager';
import { adminDb } from '@/lib/firebase/admin';
import { logApiCall, apiTimer } from '@/lib/api/logger';
import { getVerifiedApiUser } from '@/lib/api/auth';
import { checkRateLimit, rateLimitResponse } from '@/lib/api/rate-limit';

const FORECAST_CACHE_MS = 60 * 60 * 1000;
const FORECAST_LIMITS = [
  { name: 'hourly', limit: 2, windowMs: 60 * 60 * 1000 },
  { name: 'daily', limit: 8, windowMs: 24 * 60 * 60 * 1000 },
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

  try {
    const verifiedUser = await getVerifiedApiUser(request);
    if (!verifiedUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    uid = verifiedUser.uid;

    const body = await request.json();
    const { piHistory, cgpaHistory, forceRegenerate = false } = body;

    if (!Array.isArray(piHistory) || !Array.isArray(cgpaHistory)) {
      return NextResponse.json({ error: 'PI and CGPA histories are required.' }, { status: 400 });
    }
    if (piHistory.length > 20 || cgpaHistory.length !== piHistory.length) {
      return NextResponse.json({ error: 'Academic histories are malformed or exceed 20 semesters.' }, { status: 400 });
    }
    if ([...piHistory, ...cgpaHistory].some((value) => !Number.isFinite(value) || value < 0 || value > 5)) {
      return NextResponse.json({ error: 'Academic history values must be numbers between 0 and 5.' }, { status: 400 });
    }

    if (piHistory.length === 0) {
      return NextResponse.json({
        slope: 0,
        projected: [0, 0],
        projectedPi: [0, 0],
        projectedCgpa: [0, 0],
        riskScore: 3,
        trendLabel: 'Not enough data yet',
        trendDirection: 'stable',
        lastUpdated: new Date(),
      });
    }

    const analyticsRef = adminDb.collection('analytics').doc(uid);
    const inputSignature = JSON.stringify({ piHistory, cgpaHistory });
    const analyticsSnapshot = await analyticsRef.get();
    const cachedForecast = analyticsSnapshot.data()?.forecast;
    const cachedAt = timestampMillis(cachedForecast?.lastUpdated);

    if (!forceRegenerate && cachedForecast?.inputSignature === inputSignature && cachedAt && Date.now() - cachedAt < FORECAST_CACHE_MS) {
      return NextResponse.json(cachedForecast, { headers: { 'X-AI-Cache': 'HIT' } });
    }

    const rateLimit = await checkRateLimit(uid, 'ai_forecast', FORECAST_LIMITS);
    if (!rateLimit.allowed) {
      logApiCall({ endpoint: '/api/ai/forecast', category: 'ai', uid, status: 429, durationMs: timer(), provider: 'deepseek', error: 'Per-user rate limit exceeded' });
      return rateLimitResponse(rateLimit, `Forecast limit reached. Try again in ${rateLimit.retryAfterSeconds} seconds.`);
    }

    const { slope, projected, projectedPi, projectedCgpa, riskScore } = computeForecast(piHistory, cgpaHistory);
    const trendDirection = getTrendDirection(slope);
    const prompt = `
      A student has an academic Performance Index (PI) trend.
      The recent slope of their performance is ${slope.toFixed(3)} (positive = improving, negative = declining).
      The direction is "${trendDirection}".
      Their PI history (out of 5.0) is: ${piHistory.join(', ')}.

      Write EXACTLY ONE concise, insightful phrase (under 5 words) to label this trend.
      Examples: "Steady & Upward", "Warning: Slight Decline", "Plateaued Performance", "Needs Urgent Attention".
      Do not use quotes in your response.
    `;

    const trendLabel = (await generateDeepInsight(prompt)).trim();
    const forecastData = {
      slope,
      projected,
      projectedPi,
      projectedCgpa,
      riskScore,
      trendLabel,
      trendDirection,
      lastUpdated: new Date(),
      inputSignature,
    };

    try {
      await analyticsRef.set({ forecast: forecastData }, { merge: true });

      if (riskScore >= 4) {
        const notifUrl = new URL('/api/notifications/send', request.url);
        await fetch(notifUrl.toString(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${verifiedUser.token}`,
          },
          body: JSON.stringify({
            uid,
            title: 'Academic Risk Alert ⚠️',
            message: 'Your recent trajectory indicates high academic risk. Check your insights for recommendations.',
            type: 'warning',
            event: 'aiInsights',
          }),
        }).catch((error) => console.error('Failed to trigger risk notification', error));
      }
    } catch (dbError) {
      console.error('Analytics write failed (non-fatal):', dbError);
    }

    logApiCall({ endpoint: '/api/ai/forecast', category: 'ai', uid, status: 200, durationMs: timer(), provider: 'deepseek' });
    return NextResponse.json(forecastData, {
      headers: {
        'X-RateLimit-Remaining': String(rateLimit.remaining),
        'X-AI-Cache': 'MISS',
      },
    });
  } catch (error: any) {
    console.error('Forecast route error:', error);
    logApiCall({ endpoint: '/api/ai/forecast', category: 'ai', uid, status: 500, durationMs: timer(), provider: 'deepseek', error: error?.message });
    return NextResponse.json({ error: error?.message || 'Failed to generate forecast' }, { status: 500 });
  }
}
