import { describe, expect, it } from 'vitest';
import {
  describeAggregateStep,
  describeOlevel,
  describePostUtmeNeeded,
  formatScore,
  olevelNextAction,
  subjectLabel,
} from '@/lib/records/summary';
import type { OlevelRecord, OlevelSitting } from '@/lib/records/olevelRules';

const sitting = (id: string, rows: [string, string, string][]): OlevelSitting => ({
  id, exam: 'waec', year: 2024,
  subjects: rows.map(([subjectId, name, grade]) => ({ subjectId, name, grade: grade as 'A1' })),
});

const five: [string, string, string][] = [
  ['english', 'English Language', 'C4'], ['mathematics', 'Mathematics', 'B3'], ['physics', 'Physics', 'C5'],
  ['chemistry', 'Chemistry', 'C6'], ['biology', 'Biology', 'B2'],
];

describe('describeOlevel', () => {
  it('asks for a first sitting when nothing is entered', () => {
    const status = describeOlevel({ sittings: [] });
    expect(status.state).toBe('empty');
    expect(status.headline).toBe('Add your first sitting');
  });

  it('says the rule is met with the credit count', () => {
    const status = describeOlevel({ sittings: [sitting('s1', five)] });
    expect(status).toMatchObject({ state: 'meets', creditCount: 5, headline: '5 credits, including English and Maths' });
  });

  it('names a missing core subject in plain words', () => {
    const rows = five.map((row) => (row[0] === 'mathematics' ? ['mathematics', 'Mathematics', 'D7'] : row)) as [string, string, string][];
    const status = describeOlevel({ sittings: [sitting('s1', [...rows, ['economics', 'Economics', 'A1']])] });
    expect(status.state).toBe('short');
    expect(status.headline).toBe('5 credits, but no credit in Mathematics');
    expect(status.missing).toEqual(['Mathematics']);
  });

  it('counts how many more credits are needed', () => {
    const status = describeOlevel({ sittings: [sitting('s1', five.slice(0, 3))] });
    expect(status.headline).toBe('3 of 5 credits');
    expect(status.detail).toBe('You need 2 more credits.');
  });

  it('mentions awaited results and never counts them', () => {
    const status = describeOlevel({ sittings: [sitting('s1', [...five.slice(0, 4), ['biology', 'Biology', 'AR']])] });
    expect(status.creditCount).toBe(4);
    expect(status.state).toBe('awaiting');
    expect(status.detail).toBe('1 result still awaited. You need 1 more credit.');
  });

  it('lists course subjects, any-of groups joined with "or"', () => {
    const record: OlevelRecord = { sittings: [sitting('s1', five)], targetCourse: { name: 'Economics', required: ['economics', ['geography', 'government']] } };
    const status = describeOlevel(record);
    expect(status.state).toBe('short');
    expect(status.missing).toEqual(['Economics', 'Geography or Government']);
    expect(status.headline).toBe('5 credits, but no credit in Economics and Geography or Government');
    expect(status.detail).toBe('You have five credits with English and Maths. Your course also needs these subjects.');
  });
});

describe('olevelNextAction', () => {
  it('points to the first sitting, then the second when short', () => {
    expect(olevelNextAction({ sittings: [] })).toEqual({ label: 'Add your WAEC or NECO result', href: '/olevel' });
    expect(olevelNextAction({ sittings: [sitting('s1', five.slice(0, 3))] })).toEqual({ label: 'Add your second sitting', href: '/olevel#sittings' });
    expect(olevelNextAction({ sittings: [sitting('s1', five)] })).toBeNull();
  });
});

describe('subjectLabel', () => {
  it('uses the catalogue name, then the stored name for custom subjects', () => {
    expect(subjectLabel('mathematics')).toBe('Mathematics');
    expect(subjectLabel('custom:hausa literature', 'Hausa Literature')).toBe('Hausa Literature');
    expect(subjectLabel('custom:x')).toBe('x');
  });
});

describe('aggregate copy', () => {
  it('shows each step as working', () => {
    expect(describeAggregateStep({ part: 'utme', raw: 245, max: 400, weight: 50, value: 30.63 })).toEqual({
      label: 'UTME', working: '245 ÷ 400 × 50', value: '30.63', outOf: '50',
    });
    expect(describeAggregateStep({ part: 'olevel', raw: 16.8, max: 20, weight: 20, value: 16.8, subjects: [] }).label).toBe('O-level (five subjects)');
    expect(describeAggregateStep({ part: 'postUtme', raw: 62.5, max: 100, weight: 30, value: 18.75 }).working).toBe('62.5 ÷ 100 × 30');
  });

  it('formats scores without trailing zeros', () => {
    expect(formatScore(30)).toBe('30');
    expect(formatScore(30.5)).toBe('30.5');
    expect(formatScore(30.625)).toBe('30.63');
  });

  it('explains the post-UTME score needed in plain words', () => {
    expect(describePostUtmeNeeded({ status: 'needed', score: 71.5, max: 100 })).toBe('You need about 71.5 out of 100 in the post-UTME.');
    expect(describePostUtmeNeeded({ status: 'met' })).toBe('Your UTME and O-level already reach that target.');
    expect(describePostUtmeNeeded({ status: 'out-of-reach' })).toBe("That target is out of reach with this formula, even with full marks in the post-UTME.");
    expect(describePostUtmeNeeded({ status: 'incomplete' })).toBe('Add your UTME score and five O-level grades first.');
    expect(describePostUtmeNeeded({ status: 'no-post-utme' })).toBe('This formula has no post-UTME part.');
  });
});
