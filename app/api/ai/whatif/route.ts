import { NextRequest, NextResponse } from 'next/server';
import { generateContent } from '@/lib/ai/gemini';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { currentCGPA, totalCredits, targetCGPA, remainingSemesters, creditLoad } = body;

    if ([currentCGPA, totalCredits, targetCGPA, remainingSemesters, creditLoad].some(v => v === undefined)) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    if (remainingSemesters <= 0 || creditLoad <= 0) {
      return NextResponse.json({ error: 'Remaining semesters and credit load must be > 0' }, { status: 400 });
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
      const prompt = `
        A university student currently has a CGPA of ${currentCGPA} after ${totalCredits} units.
        They want to reach a target CGPA of ${targetCGPA}.
        They have ${remainingSemesters} semesters left, taking ~${creditLoad} units per semester.
        Mathematically, they need to maintain a GPA of ${requiredGPA.toFixed(2)} for all remaining semesters (approx. ${requiredAvgScore.toFixed(1)}% average score).
        
        Write EXACTLY ONE concise, encouraging, and highly specific sentence analyzing the feasibility of this goal.
        Do not repeat the math. Do not give generic advice. Keep it under 20 words.
      `;
      feasibilityNote = await generateContent(prompt);
    }

    return NextResponse.json({
      requiredGPA,
      requiredAvgScore,
      feasibilityNote
    });
  } catch (error: any) {
    console.error('WhatIf Error:', error);
    return NextResponse.json({ error: 'Failed to calculate what-if scenario' }, { status: 500 });
  }
}
