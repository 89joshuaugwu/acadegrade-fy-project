import { describe, expect, it } from 'vitest';
import { mapExtractedCourse } from '@/app/(student)/results/[semesterId]/import-mapping';

describe('scan mapping', () => {
  it('keeps 0 scores (CA 0 and exam 0 are real scores, not missing)', () => {
    const course = mapExtractedCourse({ code: 'CSC 201', title: 'Programming', units: 3, caScore: 0, examScore: 0 });
    expect(course.caScore).toBe(0);
    expect(course.examScore).toBe(0);
  });

  it('turns missing, blank, non-numeric and out-of-range scores into null', () => {
    expect(mapExtractedCourse({ caScore: undefined, examScore: null })).toMatchObject({ caScore: null, examScore: null });
    expect(mapExtractedCourse({ caScore: '', examScore: 'abc' })).toMatchObject({ caScore: null, examScore: null });
    expect(mapExtractedCourse({ caScore: 31, examScore: 71 })).toMatchObject({ caScore: null, examScore: null });
    expect(mapExtractedCourse({ caScore: -1, examScore: -5 })).toMatchObject({ caScore: null, examScore: null });
  });

  it('accepts numeric strings and defaults units and text safely', () => {
    expect(mapExtractedCourse({ caScore: '25', examScore: '60.5', units: '2' })).toMatchObject({ caScore: 25, examScore: 60.5, units: 2 });
    expect(mapExtractedCourse({})).toMatchObject({ code: '', title: '', units: 3, isAR: false, estimated: false });
    expect(mapExtractedCourse(null)).toMatchObject({ code: '', units: 3 });
  });

  it('flags awaiting-result rows as estimated', () => {
    expect(mapExtractedCourse({ code: 'MTH 101', isAR: true })).toMatchObject({ isAR: true, estimated: true });
  });
});
