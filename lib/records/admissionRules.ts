/**
 * AcadeGrade admission aggregate: JAMB UTME (0-400), post-UTME and O-level
 * points combined into a score out of 100, with the working returned as data.
 *
 * This file is byte-identical in acadegrade-web/lib/records/admissionRules.ts
 * and acadegrade-mobile/lib/records/admissionRules.ts. Both repos run the
 * shared fixture tests/fixtures/admission-rules.json against it. Keep it pure:
 * no imports, no platform APIs, erasable TypeScript only.
 *
 * Schools publish their own formulas and change them, so every formula and
 * point table here is an estimate; screens show ESTIMATE_NOTE with each result.
 * Each part is scaled to its weight: value = raw / max x weight. The aggregate
 * is the exact sum rounded half up to 2 decimals; step values are rounded for
 * display only.
 */

export const UTME_MAX = 400;
export const POST_UTME_MAX_LIMIT = 400;
export const OLEVEL_AGGREGATE_SUBJECTS = 5;
export const POINT_MAX = 20;
export const ESTIMATE_NOTE = "Estimate only. Check your school's formula.";

export type AggregateFormulaId = 'utme-post' | 'utme-olevel-post' | 'custom';
export type AggregatePart = 'utme' | 'olevel' | 'postUtme';

export interface AggregateWeights {
  utme: number;
  olevel: number;
  postUtme: number;
}

export interface AggregateFormula {
  id: AggregateFormulaId;
  name: string;
  /** What the screen shows under the name. */
  summary: string;
  /** Null for custom (the student's own weights). */
  weights: AggregateWeights | null;
}

export const AGGREGATE_FORMULAS: readonly AggregateFormula[] = [
  { id: 'utme-post', name: 'UTME and post-UTME', summary: 'UTME ÷ 8 (out of 50) plus post-UTME scaled to 50', weights: { utme: 50, olevel: 0, postUtme: 50 } },
  { id: 'utme-olevel-post', name: 'UTME, O-level and post-UTME', summary: 'UTME ÷ 8 (out of 50), five O-level grades (out of 20) and post-UTME scaled to 30', weights: { utme: 50, olevel: 20, postUtme: 30 } },
  { id: 'custom', name: 'My school’s weights', summary: 'Your own share for each part, adding up to 100', weights: null },
];

export type CreditGrade = 'A1' | 'B2' | 'B3' | 'C4' | 'C5' | 'C6';
export type OlevelPoints = Record<CreditGrade, number>;
export type OlevelPointTableId = 'four-to-two' | 'six-to-one' | 'ten-to-five' | 'custom';

export const CREDIT_GRADES: readonly CreditGrade[] = ['A1', 'B2', 'B3', 'C4', 'C5', 'C6'];

/** Points per credit; D7, E8, F9 and AR earn 0. The default is the first. */
export const OLEVEL_POINT_TABLES: readonly { id: Exclude<OlevelPointTableId, 'custom'>; name: string; points: OlevelPoints }[] = [
  { id: 'four-to-two', name: 'A1 = 4.0 down to C6 = 2.0', points: { A1: 4, B2: 3.6, B3: 3.2, C4: 2.8, C5: 2.4, C6: 2 } },
  { id: 'six-to-one', name: 'A1 = 6 down to C6 = 1', points: { A1: 6, B2: 5, B3: 4, C4: 3, C5: 2, C6: 1 } },
  { id: 'ten-to-five', name: 'A1 = 10 down to C6 = 5', points: { A1: 10, B2: 9, B3: 8, C4: 7, C5: 6, C6: 5 } },
];

const ENTRY_GRADES: readonly string[] = ['A1', 'B2', 'B3', 'C4', 'C5', 'C6', 'D7', 'E8', 'F9', 'AR'];

export type Check<C extends string> = { ok: true } | { ok: false; code: C };

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const hasAtMostTwoDecimals = (value: number) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-6;

