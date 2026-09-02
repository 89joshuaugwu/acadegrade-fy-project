/** Gemini AI insight response structure */
export interface InsightResponse {
  strengths: string[];
  concerns: string[];
  recommendations: string[];
  degreeOutlook: string;
}

/** What-If calculator request */
export interface WhatIfRequest {
  currentCGPA: number;
  totalCredits: number;
  targetCGPA: number;
  remainingSemesters: number;
  creditLoad: number;
}

/** What-If calculator response */
export interface WhatIfResponse {
  requiredGPA: number;
  requiredAvgScore: number;
  feasibilityNote: string;
}

/** Forecast request (PI history) */
export interface ForecastRequest {
  piHistory: number[];
}

/** Forecast response from regression + Gemini label */
export interface ForecastResponse {
  slope: number;
  projected: [number, number];
  projectedPi?: [number, number];
  projectedCgpa?: [number, number];
  riskScore: number;
  trendLabel: string;
}

/** Risk level from 1 (low) to 5 (critical) */
export type RiskLevel = 1 | 2 | 3 | 4 | 5;

/** AI insight card types for rendering */
export type InsightCardType = 'forecast' | 'risk' | 'tip' | 'achievement';

/** Flagged course for risk analysis */
export interface FlaggedCourse {
  code: string;
  title: string;
  totalScore: number;
  grade: string;
  semester: string;
}
