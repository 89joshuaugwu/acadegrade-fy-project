import { describe, expect, it } from 'vitest';
import { SCALES } from '@/lib/cgpa/academicRules';
import { readScaleContext, scaleContextFor, scalePromptLine } from '@/lib/ai/scaleContext';

describe('grading scale fields on AcadeMind requests (same names as Android)', () => {
  it('sends nothing for the default 5-point scale, so older requests and caches are unchanged', () => {
    expect(scaleContextFor(SCALES.ng5)).toEqual({});
    expect(readScaleContext({})).toBeNull();
    expect(readScaleContext({ gradingScaleId: 'ng5', gradingScaleName: '5-point (with E)', maxGradePoint: 5 })).toBeNull();
    expect(scalePromptLine(null)).toBe('');
  });

  it('states the scale name and top grade point', () => {
    const body = { currentCGPA: 3, ...scaleContextFor(SCALES.nbte4) };
    expect(body).toMatchObject({ gradingScaleId: 'nbte4', gradingScaleName: 'Polytechnic 4-point (NBTE)', maxGradePoint: 4 });
    expect(scalePromptLine(readScaleContext(body))).toBe('Grading scale: Polytechnic 4-point (NBTE). GPA, CGPA and PI are out of 4, not 5.');
  });

  it('ignores malformed values and trims long names', () => {
    expect(readScaleContext({ gradingScaleName: 'x', maxGradePoint: 50 })).toBeNull();
    expect(readScaleContext({ gradingScaleName: 7, maxGradePoint: 4 })).toBeNull();
    expect(readScaleContext({ gradingScaleName: 'a'.repeat(80), maxGradePoint: 4 })?.name).toHaveLength(40);
    expect(readScaleContext({ gradingScaleId: '<script>', gradingScaleName: 'Custom', maxGradePoint: 4 })?.id).toBeNull();
  });
});
