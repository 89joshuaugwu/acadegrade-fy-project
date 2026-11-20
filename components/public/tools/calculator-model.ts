/**
 * The CGPA calculator's model (calculator.md §5.1): pure functions over the
 * slip's rows, so every figure the page prints is pinned by unit tests
 * against the engine in lib/cgpa/academicRules.ts. No React here.
 */

import {
  computeCourseMetrics,
  computeCumulativeCGPA,
  computeSemesterGPA,
  creditLoadWarnings,
  formatCgpa,
  gradeFromScore,
  isCarryOver,
  normaliseCourseCode,
  roundCgpa,
  weightedAverageScore,
  type AcademicCourseMetrics,
  type AcademicGrade,
} from '@/lib/cgpa/academicRules';
import { EXAMPLE_COURSES } from '@/lib/public/example-student';
import { DEFAULT_SCALE, publicClassFor, type PublicClassBand } from '@/lib/public/scales';
import { encodeRows, type CalculatorMode, type EncodedRow } from './calculator-url';

export type { CalculatorMode } from './calculator-url';

export interface CalcRow {
  id: string;
  code: string;
  units: number;
  /** The letter, kept in memory in both modes. */
  grade: AcademicGrade | null;
  /** The score as typed, kept in memory in both modes. */
  scoreText: string;
  /** A value from a shared link was reset: the row shows the error style. */
  reset?: boolean;
}

/** The grey dash printed where a value is missing (never 0.00, which reads as a result). */
export const NO_VALUE = '—';

export const SCORE_ERROR = 'Enter a score from 0 to 100.';
export const PRIOR_CGPA_ERROR = `Enter a CGPA from 0.00 to ${DEFAULT_SCALE.maxPoint.toFixed(2)}.`;
export const PRIOR_UNITS_ERROR = 'Enter whole units of 1 or more.';

/** Reads a typed number; a comma counts as the decimal point. Null when empty or not a number. */
export function parseDecimal(text: string): number | null {
  let trimmed = text.trim();
  if (!trimmed) return null;
  if (/^-?\d*,\d+$/.test(trimmed)) trimmed = trimmed.replace(',', '.');
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null;
}

/** A score from 0 to 100, or null (empty or outside the range). */
export function validScore(text: string): number | null {
  const value = parseDecimal(text);
  return value !== null && value >= 0 && value <= 100 ? value : null;
}

/** True when the score field holds something that is not a usable score. */
export function scoreInvalid(text: string): boolean {
  return text.trim() !== '' && validScore(text) === null;
}

/** "CSC 301", or "course 3" when the code is blank. */
export function rowName(row: Pick<CalcRow, 'code'>, index: number): string {
  const code = row.code.trim().toUpperCase();
  return code || `course ${index + 1}`;
}

/** "CSC 301", or "Course 3" for the receipt and notes. */
export function rowLabel(row: Pick<CalcRow, 'code'>, index: number): string {
  const code = row.code.trim().toUpperCase();
  return code || `Course ${index + 1}`;
}

/** The engine's metrics for a row, or null when the row is not counted. */
export function rowMetrics(row: CalcRow, mode: CalculatorMode): AcademicCourseMetrics | null {
  const code = row.code.trim().toUpperCase() || 'VAR';
  if (mode === 'grade') {
    if (!row.grade) return null;
    return computeCourseMetrics({ code, title: '', units: row.units, grade: row.grade, caScore: null, examScore: null });
  }
  const score = validScore(row.scoreText);
  if (score === null) return null;
  // The same split as always: 30% CA (max 30), 70% exam, total = the score.
  return computeCourseMetrics({
    code,
    title: '',
    units: row.units,
    caScore: Math.min(DEFAULT_SCALE.scoreSplit.ca, score * 0.3),
    examScore: Math.max(0, score * 0.7),
  });
}

export interface PriorRecord {
  cgpa: number;
  units: number;
}

/** A valid "CGPA so far" pair, or null. */
export function readPrior(cgpaText: string, unitsText: string): PriorRecord | null {
  const cgpa = parseDecimal(cgpaText);
  const units = parseDecimal(unitsText);
  if (cgpa === null || units === null) return null;
  if (cgpa < 0 || cgpa > DEFAULT_SCALE.maxPoint || !Number.isInteger(units) || units < 1) return null;
  return { cgpa, units };
}

