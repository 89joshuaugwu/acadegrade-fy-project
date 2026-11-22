import type { GradingScale } from '@/lib/cgpa/academicRules';

/**
 * Optional grading-scale fields the student apps add to AcadeMind requests
 * (forecast, insights, what-if) when the student uses a scale other than the
 * default 5-point one. Same field names on web and Android:
 *   gradingScaleId, gradingScaleName, maxGradePoint
 * Additive: older clients and 5-point students omit them, so their prompts and
 * caches are unchanged. Anything malformed is ignored, never rejected.
 */
export interface ScaleContext {
  id: string | null;
  name: string;
  maxPoint: number;
}

export interface ScaleRequestFields {
  gradingScaleId?: string;
  gradingScaleName?: string;
  maxGradePoint?: number;
}

/** The fields to spread into a request body: none on the default scale. */
export function scaleContextFor(scale: GradingScale): ScaleRequestFields {
  return scale.id === 'ng5' ? {} : { gradingScaleId: scale.id, gradingScaleName: scale.name, maxGradePoint: scale.maxPoint };
}

/** Server side: the scale named by a request body, or null. */
export function readScaleContext(body: unknown): ScaleContext | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const { gradingScaleId, gradingScaleName, maxGradePoint } = body as Record<string, unknown>;
  if (typeof gradingScaleName !== 'string' || !gradingScaleName.trim()) return null;
  if (typeof maxGradePoint !== 'number' || !Number.isFinite(maxGradePoint) || maxGradePoint < 1 || maxGradePoint > 10) return null;
  if (gradingScaleId === 'ng5') return null;
  const id = typeof gradingScaleId === 'string' && /^[a-zA-Z0-9-]{1,16}$/.test(gradingScaleId) ? gradingScaleId : null;
  return { id, name: gradingScaleName.trim().slice(0, 40), maxPoint: maxGradePoint };
}

/** One prompt line naming the scale, or '' on the default scale. */
export function scalePromptLine(context: ScaleContext | null): string {
  if (!context) return '';
  const outOf = context.maxPoint === 5 ? 'out of 5' : `out of ${context.maxPoint}, not 5`;
  return `Grading scale: ${context.name}. GPA, CGPA and PI are ${outOf}.`;
}

/** The top point to validate and describe values with (5 without a context). */
export function maxPointOf(context: ScaleContext | null): number {
  return context ? context.maxPoint : 5;
}
