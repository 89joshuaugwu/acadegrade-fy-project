import { NextRequest, NextResponse } from 'next/server';
import { computeForecast, getTrendDirection } from '@/lib/ai/forecast';
import { generateContent } from '@/lib/ai/gemini';
import { adminDb, adminAuth } from '@/lib/firebase/admin';

export async function POST(request: NextRequest) {
  try {
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
    const { piHistory } = body;

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
    const { slope, projected, riskScore } = computeForecast(piHistory);
    const trendDirection = getTrendDirection(slope);

    // Gemini writes a trend label
    const prompt = `
      A student has an academic Performance Index (PI) trend.
      The recent slope of their performance is ${slope.toFixed(3)} (positive = improving, negative = declining).
      The direction is "${trendDirection}".
      Their PI history (out of 5.0) is: ${piHistory.join(', ')}.
      
      Write EXACTLY ONE concise, insightful phrase (under 5 words) to label this trend.
      Examples: "Steady & Upward", "Warning: Slight Decline", "Plateaued Performance", "Needs Urgent Attention".
      Do not use quotes in your response.
    `;

    const trendLabel = (await generateContent(prompt)).trim();

    const forecastData = {
      slope,
      projected,
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
    } catch (dbError) {
      console.error('Analytics write failed (non-fatal):', dbError);
      // Don't throw — just log. Client still gets the forecast.
    }

    return NextResponse.json(forecastData);

  } catch (error: any) {
    console.error('Forecast route error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to generate forecast' },
      { status: 500 }
    );
  }
}