export function priorCgpaError(text: string): string | null {
  if (!text.trim()) return null;
  const value = parseDecimal(text);
  return value === null || value < 0 || value > DEFAULT_SCALE.maxPoint ? PRIOR_CGPA_ERROR : null;
}

export function priorUnitsError(text: string): string | null {
  if (!text.trim()) return null;
  const value = parseDecimal(text);
  return value === null || !Number.isInteger(value) || value < 1 ? PRIOR_UNITS_ERROR : null;
}

/** Removes floating-point noise for printing sums (3.7999999 → 3.8). */
export function clean(value: number): number {
  return Number(value.toPrecision(12));
}

export interface CountedRow {
  row: CalcRow;
  index: number;
  metrics: AcademicCourseMetrics;
  /** Score in score mode, else null. */
  score: number | null;
}

export interface CalculationResult {
  mode: CalculatorMode;
  counted: CountedRow[];
  /** Rows with something in them that count or could count. */
  total: number;
  /** Semester figures (unrounded), or null when nothing is counted. */
  semester: { gpa: number; pi: number; units: number; courses: number; points: number; piSum: number } | null;
  prior: PriorRecord | null;
  /** CGPA with the prior record, or null without one. */
  cumulative: { cgpa: number; units: number; points: number } | null;
  /** The figure on gold: the CGPA with a prior record, else the semester GPA. */
  headline: { label: 'CGPA' | 'Semester GPA'; value: number } | null;
  classBand: PublicClassBand | null;
  /** Rounded distance to the next class and that class, or null at the top. */
  next: { band: PublicClassBand; gap: number } | null;
  carryOvers: { label: string; units: number }[];
  duplicates: string[];
  /** Weighted average score out of 100 (score mode only). */
  average: number | null;
}

/** Everything the slip, receipt and aside print. */
export function computeCalculation(input: {
  mode: CalculatorMode;
  rows: readonly CalcRow[];
  priorCgpa?: string;
  priorUnits?: string;
}): CalculationResult {
  const { mode, rows } = input;
  const counted: CountedRow[] = [];
  rows.forEach((row, index) => {
    const metrics = rowMetrics(row, mode);
    if (metrics) counted.push({ row, index, metrics, score: mode === 'score' ? validScore(row.scoreText) : null });
  });

  const totals = computeSemesterGPA(counted.map((entry) => entry.metrics));
  const points = counted.reduce((sum, entry) => sum + entry.metrics.gradePoint * entry.metrics.units, 0);
  const piSum = clean(counted.reduce((sum, entry) => sum + clean(entry.metrics.piPoint * entry.metrics.units), 0));
  const semester = counted.length
    ? { gpa: totals.gpa, pi: totals.pi, units: totals.creditLoaded, courses: counted.length, points, piSum }
    : null;

  const prior = readPrior(input.priorCgpa ?? '', input.priorUnits ?? '');
  let cumulative: CalculationResult['cumulative'] = null;
  if (prior) {
    const result = computeCumulativeCGPA([
      { gpa: prior.cgpa, pi: prior.cgpa, creditLoaded: prior.units },
      { gpa: semester?.gpa ?? 0, pi: semester?.pi ?? 0, creditLoaded: semester?.units ?? 0 },
    ]);
    cumulative = { cgpa: result.cgpa, units: result.totalCredits, points: clean(prior.cgpa * prior.units + points) };
  }

  const headline: CalculationResult['headline'] = cumulative
    ? { label: 'CGPA', value: cumulative.cgpa }
    : semester
      ? { label: 'Semester GPA', value: semester.gpa }
      : null;
  const classBand = headline ? publicClassFor(headline.value) : null;
  let next: CalculationResult['next'] = null;
  if (headline && classBand) {
    const bands = DEFAULT_SCALE.classBands;
    const index = bands.indexOf(classBand);
    const above = index > 0 ? bands[index - 1] : null;
    if (above) next = { band: above, gap: roundCgpa(above.min - roundCgpa(headline.value)) };
  }

  const carryOvers = counted
    .filter((entry) => isCarryOver(entry.metrics))
    .map((entry) => ({ label: rowLabel(entry.row, entry.index), units: entry.row.units }));

  const warning = creditLoadWarnings(rows.map((row) => ({ code: row.code, units: row.units })))[0];
  const duplicates =
    warning?.kind === 'duplicate_codes'
      ? warning.codes.map((code) => {
          const first = rows.find((row) => normaliseCourseCode(row.code) === code);
          return first ? first.code.trim().toUpperCase() : code;
        })
      : [];

  let average: number | null = null;
  if (mode === 'score' && counted.length) {
    average = weightedAverageScore(counted.map((entry) => ({ units: entry.row.units, totalScore: entry.score }))).average;
  }

  return {
    mode,
    counted,
    total: rows.length,
    semester,
    prior,
    cumulative,
    headline,
    classBand,
    next,
    carryOvers,
    duplicates,
    average,
  };
}

