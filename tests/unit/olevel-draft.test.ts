import { describe, expect, it } from 'vitest';
import { draftFromRecord, emptySitting, recordFromDraft, type OlevelDraft } from '@/lib/records/draft';

describe('draftFromRecord', () => {
  it('starts a new student with one sitting that already lists English and Maths', () => {
    const draft = draftFromRecord(null, 2026);
    expect(draft.sittings).toHaveLength(1);
    expect(draft.sittings[0]).toMatchObject({ exam: 'waec', year: null });
    expect(draft.sittings[0].rows.slice(0, 2).map((row) => [row.subjectId, row.grade])).toEqual([['english', ''], ['mathematics', '']]);
    expect(draft.sittings[0].rows).toHaveLength(5);
  });

  it('loads a saved record with its course subjects', () => {
    const draft = draftFromRecord({
      sittings: [{ id: 's1', exam: 'neco', year: 2025, subjects: [{ subjectId: 'english', name: 'English Language', grade: 'B3' }] }],
      targetCourse: { name: 'Medicine', required: ['biology', ['physics', 'chemistry']] },
    }, 2026);
    expect(draft.sittings[0]).toMatchObject({ id: 's1', exam: 'neco', year: 2025 });
    expect(draft.sittings[0].rows[0]).toMatchObject({ subjectId: 'english', grade: 'B3' });
    expect(draft).toMatchObject({ courseName: 'Medicine', required: ['biology', 'physics', 'chemistry'] });
  });
});

describe('recordFromDraft', () => {
  const base = (): OlevelDraft => ({
    courseName: '',
    required: [],
    sittings: [{
      ...emptySitting('s1', 2024),
      rows: [
        { key: 'a', subjectId: 'english', name: 'English Language', grade: 'C4' },
        { key: 'b', subjectId: 'mathematics', name: 'Mathematics', grade: '' },
        { key: 'c', subjectId: '', name: '', grade: '' },
      ],
    }],
  });

  it('skips empty rows and flags a subject with no grade', () => {
    const { record, problems } = recordFromDraft(base());
    expect(record.sittings[0].subjects.map((row) => row.subjectId)).toEqual(['english']);
    expect(problems).toEqual([{ sitting: 0, row: 1, field: 'grade', message: 'Pick the grade for Mathematics.' }]);
  });

  it('flags a grade with no subject, a repeated subject and a missing year', () => {
    const draft = base();
    draft.sittings[0].year = null;
    draft.sittings[0].rows[1] = { key: 'b', subjectId: 'english', name: 'English Language', grade: 'B2' };
    draft.sittings[0].rows[2] = { key: 'c', subjectId: '', name: '', grade: 'A1' };
    const { problems } = recordFromDraft(draft);
    expect(problems.map((problem) => problem.message)).toEqual([
      'Pick the year you sat it.',
      'English Language is already in this sitting.',
      'Pick the subject for this grade.',
    ]);
  });

  it('drops a sitting with nothing filled in, and keeps the course', () => {
    const draft = base();
    draft.sittings.push(emptySitting('s2', 2025));
    draft.courseName = 'Law';
    draft.required = ['literature'];
    const { record } = recordFromDraft(draft);
    expect(record.sittings).toHaveLength(1);
    expect(record.targetCourse).toEqual({ name: 'Law', required: ['literature'] });
  });
});
