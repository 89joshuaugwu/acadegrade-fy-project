import type { ApiFixture } from './types';

/** Student endpoints (owned by the student UI lanes). Read the route in app/api/... and mirror its JSON shape. */
export const STUDENT_API: ApiFixture[] = [
  // ── Insights (AcadeMind): mirrors app/api/ai/usage, forecast, insights and whatif ──
  {
    method: 'GET',
    path: '/api/ai/usage',
    respond: () => {
      const resetAt = Date.now() + 9 * 60 * 60 * 1000;
      const feature = (id: string, label: string, limit: number, remaining: number) => ({
        id, label, freeDailyLimit: limit, freeRemaining: remaining, freeResetAt: resetAt,
        availableNow: remaining, retryAfterSeconds: 0, cooldownUntil: null, coin: null,
      });
      return {
        features: [
          feature('insights', 'Written Analysis', 3, 2),
          feature('forecast', 'Forecast', 6, 5),
          feature('whatif', 'What-If guidance', 20, 17),
          feature('ocr', 'Result scanning', 5, 5),
        ],
        writtenRewards: { earnedToday: 0, usedToday: 0, earnRemaining: 3, resetAtUTC: resetAt },
        coins: null,
        age: { status: 'adult', aiAllowed: true, aiConsent: true },
      };
    },
  },
  {
    method: 'POST',
    path: '/api/ai/forecast',
    respond: () => ({
      slope: 0.04,
      projected: [3.82, 3.86],
      projectedPi: [3.82, 3.86],
      projectedCgpa: [4.55, 4.58],
      riskScore: 1,
      trendLabel: 'Steady and rising',
      trendDirection: 'improving',
      aiEnhanced: true,
      lastUpdated: new Date().toISOString(),
    }),
  },
  {
    method: 'POST',
    path: '/api/ai/insights',
    respond: () => ({
      strengths: [
        'Your computing courses are consistently your strongest: CSC 102, CSC 201 and CSC 202 all scored 80 or above.',
        'Your continuous assessment is reliable, usually 24 or more out of 30.',
      ],
      concerns: [
        'Mathematics is where you drop marks: MTH 201 (52) and MTH 202 (62) pulled your 200L GPA down.',
        'Exam scores dip in heavy semesters, so plan revision early when you carry 18 units or more.',
      ],
      recommendations: [
        'Your MTH 301 result is still awaited. Keep a weekly practice slot for Mathematics; past questions help most.',
        'Keep every remaining course at a B or better to stay above the First Class line.',
      ],
      degreeOutlook: 'You are on course for a First Class. Your CGPA of 4.53 sits just above the 4.50 line, so steady As and Bs in 300L and 400L keep it safe.',
    }),
  },
  {
    method: 'POST',
    path: '/api/ai/whatif',
    respond: () => ({
      requiredGPA: 4.86,
      requiredAvgScore: 97,
      feasibilityNote: 'A stretch, but possible: you would need As in almost every remaining course. Your 300L results so far are already at that level.',
    }),
  },
];
