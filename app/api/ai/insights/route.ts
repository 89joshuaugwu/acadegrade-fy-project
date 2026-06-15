import { NextRequest, NextResponse } from 'next/server';
import { generateJSON } from '@/lib/ai/gemini';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import type { InsightResponse } from '@/types/ai';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch (err) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    const uid = decodedToken.uid;

    const body = await request.json();
    const { forceRegenerate, semesterData } = body;

    const analyticsRef = adminDb.collection('analytics').doc(uid);
    const analyticsDoc = await analyticsRef.get();
    const analyticsData = analyticsDoc.data();

    // Rate limiting: 24 hours
    if (!forceRegenerate && analyticsData?.lastInsight) {
      const lastCall = analyticsData.lastInsight.timestamp?.toDate();
      if (lastCall) {
        const hoursSinceLastCall = (new Date().getTime() - lastCall.getTime()) / (1000 * 60 * 60);
        if (hoursSinceLastCall < 24) {
          return NextResponse.json(analyticsData.lastInsight.data);
        }
      }
    }

    // Rate limiting fallback: even if forceRegenerate is true, prevent abuse (e.g., max 5 times a day)
    // We will just do a simple 1h limit on forceRegenerate for safety in this phase.
    if (forceRegenerate && analyticsData?.lastInsight) {
      const lastCall = analyticsData.lastInsight.timestamp?.toDate();
      if (lastCall && (new Date().getTime() - lastCall.getTime()) / (1000 * 60 * 60) < 1) {
        return NextResponse.json({ error: 'Please wait at least 1 hour before regenerating.' }, { status: 429 });
      }
    }

    const prompt = `
      You are an expert academic advisor at a top Nigerian University.
      Analyze the following student data and provide a structured JSON response.
      
      Student Data:
      ${JSON.stringify(semesterData)}
      
      Return EXACTLY this JSON structure, and nothing else (no markdown blocks, no formatting around it):
      {
        "strengths": ["string", "string"],
        "concerns": ["string", "string"],
        "recommendations": ["string", "string"],
        "degreeOutlook": "string paragraph explaining their current trajectory"
      }
    `;

    const insightData = await generateJSON<InsightResponse>(prompt);

    // Save to Firestore
    await analyticsRef.set({
      lastInsight: {
        timestamp: new Date(),
        data: insightData
      }
    }, { merge: true });

    return NextResponse.json(insightData);
  } catch (error: any) {
    console.error('Insights Error:', error);
    return NextResponse.json({ error: 'Failed to generate insights' }, { status: 500 });
  }
}