/** Round half up to 2 decimals, immune to binary noise such as 30.624999999. */
export function round2(value: number): number {
  return Math.round(Number((value * 100).toFixed(6))) / 100;
}

function ceil2(value: number): number {
  return Math.ceil(Number((value * 100).toFixed(6))) / 100;
}

export function formulaById(id: unknown): AggregateFormula | null {
  return AGGREGATE_FORMULAS.find((formula) => formula.id === id) ?? null;
}

/** A whole number from 0 to 400. */
export function validateUtme(score: unknown): Check<'missing' | 'not-number' | 'not-whole' | 'range'> {
  if (score === null || score === undefined) return { ok: false, code: 'missing' };
  if (!isNumber(score)) return { ok: false, code: 'not-number' };
  if (!Number.isInteger(score)) return { ok: false, code: 'not-whole' };
  if (score < 0 || score > UTME_MAX) return { ok: false, code: 'range' };
  return { ok: true };
}

/** A maximum that is a whole number from 1 to 400, and a score from 0 to it with at most 2 decimals. */
export function validatePostUtme(score: unknown, max: unknown): Check<'score-missing' | 'score-range' | 'decimals' | 'max-range'> {
  if (!isNumber(max) || !Number.isInteger(max) || max < 1 || max > POST_UTME_MAX_LIMIT) return { ok: false, code: 'max-range' };
  if (score === null || score === undefined) return { ok: false, code: 'score-missing' };
  if (!isNumber(score) || score < 0 || score > max) return { ok: false, code: 'score-range' };
  if (!hasAtMostTwoDecimals(score)) return { ok: false, code: 'decimals' };
  return { ok: true };
}

/** Each part 0-100, UTME above 0, adding up to 100. */
export function validateWeights(weights: unknown): Check<'weights-missing' | 'weights-range' | 'weights-utme' | 'weights-sum'> {
  if (!isObject(weights)) return { ok: false, code: 'weights-missing' };
  const values = [weights.utme, weights.olevel, weights.postUtme];
  if (!values.every(isNumber)) return { ok: false, code: 'weights-missing' };
  const [utme, olevel, postUtme] = values as number[];
  if (values.some((value) => (value as number) < 0 || (value as number) > 100)) return { ok: false, code: 'weights-range' };
  if (utme <= 0) return { ok: false, code: 'weights-utme' };
  if (Math.abs(utme + olevel + postUtme - 100) > 1e-9) return { ok: false, code: 'weights-sum' };
  return { ok: true };
}

/** Points for A1-C6, each 0-20, A1 above 0, never rising as the grade falls. */
export function validatePointTable(points: unknown): Check<'points-missing' | 'points-range' | 'points-top' | 'points-order'> {
  if (!isObject(points) || !CREDIT_GRADES.every((grade) => isNumber(points[grade]))) return { ok: false, code: 'points-missing' };
  const values = CREDIT_GRADES.map((grade) => points[grade] as number);
  if (values.some((value) => value < 0 || value > POINT_MAX)) return { ok: false, code: 'points-range' };
  if (values[0] <= 0) return { ok: false, code: 'points-top' };
  for (let index = 1; index < values.length; index += 1) {
    if (values[index] > values[index - 1]) return { ok: false, code: 'points-order' };
  }
  return { ok: true };
}

export function pointsForGrade(grade: string, points: OlevelPoints): number {
  return (CREDIT_GRADES as readonly string[]).includes(grade) ? points[grade as CreditGrade] : 0;
}

export interface AggregateInput {
  formula: AggregateFormulaId;
  /** Null or absent: not written yet. */
  utme?: number | null;
  postUtme?: { score: number | null; max: number } | null;
  /** Up to five grades (A1-F9 or AR), usually English, Maths and three course subjects. */
  olevelGrades?: string[] | null;
  /** Required for the custom formula. */
  weights?: AggregateWeights | null;
  /** Default 'four-to-two'. */
  pointTable?: OlevelPointTableId;
  /** Required when pointTable is 'custom'. */
  customPoints?: OlevelPoints | null;
}

