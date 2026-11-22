/**
 * Plain-words summaries of the Phase 2 records for the student screens and the
 * dashboard. Web only (Android writes its own copy from the same engine data).
 */

import { checkOlevelRequirements, type OlevelRecord } from '@/lib/records/olevelRules';
import { CUSTOM_SUBJECT_PREFIX, OLEVEL_SUBJECTS } from '@/lib/records/olevelSubjects';
import type { AggregateStep, PostUtmeNeeded } from '@/lib/records/admissionRules';

const CATALOGUE = new Map(OLEVEL_SUBJECTS.map((subject) => [subject.id, subject.name]));

/** The name to show for a subject id: the catalogue name, the stored name, or the custom key. */
export function subjectLabel(subjectId: string, storedName?: string): string {
  const known = CATALOGUE.get(subjectId);
  if (known) return known;
  if (storedName && storedName.trim()) return storedName.trim();
  return subjectId.startsWith(CUSTOM_SUBJECT_PREFIX) ? subjectId.slice(CUSTOM_SUBJECT_PREFIX.length) : subjectId;
}

export interface OlevelStatus {
  state: 'empty' | 'meets' | 'short' | 'awaiting';
  headline: string;
  detail: string;
  creditCount: number;
  /** Subjects (or "A or B" groups) that still need a credit. */
  missing: string[];
}

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

export function describeOlevel(record: OlevelRecord): OlevelStatus {
  const entered = record.sittings.some((sitting) => sitting.subjects.length > 0);
  if (!entered) {
    return { state: 'empty', headline: 'Add your first sitting', detail: 'Enter your subjects and grades from your WAEC or NECO result.', creditCount: 0, missing: [] };
  }
  const result = checkOlevelRequirements(record.sittings, { required: record.targetCourse?.required ?? [] });
  const names = new Map(result.combined.map((subject) => [subject.subjectId, subject.name]));
  const missing = result.missing.map((group) => group.map((id) => subjectLabel(id, names.get(id))).join(' or '));
  const count = result.creditCount;
  if (result.meets) {
    return {
      state: 'meets',
      headline: `${plural(count, 'credit')}, including English and Maths`,
      detail: 'That meets the usual rule for admission: five credits, English and Maths among them, in at most two sittings.',
      creditCount: count,
      missing,
    };
  }
  const parts: string[] = [];
  if (result.awaiting > 0) parts.push(`${plural(result.awaiting, 'result')} still awaited.`);
  if (result.creditsShort > 0) parts.push(`You need ${plural(result.creditsShort, 'more credit')}.`);
  if (missing.length > 0) parts.push(`Still needed: a credit in ${missing.join(', ')}.`);
  const coreMissing = result.required.slice(0, 2).filter((group) => !group.met).map((group) => subjectLabel(group.ids[0]));
  const headline = result.creditsShort > 0
    ? `${count} of ${result.minCredits} credits`
    : coreMissing.length > 0
      ? `${plural(count, 'credit')}, but no credit in ${coreMissing.join(' or ')}`
      : `${plural(count, 'credit')}, course subjects missing`;
  return {
    state: result.awaiting > 0 ? 'awaiting' : 'short',
    headline,
    detail: result.creditsShort > 0 || result.awaiting > 0
      ? parts.filter((part) => !part.startsWith('Still needed') || result.creditsShort === 0).join(' ')
      : parts.join(' '),
    creditCount: count,
    missing,
  };
}

/** The one next step for the dashboard, or null when nothing is pending. */
export function olevelNextAction(record: OlevelRecord): { label: string; href: string } | null {
  const status = describeOlevel(record);
  if (status.state === 'empty') return { label: 'Add your WAEC or NECO result', href: '/olevel' };
  if (status.state === 'meets') return null;
  if (record.sittings.length < 2) return { label: 'Add your second sitting', href: '/olevel#sittings' };
  return { label: "See what's missing", href: '/olevel' };
}

/** Up to 2 decimals, no trailing zeros, round half up. */
export function formatScore(value: number): string {
  const rounded = Math.round(Number((value * 100).toFixed(6))) / 100;
  return String(rounded);
}

const PART_LABEL: Record<AggregateStep['part'], string> = {
  utme: 'UTME',
  olevel: 'O-level (five subjects)',
  postUtme: 'Post-UTME',
};

/** One line of the working: "245 ÷ 400 × 50" = "30.63" out of "50". */
export function describeAggregateStep(step: AggregateStep): { label: string; working: string; value: string; outOf: string } {
  return {
    label: PART_LABEL[step.part],
    working: `${formatScore(step.raw)} ÷ ${formatScore(step.max)} × ${formatScore(step.weight)}`,
    value: formatScore(step.value),
    outOf: formatScore(step.weight),
  };
}

export function describePostUtmeNeeded(result: PostUtmeNeeded): string {
  switch (result.status) {
    case 'needed':
      return `You need about ${formatScore(result.score)} out of ${formatScore(result.max)} in the post-UTME.`;
    case 'met':
      return 'Your UTME and O-level already reach that target.';
    case 'out-of-reach':
      return 'That target is out of reach with this formula, even with full marks in the post-UTME.';
    case 'incomplete':
      return 'Add your UTME score and five O-level grades first.';
    case 'no-post-utme':
      return 'This formula has no post-UTME part.';
    case 'invalid-target':
      return 'Enter a target from 0 to 100.';
    default:
      return 'Fix the scores above first.';
  }
}
