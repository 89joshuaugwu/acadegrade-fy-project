import {
  OLEVEL_EXAMS,
  OLEVEL_GRADES,
  checkOlevelRequirements,
  type OlevelGrade,
  type OlevelGradeKind,
  type OlevelSitting,
} from '@/lib/records/olevelRules';
import { OLEVEL_SUBJECTS } from '@/lib/records/olevelSubjects';
import {
  ESTIMATE_NOTE,
  UTME_MAX,
  computeAggregate,
  formulaById,
  postUtmeNeeded,
  validatePostUtme,
  validateUtme,
  validateWeights,
  type AggregateInput,
  type AggregatePart,
  type AggregateWeights,
} from '@/lib/records/admissionRules';
import type { AdmissionLink, OlevelLink } from '@/components/public/tools/records-url';
import { parseNumber } from './tool-math';

/**
 * The two record tools as plain data (no React, so the hub's server
 * component and the tests can call it): the WAEC credit checker's verdict and
 * the admission aggregate's working. The maths is the shared engine in
 * lib/records (byte-identical with Android); this file only turns its data
 * into the sentences the pages show.
 */

/* ------------------------------------------------------------- O-level */

export const GRADE_KIND: Record<OlevelGrade, OlevelGradeKind> = Object.fromEntries(OLEVEL_GRADES.map((band) => [band.grade, band.kind])) as Record<
  OlevelGrade,
  OlevelGradeKind
>;

export const examShort = (exam: string) => OLEVEL_EXAMS.find((entry) => entry.id === exam)?.short ?? 'WAEC';
const subjectName = (id: string) => OLEVEL_SUBJECTS.find((subject) => subject.id === id)?.name ?? id;
const CORE_NAMES = 'English Language and Mathematics';