export interface AggregateStep {
  part: AggregatePart;
  /** UTME score, O-level points total, or post-UTME score. */
  raw: number;
  max: number;
  /** Share of the 100 this part is worth. */
  weight: number;
  /** raw / max x weight, rounded to 2 decimals for display. */
  value: number;
  /** O-level only: each grade and its points, in the order given. */
  subjects?: { grade: string; points: number }[];
}

export type AggregateError =
  | 'formula'
  | 'weights-missing'
  | 'weights-range'
  | 'weights-utme'
  | 'weights-sum'
  | 'points-missing'
  | 'points-range'
  | 'points-top'
  | 'points-order'
  | 'utme-not-number'
  | 'utme-not-whole'
  | 'utme-range'
  | 'post-utme-score-range'
  | 'post-utme-decimals'
  | 'post-utme-max-range'
  | 'olevel-too-many'
  | 'olevel-grade';

export interface AggregateResult {
  /** False when an input is invalid (see errors); nothing is computed then. */
  ok: boolean;
  errors: AggregateError[];
  /** Every weighted part is present and final (no AR, five grades). */
  complete: boolean;
  missing: AggregatePart[];
  /** Out of 100, 2 decimals; null unless complete. */
  aggregate: number | null;
  /** Sum of the parts present so far, 2 decimals. */
  partial: number;
  steps: AggregateStep[];
}

interface Resolved {
  weights: AggregateWeights;
  points: OlevelPoints;
}

function resolve(input: AggregateInput, errors: AggregateError[]): Resolved | null {
  const formula = formulaById(input.formula);
  if (!formula) {
    errors.push('formula');
    return null;
  }
  let weights = formula.weights;
  if (!weights) {
    const check = validateWeights(input.weights);
    if (!check.ok) {
      errors.push(check.code);
      return null;
    }
    weights = input.weights as AggregateWeights;
  }
  let points: OlevelPoints = OLEVEL_POINT_TABLES[0].points;
  if (input.pointTable === 'custom') {
    const check = validatePointTable(input.customPoints);
    if (!check.ok) {
      errors.push(check.code);
      return null;
    }
    points = input.customPoints as OlevelPoints;
  } else if (input.pointTable !== undefined) {
    const table = OLEVEL_POINT_TABLES.find((entry) => entry.id === input.pointTable);
    if (table) points = table.points;
  }
  return { weights, points };
}

interface Parts {
  steps: AggregateStep[];
  exact: Record<AggregatePart, number | null>;
  missing: AggregatePart[];
  weights: AggregateWeights;
}

