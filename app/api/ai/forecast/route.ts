import { NextRequest, NextResponse } from 'next/server';
import { computeForecast, getTrendDirection } from '@/lib/ai/forecast';
import { generateContent } from '@/lib/ai/gemini';

export async function POST(request: NextRequest) {
  try {
    // ── 1. Parse body ────────────────────────────────────────────────────────
    const body = await request.json();
    const { uid, piHistory } = body;

    if (!uid || !Array.isArray(piHistory)) {
      return NextResponse.json(
        { error: 'Missing uid or piHistory' },
        { status: 400 }
      );
    }

    // ── 2. Optional auth verification ────────────────────────────────────────
    // Verify the token if provided (good practice even if uid is in body)
    const authHeader = request.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.replace('Bearer ', '');
        // Dynamic import avoids top-level firebase-admin ESM crash
        const { adminAuth } = await import('@/lib/firebase/admin');
        const decoded = await adminAuth.verifyIdToken(token);
        // Ensure uid in body matches the token owner
        if (decoded.uid !== uid) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
      } catch (authErr) {
        console.warn('Token verification failed:', authErr);
        // Don't block — uid from body is still accepted for now
      }
    }

    // ── 3. Compute regression forecast ───────────────────────────────────────
    const { slope, projected, riskScore } = computeForecast(piHistory);
    const trendDirection = getTrendDirection(slope);

    // ── 4. Gemini trend label ─────────────────────────────────────────────────
    const prompt = `
      A student has an academic Performance Index (PI) trend.
      The recent slope of their performance is ${slope.toFixed(3)} (positive = improving, negative = declining).
      The direction is "${trendDirection}".
      Their PI history (out of 5.0) is: ${piHistory.join(', ')}.
      
      Write EXACTLY ONE concise, insightful phrase (under 5 words) to label this trend.
      Examples: "Steady & Upward", "Warning: Slight Decline", "Plateaued Performance", "Needs Urgent Attention".
      Do not use quotes in your response.
    `;

    const trendLabel = await generateContent(prompt);

    // ── 5. Build response object ──────────────────────────────────────────────
    const forecastData = {
      slope,
      projected,
      riskScore,
      trendLabel: trendLabel.trim(),
      trendDirection,
      lastUpdated: new Date().toISOString(),
    };

    // ── 6. Persist to Firestore via dynamic import ────────────────────────────
    // Dynamic import CRITICAL: prevents top-level firebase-admin ESM crash.
    // If adminDb fails here, the error is caught below and JSON is returned.
    try {
      const { adminDb } = await import('@/lib/firebase/admin');
      await adminDb.collection('analytics').doc(uid).set(
        { forecast: forecastData },
        { merge: true }
      );
    } catch (dbErr) {
      // Log but don't fail the request — forecast data is still returned
      console.error('Firestore write failed (non-fatal):', dbErr);
    }

    return NextResponse.json(forecastData);

  } catch (error: any) {
    console.error('Forecast Error:', error?.message ?? error);
    return NextResponse.json(
      { error: error?.message ?? 'Failed to generate forecast' },
      { status: 500 }
    );
  }
}
