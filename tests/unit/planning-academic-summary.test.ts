import { describe, expect, it } from 'vitest';

import { buildAcademicSeries } from '@/lib/planning/academicSeries';
import { planDegreeClassAlert } from '@/lib/planning/degreeClassAlert';

function sem(level: number, semester: 1 | 2, gpa: number, pi: number, creditLoaded: number, isComplete: boolean) {
  return { level, semester, gpa, pi, creditLoaded, isComplete };
}

describe('buildAcademicSeries (owner rule: every graded course counts)', () => {
  it('counts an in-progress semester that has graded courses', () => {
    const series = buildAcademicSeries([
      sem(100, 1, 4, 4.1, 20, true),
      sem(100, 2, 3, 3.2, 20, false),
    ]);
    expect(series.currentCgpa).toBeCloseTo(3.5, 10);
    expect(series.gradedCredits).toBe(40);
    expect(series.cgpaHistory).toEqual([4, 3.5]);
    expect(series.piHistory).toEqual([4.1, 3.2]);
    expect(series.labels).toEqual(['100L S1', '100L S2']);
  });

  it('skips semesters with no graded credits (all awaiting result or pending)', () => {
    const series = buildAcademicSeries([
      sem(100, 1, 4, 4, 18, true),
      sem(100, 2, 0, 0, 0, true),
    ]);
    expect(series.gradedCredits).toBe(18);
    expect(series.cgpaHistory).toEqual([4]);
    expect(series.labels).toEqual(['100L S1']);
  });

  it('matches computeCumulativeCGPA for the current CGPA', () => {
    const series = buildAcademicSeries([sem(100, 1, 4.5, 4.4, 18, true), sem(100, 2, 4.4, 4.3, 22, false)]);
    expect(series.currentCgpa).toBeCloseTo((4.5 * 18 + 4.4 * 22) / 40, 12);
  });
});

describe('planDegreeClassAlert', () => {
  it('does NOT alert when the CGPA moves from 4.48 to 4.4917 (both 2:1)', () => {
    const plan = planDegreeClassAlert({ previous: { cgpa: 4.48, degreeClass: 'Second Class Upper (2:1)' }, currentCgpa: 539 / 120, gradedCredits: 120 });
    expect(plan.label).toBe('Second Class Upper (2:1)');
    expect(plan.alert).toBe(false);
  });

  it('does NOT alert when an earlier bug stored a wrong label but the CGPA stayed in the same class', () => {
    // The old min/max lookup filed 4.4917 under "Fail"; the stored CGPA is still the truth.
    const plan = planDegreeClassAlert({ previous: { cgpa: 4.4917, degreeClass: 'Fail' }, currentCgpa: 4.4917, gradedCredits: 120 });
    expect(plan.alert).toBe(false);
  });

  it('alerts on a real class change, using the displayed (rounded) CGPA', () => {
    const plan = planDegreeClassAlert({ previous: { cgpa: 4.4949, degreeClass: 'Second Class Upper (2:1)' }, currentCgpa: 4.495, gradedCredits: 60 });
    expect(plan).toEqual({ label: 'First Class', alert: true });
  });

  it('does not alert without a previous record or previous CGPA', () => {
    expect(planDegreeClassAlert({ previous: null, currentCgpa: 3.6, gradedCredits: 18 }).alert).toBe(false);
    expect(planDegreeClassAlert({ previous: { degreeClass: 'Second Class Lower (2:2)' }, currentCgpa: 3.6, gradedCredits: 18 }).alert).toBe(false);
  });

  it('does not alert from the initial Fail record or when nothing is graded yet', () => {
    expect(planDegreeClassAlert({ previous: { cgpa: 0, degreeClass: 'Fail' }, currentCgpa: 3.6, gradedCredits: 18 }).alert).toBe(false);
    expect(planDegreeClassAlert({ previous: { cgpa: 3.6, degreeClass: 'Second Class Upper (2:1)' }, currentCgpa: 0, gradedCredits: 0 }).alert).toBe(false);
  });
});
