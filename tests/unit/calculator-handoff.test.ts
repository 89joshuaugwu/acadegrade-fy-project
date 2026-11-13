import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CALCULATOR_HANDOFF_KEY,
  CALCULATOR_HANDOFF_MAX_AGE_MS,
  clearCalculatorHandoff,
  handoffOfferLabel,
  handoffToCourseInputs,
  readCalculatorHandoff,
  saveCalculatorHandoff,
} from '@/lib/handoff/calculator';
import { computeCourseMetrics, computeSemesterGPA } from '@/lib/cgpa/calculator';

beforeEach(() => {
  sessionStorage.clear();
  vi.restoreAllMocks();
});

describe('calculator → account handoff', () => {
  it('round-trips the entered rows through sessionStorage', () => {
    expect(saveCalculatorHandoff({
      mode: 'grade',
      courses: [
        { code: ' csc 101 ', units: 3, grade: 'A' },
        { code: '', units: 2, grade: 'B' },
      ],
    }, 1_000)).toBe(true);

    expect(readCalculatorHandoff(2_000)).toEqual({
      version: 1,
      mode: 'grade',
      savedAt: 1_000,
      courses: [
        { code: 'CSC 101', units: 3, grade: 'A' },
        { code: '', units: 2, grade: 'B' },
      ],
    });
  });

  it('drops incomplete rows and saves nothing when no row is usable', () => {
    expect(saveCalculatorHandoff({ mode: 'score', courses: [{ code: 'X', units: 3 }, { code: 'Y', units: 0, score: 50 }] })).toBe(false);
    expect(readCalculatorHandoff()).toBeNull();
    expect(sessionStorage.getItem(CALCULATOR_HANDOFF_KEY)).toBeNull();
  });

  it('expires after a day and ignores tampered storage', () => {
    saveCalculatorHandoff({ mode: 'score', courses: [{ code: 'MTH 101', units: 3, score: 71 }] }, 0);
    expect(readCalculatorHandoff(CALCULATOR_HANDOFF_MAX_AGE_MS + 1)).toBeNull();
    expect(sessionStorage.getItem(CALCULATOR_HANDOFF_KEY)).toBeNull();

    sessionStorage.setItem(CALCULATOR_HANDOFF_KEY, '{not json');
    expect(readCalculatorHandoff()).toBeNull();
    sessionStorage.setItem(CALCULATOR_HANDOFF_KEY, JSON.stringify({ version: 1, mode: 'grade', savedAt: Date.now(), courses: [{ code: 'A', units: 99, grade: 'Z' }] }));
    expect(readCalculatorHandoff()).toBeNull();
  });

  it('never throws when storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    expect(saveCalculatorHandoff({ mode: 'grade', courses: [{ code: 'A', units: 3, grade: 'A' }] })).toBe(false);
    expect(readCalculatorHandoff()).toBeNull();
    expect(() => clearCalculatorHandoff()).not.toThrow();
  });

  it('clears the handoff once it has been used', () => {
    saveCalculatorHandoff({ mode: 'grade', courses: [{ code: 'A', units: 3, grade: 'A' }] });
    clearCalculatorHandoff();
    expect(readCalculatorHandoff()).toBeNull();
  });

  it('converts rows exactly as the calculator scored them, so the first semester matches', () => {
    const handoff = { version: 1 as const, mode: 'score' as const, savedAt: 0, courses: [
      { code: 'CSC 415', units: 2, score: 54 },
      { code: 'MTH 321', units: 3, score: 71 },
    ] };
    const rows = handoffToCourseInputs(handoff);
    expect(rows).toEqual([
      { code: 'CSC 415', title: '', units: 2, caScore: 16.2, examScore: 37.8 },
      // Same float arithmetic as the calculator page (score × 0.3 / × 0.7).
      { code: 'MTH 321', title: '', units: 3, caScore: 71 * 0.3, examScore: 71 * 0.7 },
    ]);
    const result = computeSemesterGPA(rows.map(computeCourseMetrics));
    expect(result.gpa).toBeCloseTo((3 * 2 + 5 * 3) / 5, 10);

    expect(handoffToCourseInputs({ ...handoff, mode: 'grade', courses: [{ code: 'GST 111', units: 2, grade: 'B' }] }))
      .toEqual([{ code: 'GST 111', title: '', units: 2, grade: 'B', caScore: null, examScore: null }]);
  });

  it('labels the offer with the course count', () => {
    expect(handoffOfferLabel(1)).toBe('Add this course as my first semester');
    expect(handoffOfferLabel(4)).toBe('Add these 4 courses as my first semester');
  });
});
