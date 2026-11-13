import { describe, expect, it } from 'vitest';
import { computeCourseMetrics, computeSemesterGPA } from '@/lib/cgpa/calculator';
import { hasClassChanged, resolveDegreeClass } from '@/lib/cgpa/degreeClass';
import { lookupGrade } from '@/lib/cgpa/gradeScale';
import { DEGREE_CLASSES } from '@/lib/utils/constants';

describe('web lib/cgpa entry points use the shared academic rules', () => {
  it('classifies a 4.4917 CGPA (539 points / 120 units) as 2:1 instead of falling through to Fail', () => {
    const degreeClass = resolveDegreeClass(539 / 120);
    expect(degreeClass.label).toBe('Second Class Upper (2:1)');
    expect(degreeClass.colorToken).toBe('--class-2upper');
  });

  it('classifies the displayed 2-decimal value: 4.495 shows 4.50 and is First Class', () => {
    expect(resolveDegreeClass(4.495).label).toBe('First Class');
  });

  it.each([
    [2.395, 'Second Class Lower (2:2)'],
    [1.495, 'Third Class'],
    [0.995, 'Pass'],
    [0.994, 'Fail'],
    [Number.NaN, 'Fail'],
  ])('resolves %s to %s', (cgpa, label) => {
    expect(resolveDegreeClass(cgpa).label).toBe(label);
  });

  it('does not report a class change (and so no alert) when a CGPA moves inside the 2:1 band', () => {
    expect(hasClassChanged(4.48, 4.4917)).toBe(false);
  });

  it('still reports a real class change', () => {
    expect(hasClassChanged(4.4949, 4.495)).toBe(true);
  });

  it('keeps the existing labels, short labels, colour tokens and icons', () => {
    expect(DEGREE_CLASSES.map(({ label, shortLabel, colorToken, icon }) => [label, shortLabel, colorToken, icon])).toEqual([
      ['First Class', '1st', '--class-first', '🏆'],
      ['Second Class Upper (2:1)', '2:1', '--class-2upper', '🎖'],
      ['Second Class Lower (2:2)', '2:2', '--class-2lower', '✅'],
      ['Third Class', '3rd', '--class-third', '⚠️'],
      ['Pass', 'Pass', '--class-pass', '🔴'],
      ['Fail', 'Fail', '--class-fail', '❌'],
    ]);
  });

  it('grades a fractional total between bands with the lower band instead of F', () => {
    expect(lookupGrade(69.5)).toEqual({ grade: 'B', gradePoint: 4 });
  });

  it('skips awaiting-result rows when computing a semester GPA, matching Android', () => {
    const metrics = [
      computeCourseMetrics({ code: 'CSC 401', title: 'Compilers', units: 3, caScore: 26, examScore: 50 }),
      computeCourseMetrics({ code: 'CSC 499', title: 'Project', units: 6, caScore: null, examScore: null, isAR: true }),
    ];
    const result = computeSemesterGPA(metrics);
    expect(result.gpa).toBe(5);
    expect(result.creditLoaded).toBe(3);
    expect(result.gradeDistribution.F).toBe(0);
  });
});