/** "0.08 to First Class", "The top class on this scale", or the no-prior prompt. */
export function gapLine(result: CalculationResult): string | null {
  if (!result.headline) return null;
  if (!result.cumulative) return 'Add your CGPA so far to see your class.';
  if (!result.next) return 'The top class on this scale';
  return `${result.next.gap.toFixed(2)} to ${result.next.band.label}`;
}

/** "Semester GPA 4.15 · PI 4.15 · 13 units · 5 courses · …" */
export function summaryLine(result: CalculationResult): string {
  if (!result.semester && !result.cumulative) return 'No courses counted yet';
  const parts: string[] = [];
  if (result.semester) {
    const { gpa, pi, units, courses } = result.semester;
    parts.push(
      `Semester GPA ${formatCgpa(gpa)}`,
      `PI ${formatCgpa(pi)}`,
      `${units} unit${units === 1 ? '' : 's'}`,
      `${courses} course${courses === 1 ? '' : 's'}`
    );
  } else {
    parts.push('No courses counted yet');
  }
  if (result.cumulative) parts.push(`CGPA ${formatCgpa(result.cumulative.cgpa)} over ${result.cumulative.units} units`);
  if (result.mode === 'grade' && result.semester) parts.push('With letter grades, PI equals your GPA.');
  return parts.join(' · ');
}

/** The sentence the polite live region reads once the input settles. */
export function announcement(result: CalculationResult): string {
  if (!result.semester && !result.cumulative) return 'No courses counted yet.';
  const parts: string[] = [];
  if (result.semester) parts.push(`Semester GPA ${formatCgpa(result.semester.gpa)}. PI ${formatCgpa(result.semester.pi)}.`);
  if (result.cumulative && result.classBand) parts.push(`CGPA ${formatCgpa(result.cumulative.cgpa)}, ${result.classBand.label}.`);
  return parts.join(' ');
}

/** The rows as written to the link: only the active value. */
export function toEncodedRows(rows: readonly CalcRow[], mode: CalculatorMode): EncodedRow[] {
  return rows.map((row) => {
    if (mode === 'grade') return { c: row.code, u: row.units, g: row.grade ?? undefined };
    const score = parseDecimal(row.scoreText);
    return { c: row.code, u: row.units, s: score ?? undefined };
  });
}

/** Switching letters ↔ scores keeps what each row knew; nothing is invented. */
export function switchMode(rows: readonly CalcRow[], to: CalculatorMode): CalcRow[] {
  if (to === 'grade') {
    return rows.map((row) => {
      const score = validScore(row.scoreText);
      return score === null ? row : { ...row, grade: gradeFromScore(score).grade };
    });
  }
  return rows.map((row) => ({ ...row }));
}

/** Notes printed above the perforation, in order (the slip shows the first two). */
export interface CalcNote {
  kind: 'carry' | 'duplicate' | 'left-out' | 'shared' | 'unreadable' | 'reset';
  text: string;
}

export function slipNotes(
  result: CalculationResult,
  flags: { shared?: boolean; unreadable?: boolean; reset?: boolean } = {}
): CalcNote[] {
  const notes: CalcNote[] = [];
  const carry = result.carryOvers;
  if (carry.length) {
    const names = carry.map((entry) => entry.label).join(', ');
    notes.push({ kind: 'carry', text: `${carry.length} carry-over${carry.length === 1 ? '' : 's'} on this slip: ${names}.` });
  }
  for (const code of result.duplicates) {
    notes.push({ kind: 'duplicate', text: `${code} is on this slip twice. Remove one if it was a mistake.` });
  }
  if (result.mode === 'score' && result.total > 0 && result.counted.length < result.total) {
    notes.push({
      kind: 'left-out',
      text: `Counted: ${result.counted.length} of ${result.total} course${result.total === 1 ? '' : 's'}. Enter a score from 0 to 100 for the rest.`,
    });
  }
  if (flags.shared) notes.push({ kind: 'shared', text: "These courses came from a shared link. Changes you make here don't affect the person who sent it." });
  if (flags.unreadable) notes.push({ kind: 'unreadable', text: "This link couldn't be read, so the calculator started fresh." });
  if (flags.reset) notes.push({ kind: 'reset', text: "Some values in this link were outside the calculator's range and were reset. Check the marked rows." });
  return notes;
}

