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
 * Compute forecast from PI history and CGPA history using linear regression.
 * Returns projected values for next 2 semesters for both, slope (based on PI), and risk score.
 */
export function computeForecast(piHistory: number[], cgpaHistory?: number[]) {
  const getProjection = (history: number[]): [number, number] => {
    if (history.length < 2) return [history[0] ?? 0, history[0] ?? 0];
    const data: [number, number][] = history.map((y, x) => [x, y]);
    const predict = linearRegressionLine(linearRegression(data));
    const n = history.length;
    return [clamp(predict(n)), clamp(predict(n + 1))];
  };

  const projectedPi = getProjection(piHistory);
  const projectedCgpa = cgpaHistory && cgpaHistory.length > 0 ? getProjection(cgpaHistory) : projectedPi;

  let slope = 0;
  if (piHistory.length >= 2) {
    const data: [number, number][] = piHistory.map((y, x) => [x, y]);
    slope = linearRegression(data).m;
  }

  // Risk score: 1 (low risk, improving) to 5 (high risk, declining)
  let riskScore: RiskLevel;
  if (slope > 0.1) riskScore = 1;
  else if (slope > 0) riskScore = 2;
  else if (slope > -0.05) riskScore = 3;
  else if (slope > -0.15) riskScore = 4;
  else riskScore = 5;

  return {
    slope,
    projected: projectedPi, // For backward compatibility
    projectedPi,
    projectedCgpa,
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
