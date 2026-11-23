/**
 * The O-level editor's working copy. Rows may be half filled while the student
 * types; recordFromDraft turns the draft into an engine record (complete rows
 * only, so live results never count a half row) plus the problems to show when
 * they press Save.
 */

import type { OlevelEntryGrade, OlevelExam, OlevelRecord } from '@/lib/records/olevelRules';
import { ENGLISH_ID, MATHEMATICS_ID } from '@/lib/records/olevelSubjects';
import { subjectLabel } from '@/lib/records/summary';

export interface DraftRow {
  key: string;
  subjectId: string;
  name: string;
  grade: OlevelEntryGrade | '';
}

export interface DraftSitting {
  id: string;
  exam: OlevelExam;
  year: number | null;
  rows: DraftRow[];
}

export interface OlevelDraft {
  sittings: DraftSitting[];
  courseName: string;
  /** Course subjects on top of English and Maths (plain ids). */
  required: string[];
}

export interface DraftProblem {
  sitting: number;
  row?: number;
  field: 'subject' | 'grade' | 'year';
  message: string;
}

let rowCounter = 0;
export function newRow(subjectId = '', name = ''): DraftRow {
  rowCounter += 1;
  return { key: `row-${rowCounter}`, subjectId, name, grade: '' };
}

/** A new sitting: English and Maths listed (every result has them) and three blank rows. */
export function emptySitting(id: string, year: number | null = null): DraftSitting {
  return {
    id,
    exam: 'waec',
    year,
    rows: [newRow(ENGLISH_ID, subjectLabel(ENGLISH_ID)), newRow(MATHEMATICS_ID, subjectLabel(MATHEMATICS_ID)), newRow(), newRow(), newRow()],
  };
}

export function draftFromRecord(record: OlevelRecord | null, _currentYear: number): OlevelDraft {
  if (!record || record.sittings.length === 0) {
    return {
      sittings: [emptySitting('sitting-1')],
      courseName: record?.targetCourse?.name ?? '',
      required: flatRequired(record),
    };
  }
  return {
    sittings: record.sittings.map((sitting) => ({
      id: sitting.id,
      exam: sitting.exam,
      year: sitting.year,
      rows: sitting.subjects.map((row) => ({ ...newRow(row.subjectId, row.name), grade: row.grade })),
    })),
    courseName: record.targetCourse?.name ?? '',
    required: flatRequired(record),
  };
}

function flatRequired(record: OlevelRecord | null): string[] {
  const ids: string[] = [];
  for (const item of record?.targetCourse?.required ?? []) {
    for (const id of Array.isArray(item) ? item : [item]) if (!ids.includes(id)) ids.push(id);
  }
  return ids;
}

export function recordFromDraft(draft: OlevelDraft): { record: OlevelRecord; problems: DraftProblem[] } {
  const problems: DraftProblem[] = [];
  const sittings: OlevelRecord['sittings'] = [];
  draft.sittings.forEach((sitting, sittingIndex) => {
    // Nothing graded yet (only the listed English and Maths, say): not a sitting to save.
    if (!sitting.rows.some((row) => row.grade)) return;
    if (sitting.year === null) problems.push({ sitting: sittingIndex, field: 'year', message: 'Pick the year you sat it.' });
    const seen = new Set<string>();
    const subjects: OlevelRecord['sittings'][number]['subjects'] = [];
    sitting.rows.forEach((row, rowIndex) => {
      if (!row.subjectId && !row.grade) return;
      const name = row.name || subjectLabel(row.subjectId);
      if (!row.subjectId) {
        problems.push({ sitting: sittingIndex, row: rowIndex, field: 'subject', message: 'Pick the subject for this grade.' });
        return;
      }
      if (seen.has(row.subjectId)) {
        problems.push({ sitting: sittingIndex, row: rowIndex, field: 'subject', message: `${name} is already in this sitting.` });
        return;
      }
      seen.add(row.subjectId);
      if (!row.grade) {
        problems.push({ sitting: sittingIndex, row: rowIndex, field: 'grade', message: `Pick the grade for ${name}.` });
        return;
      }
      subjects.push({ subjectId: row.subjectId, name, grade: row.grade });
    });
    sittings.push({ id: sitting.id, exam: sitting.exam, year: sitting.year ?? 0, subjects });
  });
  const record: OlevelRecord = { sittings };
  const courseName = draft.courseName.trim();
  if (courseName || draft.required.length > 0) record.targetCourse = { name: courseName, required: [...draft.required] };
  return { record, problems: problems.sort((a, b) => a.sitting - b.sitting || (a.row ?? -1) - (b.row ?? -1)) };
}
