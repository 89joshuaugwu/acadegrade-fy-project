import { NextRequest, NextResponse } from 'next/server';
import { computeForecast, getTrendDirection } from '@/lib/ai/forecast';
import { generateContent } from '@/lib/ai/gemini';
import { adminDb } from '@/lib/firebase/admin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { uid, piHistory } = body;

    if (!uid || !Array.isArray(piHistory)) {
      return NextResponse.json({ error: 'Missing uid or piHistory' }, { status: 400 });
    }

    const { slope, projected, riskScore } = computeForecast(piHistory);
    const trendDirection = getTrendDirection(slope);

    // Gemini writes a trend label based on the slope and history
    const prompt = `
      A student has an academic Performance Index (PI) trend.
      The recent slope of their performance is ${slope.toFixed(3)} (where positive is improving, negative is declining).
      The direction is "${trendDirection}".
      Their PI history (out of 5.0) is: ${piHistory.join(', ')}.
      
      Write EXACTLY ONE concise, insightful phrase (under 5 words) to label this trend.
      Examples: "Steady & Upward", "Warning: Slight Decline", "Plateaued Performance", "Needs Urgent Attention".
      Do not use quotes.
    `;
    const trendLabel = await generateContent(prompt);

    const forecastData = {
      slope,
      projected,
      riskScore,
      trendLabel,
      trendDirection,
      lastUpdated: new Date()
    };

    // Save to analytics/{uid}
    await adminDb.collection('analytics').doc(uid).set({
      forecast: forecastData
    }, { merge: true });

    return NextResponse.json(forecastData);
  } catch (error: any) {
    console.error('Forecast Error:', error);
    return NextResponse.json({ error: 'Failed to generate forecast' }, { status: 500 });
  }
}
