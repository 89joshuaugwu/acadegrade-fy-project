/**
 * Regression-based academic forecast using simple-statistics.
 * SERVER-SIDE ONLY — used in /api/ai/forecast route.
 *
 * Uses PI history (not CGPA) because PI is continuous and provides
 * more granular signal for regression analysis.
 */
import { linearRegression, linearRegressionLine } from 'simple-statistics';
import type { ForecastResponse, RiskLevel } from '@/types/ai';
import type { TrendDirection } from '@/types/analytics';

/** Clamp a value to the valid GPA range [0.00, 5.00] */
const clamp = (v: number): number => Math.max(0, Math.min(5, v));

/**
 * Compute forecast from PI history using linear regression.
 * Returns projected values for next 2 semesters, slope, risk score, and trend.
 */
export function computeForecast(piHistory: number[]): Omit<ForecastResponse, 'trendLabel'> {
  if (piHistory.length < 2) {
    return {
      slope: 0,
      projected: [piHistory[0] ?? 0, piHistory[0] ?? 0],
      riskScore: 3 as RiskLevel,
    };
  }

  const data: [number, number][] = piHistory.map((y, x) => [x, y]);
  const regression = linearRegression(data);
  const predict = linearRegressionLine(regression);

  const n = piHistory.length;
  const projected: [number, number] = [
    clamp(predict(n)),
    clamp(predict(n + 1)),
  ];

  // Risk score: 1 (low risk, improving) to 5 (high risk, declining)
  let riskScore: RiskLevel;
  if (regression.m > 0.1) riskScore = 1;
  else if (regression.m > 0) riskScore = 2;
  else if (regression.m > -0.05) riskScore = 3;
  else if (regression.m > -0.15) riskScore = 4;
  else riskScore = 5;

  return {
    slope: regression.m,
    projected,
    riskScore,
  };
}

/**
 * Determine trend direction from regression slope.
 */
export function getTrendDirection(slope: number): TrendDirection {
  if (slope > 0.02) return 'improving';
  if (slope < -0.02) return 'declining';
  return 'stable';
}
