import { NextRequest, NextResponse } from 'next/server';
import { generateFastResponse } from '@/lib/ai/manager';
import { logApiCall, apiTimer } from '@/lib/api/logger';
import { getVerifiedApiUser } from '@/lib/api/auth';
import { checkRateLimit, rateLimitResponse } from '@/lib/api/rate-limit';

const WHAT_IF_LIMITS = [
  { name: 'five_minutes', limit: 3, windowMs: 5 * 60 * 1000 },
  { name: 'daily', limit: 20, windowMs: 24 * 60 * 60 * 1000 },
];

export async function POST(request: NextRequest) {
  const timer = apiTimer();
  let uid: string | null = null;
  try {
    const verifiedUser = await getVerifiedApiUser(request);
    if (!verifiedUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    uid = verifiedUser.uid;

    const body = await request.json();
    const currentCGPA = Number(body.currentCGPA);
    const totalCredits = Number(body.totalCredits);
    const targetCGPA = Number(body.targetCGPA);
    const remainingSemesters = Number(body.remainingSemesters);
    const creditLoad = Number(body.creditLoad);

    const values = [currentCGPA, totalCredits, targetCGPA, remainingSemesters, creditLoad];
    if (values.some((value) => !Number.isFinite(value))) {
      return NextResponse.json({ error: 'All what-if parameters must be valid numbers.' }, { status: 400 });
    }
    if (currentCGPA < 0 || currentCGPA > 5 || targetCGPA < 0 || targetCGPA > 5) {
      return NextResponse.json({ error: 'CGPA values must be between 0 and 5.' }, { status: 400 });
    }
    if (totalCredits < 0 || totalCredits > 1000 || remainingSemesters < 1 || remainingSemesters > 10 || creditLoad < 1 || creditLoad > 30) {
      return NextResponse.json({ error: 'Credits, remaining semesters, or credit load are outside the supported range.' }, { status: 400 });
    }

    const futureCredits = remainingSemesters * creditLoad;
    const requiredGPATotal = (targetCGPA * (totalCredits + futureCredits)) - (currentCGPA * totalCredits);
    const requiredGPA = requiredGPATotal / futureCredits;
    const requiredAvgScore = (requiredGPA / 5) * 100;

    let feasibilityNote = '';
    if (requiredGPA > 5) {
      feasibilityNote = "Mathematically impossible. The required GPA exceeds the maximum 5.0 scale.";
    } else if (requiredGPA < 0) {
      feasibilityNote = "Target already secured. You could fail all remaining courses and still hit this target.";
    } else {
      const rateLimit = await checkRateLimit(uid, 'ai_whatif', WHAT_IF_LIMITS);
      if (!rateLimit.allowed) {
        logApiCall({ endpoint: '/api/ai/whatif', category: 'ai', uid, status: 429, durationMs: timer(), provider: 'groq', error: 'Per-user rate limit exceeded' });
        return rateLimitResponse(rateLimit, `AI guidance limit reached. Try again in ${rateLimit.retryAfterSeconds} seconds.`);
      }

      const prompt = `
        A university student currently has a CGPA of ${currentCGPA} after ${totalCredits} units.
        They want to reach a target CGPA of ${targetCGPA}.
        They have ${remainingSemesters} semesters left, taking ~${creditLoad} units per semester.
        Mathematically, they need to maintain a GPA of ${requiredGPA.toFixed(2)} for all remaining semesters (approx. ${requiredAvgScore.toFixed(1)}% average score).
        
        Write EXACTLY ONE concise, encouraging, and highly specific sentence analyzing the feasibility of this goal.
        Do not repeat the math. Do not give generic advice. Keep it under 20 words.
      `;
      feasibilityNote = await generateFastResponse(prompt);
    }

    logApiCall({ endpoint: '/api/ai/whatif', category: 'ai', uid, status: 200, durationMs: timer(), provider: 'groq' });
    return NextResponse.json({
      requiredGPA,
      requiredAvgScore,
      feasibilityNote
    });
  } catch (error: any) {
    console.error('WhatIf Error:', error);
    logApiCall({ endpoint: '/api/ai/whatif', category: 'ai', uid, status: 500, durationMs: timer(), provider: 'groq', error: error?.message });
    return NextResponse.json({ error: 'Failed to calculate what-if scenario' }, { status: 500 });
  }
}
