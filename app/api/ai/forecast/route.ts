import { NextRequest, NextResponse } from 'next/server';
import { computeForecast, getTrendDirection } from '@/lib/ai/forecast';
import { generateDeepInsight } from '@/lib/ai/manager';
import { adminDb, adminAuth } from '@/lib/firebase/admin';
import { logApiCall, apiTimer } from '@/lib/api/logger';

export async function POST(request: NextRequest) {
  try {
    const timer = apiTimer();
    // ✅ FIX 1: Verify Firebase Auth token
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized — no token provided' }, { status: 401 });
    }

    let uid: string;
    try {
      const decoded = await adminAuth.verifyIdToken(token);
      uid = decoded.uid;
    } catch {
      return NextResponse.json({ error: 'Unauthorized — invalid token' }, { status: 401 });
    }

    // Parse body
    const body = await request.json();
    const { piHistory, cgpaHistory } = body;

    if (!Array.isArray(piHistory)) {
      return NextResponse.json({ error: 'Missing piHistory array' }, { status: 400 });
    }

    // Guard: need at least 1 data point
    if (piHistory.length === 0) {
      return NextResponse.json({
        slope: 0,
        projected: [0, 0],
        riskScore: 3,
        trendLabel: 'Not enough data yet',
        trendDirection: 'stable',
        lastUpdated: new Date()
      });
    }

    // Compute regression forecast
    const { slope, projected, projectedPi, projectedCgpa, riskScore } = computeForecast(piHistory, cgpaHistory);
    const trendDirection = getTrendDirection(slope);

    // DeepSeek writes a trend label
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
      lastUpdated: new Date()
    };

    // ✅ FIX 2: Wrap adminDb write in its own try/catch
    // If Firestore write fails, still return the forecast data to the client
    try {
      await adminDb.collection('analytics').doc(uid).set(
        { forecast: forecastData },
        { merge: true }
      );

      // Trigger Risk Notification if needed
      if (riskScore >= 4) {
        const notifUrl = new URL('/api/notifications/send', request.url);
        await fetch(notifUrl.toString(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            uid,
            title: 'Academic Risk Alert ⚠️',
            message: 'Your recent trajectory indicates high academic risk. Check your insights for recommendations.',
            type: 'warning',
            event: 'aiInsights'
          })
        }).catch(e => console.error('Failed to trigger risk notification', e));
      }
    } catch (dbError) {
      console.error('Analytics write failed (non-fatal):', dbError);
      // Don't throw — just log. Client still gets the forecast.
    }

    logApiCall({ endpoint: '/api/ai/forecast', category: 'ai', uid, status: 200, durationMs: timer(), provider: 'deepseek' });
    return NextResponse.json(forecastData);

  } catch (error: any) {
    console.error('Forecast route error:', error);
    logApiCall({ endpoint: '/api/ai/forecast', category: 'ai', uid: null, status: 500, durationMs: 0, provider: 'deepseek', error: error?.message });
    return NextResponse.json(
      { error: error?.message || 'Failed to generate forecast' },
      { status: 500 }
    );
  }
}
