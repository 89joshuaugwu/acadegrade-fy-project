/**
 * Insight prompt builder — constructs Gemini prompts from student data.
 * SERVER-SIDE ONLY — used in /api/ai/insights route.
 */

interface InsightData {
  cgpa: number;
  pi: number;
  degreeClass: string;
  riskScore: number;
  semesterHistory: {
    label: string;
    gpa: number;
    pi: number;
  }[];
  weakCourses: {
    code: string;
    title: string;
    score: number;
  }[];
}

/**
 * Build the system prompt for academic insights.
 * Can be overridden by admin via config/settings.aiSystemPrompt.
 */
export function buildInsightPrompt(data: InsightData, customPrompt?: string): string {
  const systemPrompt = customPrompt ?? `You are AcadeGrade AI, an academic advisor for Nigerian university students.
Analyze this student's academic record and respond ONLY with valid JSON (no markdown backticks):
{
  "strengths": ["point 1", "point 2"],
  "concerns": ["point 1"],
  "recommendations": ["action 1", "action 2", "action 3"],
  "degreeOutlook": "one sentence projection"
}`;

  return `${systemPrompt}\n\nStudent data: ${JSON.stringify(data)}`;
}

/**
 * Build the prompt for What-If feasibility note.
 */
export function buildWhatIfPrompt(
  currentCGPA: number,
  targetCGPA: number,
  requiredGPA: number,
  remainingSemesters: number
): string {
  return `You are AcadeGrade AI. A Nigerian university student currently has a CGPA of ${currentCGPA.toFixed(2)} and wants to reach ${targetCGPA.toFixed(2)}. They need to maintain a GPA of ${requiredGPA.toFixed(2)} for the next ${remainingSemesters} semester(s). Respond with ONLY one sentence about whether this is feasible and what level of effort it requires. No JSON, just plain text.`;
}

/**
 * Build the prompt for forecast trend label.
 */
export function buildForecastPrompt(
  slope: number,
  projected: [number, number],
  currentCGPA: number
): string {
  return `You are AcadeGrade AI. A Nigerian university student's academic trend has a slope of ${slope.toFixed(4)}. Their projected PI for the next two semesters is ${projected[0].toFixed(2)} and ${projected[1].toFixed(2)}. Current CGPA: ${currentCGPA.toFixed(2)}. Respond with ONLY one sentence describing their academic trajectory and projected degree class. No JSON, just plain text.`;
}