function computeParts(input: AggregateInput, errors: AggregateError[]): Parts | null {
  if (!isObject(input)) {
    errors.push('formula');
    return null;
  }
  const resolved = resolve(input, errors);
  if (!resolved) return null;
  const { weights, points } = resolved;
  const steps: AggregateStep[] = [];
  const exact: Record<AggregatePart, number | null> = { utme: null, olevel: null, postUtme: null };
  const missing: AggregatePart[] = [];

  if (weights.utme > 0) {
    const check = validateUtme(input.utme);
    if (check.ok) {
      const raw = input.utme as number;
      exact.utme = (raw / UTME_MAX) * weights.utme;
      steps.push({ part: 'utme', raw, max: UTME_MAX, weight: weights.utme, value: round2(exact.utme) });
    } else if (check.code === 'missing') missing.push('utme');
    else errors.push(`utme-${check.code}` as AggregateError);
  }

  if (weights.olevel > 0) {
    const grades = Array.isArray(input.olevelGrades) ? input.olevelGrades : [];
    if (grades.length > OLEVEL_AGGREGATE_SUBJECTS) errors.push('olevel-too-many');
    else if (!grades.every((grade) => typeof grade === 'string' && ENTRY_GRADES.includes(grade))) errors.push('olevel-grade');
    else if (grades.length === 0) missing.push('olevel');
    else {
      const subjects = grades.map((grade) => ({ grade, points: pointsForGrade(grade, points) }));
      const raw = round2(subjects.reduce((sum, subject) => sum + subject.points, 0));
      const max = round2(points.A1 * OLEVEL_AGGREGATE_SUBJECTS);
      exact.olevel = (raw / max) * weights.olevel;
      steps.push({ part: 'olevel', raw, max, weight: weights.olevel, value: round2(exact.olevel), subjects });
      if (grades.length < OLEVEL_AGGREGATE_SUBJECTS || grades.includes('AR')) missing.push('olevel');
    }
  }

  if (weights.postUtme > 0) {
    const post = input.postUtme;
    const check = isObject(post) ? validatePostUtme(post.score, post.max) : ({ ok: false, code: 'score-missing' } as const);
    if (check.ok) {
      const { score, max } = post as { score: number; max: number };
      exact.postUtme = (score / max) * weights.postUtme;
      steps.push({ part: 'postUtme', raw: score, max, weight: weights.postUtme, value: round2(exact.postUtme) });
    } else if (check.code === 'score-missing') missing.push('postUtme');
    else errors.push(`post-utme-${check.code}` as AggregateError);
  }

  if (errors.length > 0) return null;
  return { steps, exact, missing, weights };
}

const ORDER: readonly AggregatePart[] = ['utme', 'olevel', 'postUtme'];

/** The aggregate out of 100 with each part's working; never throws. */
export function computeAggregate(input: AggregateInput): AggregateResult {
  const errors: AggregateError[] = [];
  const parts = computeParts(input, errors);
  if (!parts) return { ok: false, errors, complete: false, missing: [], aggregate: null, partial: 0, steps: [] };
  const sum = ORDER.reduce((total, part) => total + (parts.exact[part] ?? 0), 0);
  const missing = ORDER.filter((part) => parts.missing.includes(part));
  const complete = missing.length === 0;
  return { ok: true, errors: [], complete, missing, aggregate: complete ? round2(sum) : null, partial: round2(sum), steps: parts.steps };
}

export type PostUtmeNeeded =
  | { status: 'needed'; score: number; max: number }
  | { status: 'met' }
  | { status: 'out-of-reach' }
  | { status: 'incomplete' }
  | { status: 'no-post-utme' }
  | { status: 'invalid-target' }
  | { status: 'invalid-input' };

/**
 * The post-UTME score (out of its maximum, default 100, rounded up to 2
 * decimals) needed to reach `target` given the other parts. Any post-UTME
 * score already in the input is ignored.
 */
export function postUtmeNeeded(input: AggregateInput, target: number): PostUtmeNeeded {
  if (!isNumber(target) || target < 0 || target > 100) return { status: 'invalid-target' };
  if (!isObject(input)) return { status: 'invalid-input' };
  const postMax = isObject(input.postUtme) ? input.postUtme.max : 100;
  const errors: AggregateError[] = [];
  const parts = computeParts({ ...input, postUtme: { score: 0, max: postMax } }, errors);
  if (!parts) return { status: 'invalid-input' };
  if (parts.weights.postUtme <= 0) return { status: 'no-post-utme' };
  if (parts.missing.some((part) => part !== 'postUtme')) return { status: 'incomplete' };
  const others = (parts.exact.utme ?? 0) + (parts.exact.olevel ?? 0);
  const need = target - others;
  if (need <= 1e-9) return { status: 'met' };
  if (need > parts.weights.postUtme + 1e-9) return { status: 'out-of-reach' };
  return { status: 'needed', score: Math.min(postMax, ceil2((need / parts.weights.postUtme) * postMax)), max: postMax };
}
