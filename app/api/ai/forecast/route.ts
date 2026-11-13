import { NextRequest, NextResponse } from 'next/server';
import { computeForecast, getTrendDirection } from '@/lib/ai/forecast';
import { generateForecastResponseWithMetadata, getAiConfigRevision } from '@/lib/ai/manager';
import { adminDb } from '@/lib/firebase/admin';
import { logApiCall, apiTimer } from '@/lib/api/logger';
import { getVerifiedApiUser } from '@/lib/api/auth';
import { checkRateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import { resolveFeatureWindows } from '@/lib/usage/server';
import { coins, RewardError, type CoinHold } from '@/lib/ads/reward';
import { checkPlatformAccess } from '@/lib/platform/settings-server';
import { getAiEligibility } from '@/lib/user/age';
import { chargedFailureResponse, chargedHeaders, freeCoinHeaders, readCoinSpend, refundQuietly, rewardErrorResponse, withCoinHint } from '@/lib/ads/reward/http';

const FORECAST_CACHE_MS = 60 * 60 * 1000;
/** Fixed, non-AI labels for users who cannot use AI (minors, no consent). */
const LOCAL_TREND_LABELS = { improving: 'Steady improvement', declining: 'Declining trend', stable: 'Stable performance' } as const;

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
  let hold: CoinHold | undefined;
  let charged = false;

  try {
    const verifiedUser = await getVerifiedApiUser(request);
    if (!verifiedUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    uid = verifiedUser.uid;
    const blocked = await checkPlatformAccess({ feature: 'ai_forecast', email: verifiedUser.email });
    if (blocked) return blocked;

    const body = await request.json();
    const { piHistory, cgpaHistory, forceRegenerate = false } = body;
    const coinRequestId = readCoinSpend(body);

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
      }, { headers: freeCoinHeaders(coinRequestId) });
    }

    // Restricted users still get the mathematical forecast, with a fixed label:
    // no provider call, no limiter use, no coins and nothing cached.
    const eligibility = await getAiEligibility(uid);
    if (!eligibility.aiAllowed) {
      const { slope, projected, projectedPi, projectedCgpa, riskScore } = computeForecast(piHistory, cgpaHistory);
      const trendDirection = getTrendDirection(slope);
      return NextResponse.json({
        slope, projected, projectedPi, projectedCgpa, riskScore,
        trendLabel: LOCAL_TREND_LABELS[trendDirection],
        trendDirection,
        lastUpdated: new Date(),
        aiEnhanced: false,
      }, { headers: { 'Cache-Control': 'no-store', ...freeCoinHeaders(coinRequestId) } });
    }

    const analyticsRef = adminDb.collection('analytics').doc(uid);
    const configRevision = await getAiConfigRevision();
    const inputSignature = JSON.stringify({ piHistory, cgpaHistory, configRevision, promptRevision: 1 });
    const analyticsSnapshot = await analyticsRef.get();
    const cachedForecast = analyticsSnapshot.data()?.forecast;
    const cachedAt = timestampMillis(cachedForecast?.lastUpdated);

    // A cache hit needs no provider call, so it is never charged.
    if (!forceRegenerate && cachedForecast?.inputSignature === inputSignature && cachedAt && Date.now() - cachedAt < FORECAST_CACHE_MS) {
      return NextResponse.json(cachedForecast, { headers: { 'X-AI-Cache': 'HIT', ...freeCoinHeaders(coinRequestId) } });
    }

    // Free first. A refused limiter check consumes nothing, so falling back to coins never spends a free unit.
    const rateLimit = await checkRateLimit(uid, 'ai_forecast', await resolveFeatureWindows('forecast'));
    if (!rateLimit.allowed) {
      if (!coinRequestId) {
        logApiCall({ endpoint: '/api/ai/forecast', category: 'ai', uid, status: 429, durationMs: timer(), provider: 'deepseek', error: 'Per-user rate limit exceeded' });
        return withCoinHint(rateLimitResponse(rateLimit, `Forecast limit reached. Try again in ${rateLimit.retryAfterSeconds} seconds.`), uid, 'forecast');
      }
      hold = await coins.reserve(uid, 'forecast', coinRequestId);
      charged = true;
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

    const generated = await generateForecastResponseWithMetadata(prompt);
    const trendLabel = generated.text.trim();
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
      provenance: { providerId: generated.providerId, modelId: generated.modelId, configRevision: generated.configRevision },
    };

    const notifyRisk = () => {
      if (riskScore < 4) return;
      const notifUrl = new URL('/api/notifications/send', request.url);
      return fetch(notifUrl.toString(), {
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
    };

    if (hold) {
      // The charge and the saved forecast commit together, or neither does.
      const charge = await coins.commit(hold, { forecast: forecastData });
      hold = undefined;
      await notifyRisk();
      logApiCall({ endpoint: '/api/ai/forecast', category: 'ai', uid, status: 200, durationMs: timer(), provider: generated.providerId });
      return NextResponse.json(forecastData, { headers: { ...chargedHeaders(charge), 'X-AI-Cache': 'MISS' } });
    }

    try {
      await analyticsRef.set({ forecast: forecastData }, { merge: true });
      await notifyRisk();
    } catch (dbError) {
      console.error('Analytics write failed (non-fatal):', dbError);
    }

    logApiCall({ endpoint: '/api/ai/forecast', category: 'ai', uid, status: 200, durationMs: timer(), provider: generated.providerId });
    return NextResponse.json(forecastData, {
      headers: {
        'X-RateLimit-Remaining': String(rateLimit.remaining),
        'X-AI-Cache': 'MISS',
        ...freeCoinHeaders(coinRequestId),
      },
    });
  } catch (error: any) {
    if (hold) await refundQuietly(hold);
    if (error instanceof RewardError) return rewardErrorResponse(error);
    console.error('Forecast route error:', error);
    logApiCall({ endpoint: '/api/ai/forecast', category: 'ai', uid, status: charged ? 503 : 500, durationMs: timer(), provider: 'deepseek', error: error?.message });
    if (charged) return chargedFailureResponse('Forecast');
    return NextResponse.json({ error: 'Failed to generate forecast' }, { status: 500 });
  }
}