function listWords(items: readonly string[], joiner = 'and'): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} ${joiner} ${items[items.length - 1]}`;
}

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

/** The worked example: five credits in one sitting without Maths; the NECO sitting brings Maths up to a C6. */
export const WAEC_EXAMPLE: OlevelLink = {
  sittings: [
    {
      exam: 'waec',
      year: 2025,
      subjects: [
        { subjectId: 'english', name: 'English Language', grade: 'C5' },
        { subjectId: 'mathematics', name: 'Mathematics', grade: 'D7' },
        { subjectId: 'biology', name: 'Biology', grade: 'B3' },
        { subjectId: 'chemistry', name: 'Chemistry', grade: 'C6' },
        { subjectId: 'physics', name: 'Physics', grade: 'E8' },
        { subjectId: 'agricultural-science', name: 'Agricultural Science', grade: 'C4' },
        { subjectId: 'civic-education', name: 'Civic Education', grade: 'B2' },
        { subjectId: 'economics', name: 'Economics', grade: 'F9' },
        { subjectId: 'geography', name: 'Geography', grade: 'D7' },
      ],
    },
    {
      exam: 'neco',
      year: 2025,
      subjects: [
        { subjectId: 'mathematics', name: 'Mathematics', grade: 'C6' },
        { subjectId: 'physics', name: 'Physics', grade: 'D7' },
        { subjectId: 'economics', name: 'Economics', grade: 'E8' },
      ],
    },
  ],
  required: [],
};

export interface WaecRow {
  subjectId: string;
  name: string;
  grade: OlevelGrade;
  /** 1 or 2. */
  sitting: number;
  exam: string;
  credit: boolean;
  kind: OlevelGradeKind;
}

export interface WaecView {
  /** At least one subject has a grade. */
  started: boolean;
  credits: number;
  minCredits: number;
  meets: boolean;
  /** Subject names still without a credit (English, Maths, course subjects). */
  missing: string[];
  creditsShort: number;
  rows: WaecRow[];
  sittingsUsed: number;
  /** One sentence for the result card and the live region. */
  verdict: string;
  announce: string;
}

/** The engine's sittings from the page's rows: only rows with a subject and a grade count. */
export function sittingsFromLink(link: OlevelLink): OlevelSitting[] {
  return link.sittings.map((sitting, index) => ({
    id: `s${index + 1}`,
    exam: sitting.exam,
    year: sitting.year ?? 0,
    subjects: sitting.subjects
      .filter((subject) => subject.subjectId && subject.grade)
      .map((subject) => ({ subjectId: subject.subjectId, name: subject.name, grade: subject.grade as OlevelGrade })),
  }));
}

export function waecView(link: OlevelLink): WaecView {
  const sittings = sittingsFromLink(link);
  const result = checkOlevelRequirements(sittings, { required: link.required });
  const rows: WaecRow[] = result.combined.map((subject) => ({
    subjectId: subject.subjectId,
    name: subject.name || subjectName(subject.subjectId),
    grade: subject.grade as OlevelGrade,
    sitting: subject.sittingIndex + 1,
    exam: examShort(link.sittings[subject.sittingIndex]?.exam ?? 'waec'),
    credit: subject.credit,
    kind: GRADE_KIND[subject.grade as OlevelGrade] ?? 'fail',
  }));
  const missing = result.missing.map((ids) => listWords(ids.map(subjectName), 'or'));
  const started = rows.length > 0;
  const withCourse = link.required.length > 0;
  let verdict: string;
  if (!started) verdict = 'Pick a grade for each subject to see your credits.';
  else if (result.meets) verdict = `You have five credits including ${withCourse ? 'English Language, Mathematics and your course subjects' : CORE_NAMES}.`;
  else {
    const parts: string[] = [];
    if (missing.length) parts.push(`you need a credit in ${listWords(missing)}`);
    if (result.creditsShort > 0) parts.push(`${plural(result.creditsShort, 'more credit')} to make five`);
    verdict = `Not yet: ${listWords(parts)}.`;
  }
  const announce = started ? `${plural(result.creditCount, 'credit')}. ${verdict}` : 'Your credits appear here.';
  return {
    started,
    credits: result.creditCount,
    minCredits: result.minCredits,
    meets: started && result.meets,
    missing,
    creditsShort: result.creditsShort,
    rows,
    sittingsUsed: result.sittingsUsed,
    verdict,
    announce,
  };
}

/* ----------------------------------------------------------- admission */

export const ADMISSION_EXAMPLE: AdmissionLink = {
  formula: 'utme-olevel-post',
  utme: '268',
  postScore: '62',
  postMax: '100',
  pointTable: 'four-to-two',
  grades: ['A1', 'B2', 'B3', 'C4', 'C5'],
  target: '70',
  weights: null,
};

/** The five O-level slots: English, Mathematics, then three course subjects. */
export const ADMISSION_SLOTS = ['English Language', 'Mathematics', 'Third subject', 'Fourth subject', 'Fifth subject'] as const;

const PART_LABEL: Record<AggregatePart, string> = { utme: 'UTME', olevel: 'O-level', postUtme: 'Post-UTME' };
const PART_MISSING: Record<AggregatePart, string> = { utme: 'your UTME score', olevel: 'all five O-level grades', postUtme: 'your post-UTME score' };

/** 16 → "16", 16.4 → "16.4", 62.5 → "62.5". */
const plain = (value: number) => String(Number(value.toFixed(2)));

export interface AdmissionStep {
  part: AggregatePart;
  label: string;
  working: string;
  /** Two decimals. */
  value: string;
  weight: number;
  subjects?: { slot: string; grade: string; points: string }[];
}

export interface AdmissionErrors {
  utme?: string;
  postScore?: string;
  postMax?: string;
  target?: string;
  weights?: string;
}

export interface AdmissionView {
  weights: AggregateWeights;
  usesOlevel: boolean;
  usesPost: boolean;
  /** Errors for each field, shown once the field has been left. */
  errors: AdmissionErrors;
  steps: AdmissionStep[];
  aggregate: number | null;
  partial: number;
  /** Something has been worked out. */
  started: boolean;
  missingLine: string | null;
  targetLine: string | null;
  announce: string;
}

const isBlank = (text: string) => text.trim() === '';

export function admissionView(link: AdmissionLink): AdmissionView {
  const errors: AdmissionErrors = {};
  const formula = formulaById(link.formula) ?? formulaById('utme-post')!;

  let weights: AggregateWeights = formula.weights ?? { utme: 50, olevel: 0, postUtme: 50 };
  let weightsOk = true;
  if (!formula.weights) {
    const typed = {
      utme: parseNumber(link.weights?.utme ?? '') ?? NaN,
      olevel: parseNumber(link.weights?.olevel ?? '') ?? 0,
      postUtme: parseNumber(link.weights?.postUtme ?? '') ?? 0,
    };
    const check = validateWeights(typed);
    if (check.ok) weights = typed;
    else {
      weightsOk = false;
      const sum = [typed.utme, typed.olevel, typed.postUtme].reduce((total, value) => total + (Number.isFinite(value) ? value : 0), 0);
      errors.weights =
        check.code === 'weights-sum'
          ? `The three shares must add up to 100. They add up to ${plain(sum)} now.`
          : check.code === 'weights-utme' || check.code === 'weights-missing'
            ? 'Give UTME a share above 0, and the shares a total of 100.'
            : 'Each share must be from 0 to 100.';
    }
  }

  const utmeNumber = isBlank(link.utme) ? null : parseNumber(link.utme);
  let utme: number | null = null;
  if (!isBlank(link.utme)) {
    const check = validateUtme(utmeNumber ?? NaN);
    if (check.ok) utme = utmeNumber;
    else errors.utme = check.code === 'not-whole' ? 'UTME scores are whole numbers, from 0 to 400.' : `Enter a UTME score from 0 to ${UTME_MAX}.`;
  }

  const maxNumber = parseNumber(link.postMax);
  const maxOk = maxNumber !== null && Number.isInteger(maxNumber) && maxNumber >= 1 && maxNumber <= 400;
  if (!maxOk) errors.postMax = 'Enter what the post-UTME is out of, a whole number from 1 to 400.';
  const postMax = maxOk ? (maxNumber as number) : 100;
  let postScore: number | null = null;
  if (!isBlank(link.postScore)) {
    const value = parseNumber(link.postScore);
    const check = validatePostUtme(value ?? NaN, postMax);
    if (check.ok) {
      if (maxOk) postScore = value;
    } else errors.postScore = check.code === 'decimals' ? 'Use at most two decimals.' : `Enter a post-UTME score from 0 to ${postMax}.`;
  }

  const grades = link.grades.filter((grade): grade is OlevelGrade => Boolean(grade));
  const input: AggregateInput = {
    formula: formula.id,
    utme,
    postUtme: { score: postScore, max: postMax },
    olevelGrades: grades,
    weights: formula.id === 'custom' && weightsOk ? weights : null,
    pointTable: link.pointTable,
  };
  const result = weightsOk ? computeAggregate(input) : null;

  const steps: AdmissionStep[] = (result?.steps ?? []).map((step) => {
    const working =
      step.part === 'olevel'
        ? `${plain(step.raw)} points ÷ ${plain(step.max)} × ${plain(step.weight)}`
        : `${plain(step.raw)} ÷ ${plain(step.max)} × ${plain(step.weight)}`;
    let slot = 0;
    const subjects =
      step.part === 'olevel'
        ? link.grades.flatMap((grade, index) => {
            if (!grade) return [];
            const points = step.subjects?.[slot]?.points ?? 0;
            slot += 1;
            return [{ slot: ADMISSION_SLOTS[index], grade, points: plain(points) }];
          })
        : undefined;
    return { part: step.part, label: PART_LABEL[step.part], working, value: step.value.toFixed(2), weight: step.weight, ...(subjects ? { subjects } : {}) };
  });

  const missing = result?.missing ?? [];
  const missingLine = result && result.steps.length > 0 && !result.complete && missing.length ? `Add ${listWords(missing.map((part) => PART_MISSING[part]))} to finish.` : null;
  const aggregate = result?.aggregate ?? null;
  const partial = result?.partial ?? 0;
  const started = steps.length > 0;

  let targetLine: string | null = null;
  if (!isBlank(link.target)) {
    const target = parseNumber(link.target);
    if (target === null || target < 0 || target > 100) errors.target = 'Enter a target from 0 to 100.';
    else if (result) {
      const shown = plain(target);
      const need = postUtmeNeeded(input, target);
      const others = weights.olevel > 0 ? 'UTME and O-level points' : 'UTME points';
      switch (need.status) {
        case 'needed':
          targetLine = `To reach ${shown}, you need ${need.score.toFixed(2)} out of ${need.max} in post-UTME.`;
          break;
        case 'met':
          targetLine = `Your ${others} already reach ${shown}.`;
          break;
        case 'out-of-reach':
          targetLine = `${shown} is out of reach, even with full marks in post-UTME.`;
          break;
        case 'no-post-utme':
          targetLine = 'This formula has no post-UTME part.';
          break;
        default:
          targetLine = `Add ${weights.olevel > 0 ? 'your UTME score and all five O-level grades' : 'your UTME score'} to see the post-UTME score you need.`;
      }
    }
  }

  let announce = 'Your aggregate appears here.';
  if (aggregate !== null) announce = `Aggregate ${aggregate.toFixed(2)} out of 100. ${ESTIMATE_NOTE}`;
  else if (started) announce = `So far ${partial.toFixed(2)} of 100. ${missingLine ?? ''}`.trim();
  if (targetLine) announce = `${announce} ${targetLine}`;

  return {
    weights,
    usesOlevel: weights.olevel > 0,
    usesPost: weights.postUtme > 0,
    errors,
    steps,
    aggregate,
    partial,
    started,
    missingLine,
    targetLine,
    announce,
  };
}