/** The carry-over tool's prefill from this slip (calculator.md §5.1 notes line 1). */
export function carryOverHref(result: CalculationResult): string {
  const params = new URLSearchParams();
  if (result.headline) params.set('current', formatCgpa(result.headline.value));
  const done = result.cumulative?.units ?? result.semester?.units;
  if (done) params.set('done', String(done));
  if (result.carryOvers[0]) params.set('failed', String(result.carryOvers[0].units));
  const query = params.toString();
  return `/tools/carry-over-impact${query ? `?${query}` : ''}`;
}

export interface NextQuestion {
  name: string;
  hint: string;
  href: string;
}

/** The four tools beside the result, with live hints and prefill (calculator.md §5.1 "Next questions"). */
export function nextQuestions(result: CalculationResult, rows: readonly CalcRow[]): NextQuestion[] {
  const value = result.headline ? formatCgpa(result.headline.value) : null;
  const done = result.cumulative?.units ?? result.semester?.units ?? null;
  const target = result.next?.band.label ?? 'First Class';
  const requiredParams = new URLSearchParams();
  if (value) requiredParams.set('current', value);
  if (value && done) requiredParams.set('done', String(done));
  const requiredQuery = requiredParams.toString();

  let weightedHref = '/tools/weighted-average';
  let weightedHint = 'My average score out of 100';
  if (result.mode === 'score' && result.average !== null) {
    weightedHint = `${result.average.toFixed(1)} from these scores`;
    weightedHref = `/tools/weighted-average?${new URLSearchParams({ c: encodeRows(toEncodedRows(rows, 'score')) }).toString()}`;
  } else if (result.mode === 'grade' && result.semester) {
    weightedHint = 'Needs scores out of 100';
  }

  return [
    {
      name: 'Degree class checker',
      hint: value && result.classBand ? `${value} is ${result.classBand.label}` : 'Which class is my CGPA?',
      href: value ? `/tools/degree-class-checker?cgpa=${value}` : '/tools/degree-class-checker',
    },
    {
      name: 'Required GPA',
      hint: value ? (result.next ? `What you need for ${target}` : 'What you need to stay in First Class') : 'What do I need for my target?',
      href: `/tools/required-gpa${requiredQuery ? `?${requiredQuery}` : ''}`,
    },
    {
      name: 'Carry-over impact',
      hint: result.carryOvers.length
        ? `${result.carryOvers.length} carry-over${result.carryOvers.length === 1 ? '' : 's'} on this slip`
        : value
          ? 'If you retake a failed course'
          : 'What will a retake do?',
      href: carryOverHref(result),
    },
    { name: 'Weighted average score', hint: weightedHint, href: weightedHref },
  ];
}

/** The three rows every first visit starts with (GPA 4.13). */
export function defaultRows(): CalcRow[] {
  return [
    { id: 'r1', code: '', units: 3, grade: 'A', scoreText: '' },
    { id: 'r2', code: '', units: 3, grade: 'B', scoreText: '' },
    { id: 'r3', code: '', units: 2, grade: 'C', scoreText: '' },
  ];
}

/** The example student's slip (letters A B C A B, scores 76 65 56 72 61). */
export function exampleRows(makeId: () => string): CalcRow[] {
  return EXAMPLE_COURSES.map((course) => {
    const score = course.ca + course.exam;
    return { id: makeId(), code: course.code, units: course.units, grade: gradeFromScore(score).grade, scoreText: String(score) };
  });
}

/** Rows for the save handoff (lib/handoff/calculator.ts cleans them). */
export function handoffCourses(rows: readonly CalcRow[], mode: CalculatorMode) {
  return rows.map((row) => ({
    code: row.code,
    units: row.units,
    grade: mode === 'grade' ? row.grade ?? undefined : undefined,
    score: mode === 'score' ? validScore(row.scoreText) ?? undefined : undefined,
  }));
}
