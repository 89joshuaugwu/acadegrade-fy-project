import { describe, expect, it } from 'vitest';

import { buildSemesterRecap, canOfferWrittenAnalysis, shouldShowRecap } from '@/lib/planning/semesterRecap';

const sem = (id: string, gpa: number, creditLoaded: number) => ({ id, label: id, gpa, pi: gpa, creditLoaded, isComplete: true });
const course = (code: string, units: number, total: number | null, extra: Record<string, unknown> = {}) => ({
  code, title: `${code} title`, units, caScore: null, examScore: null, totalScore: total, ...extra,
});

describe('buildSemesterRecap (C3.1)', () => {
  it('first semester has no previous', () => {
    const recap = buildSemesterRecap({
      semesters: [sem('s1', 4.2, 9)],
      coursesBySemester: { s1: [course('CSC 101', 3, 72), course('MTH 101', 3, 65), course('GST 101', 3, 30), course('PHY 101', 2, null, { isAR: true })] },
      semesterId: 's1',
    })!;
    expect(recap.gpa).toBe(4.2);
    expect(recap.previousGpa).toBeNull();
    expect(recap.delta).toBeNull();
    expect(recap.classBefore).toBeNull();
    // A and B pass; the F and the awaiting row do not count.
    expect(recap.unitsEarned).toBe(6);
    expect(recap.strongest).toEqual({ code: 'CSC 101', title: 'CSC 101 title', grade: 'A' });
    expect(recap.carryOversCleared).toEqual([]);
  });

  it('class change', () => {
    // Before: 2.00 (Third). After: (2*18 + 5*18) / 36 = 3.50 (2:1).
    const recap = buildSemesterRecap({
      semesters: [sem('s1', 2, 18), sem('s2', 5, 18)],
      coursesBySemester: { s1: [], s2: [] },
      semesterId: 's2',
    })!;
    expect(recap.previousGpa).toBe(2);
    expect(recap.delta).toBeCloseTo(3, 10);
    expect(recap.classBefore?.shortLabel).toBe('3rd');
    expect(recap.classAfter.shortLabel).toBe('2:1');
  });

  it('carry-overs cleared', () => {
    const recap = buildSemesterRecap({
      semesters: [sem('s1', 3, 9), sem('s2', 4, 6), sem('s3', 4, 3)],
      coursesBySemester: {
        s1: [course('CSC 101', 3, 20), course('MTH 101', 3, 25), course('GST 101', 3, 70)],
        // CSC 101 passed here; MTH 101 only "awaiting" (still outstanding).
        s2: [course('csc101', 3, 55), course('MTH 101', 3, null, { isAR: true }), course('PHY 102', 3, 60)],
        s3: [course('MTH 101', 3, 50)],
      },
      semesterId: 's2',
    })!;
    expect(recap.carryOversCleared).toEqual(['csc101']);
    // The previous semester is the nearest earlier one with graded credits.
    expect(recap.previousGpa).toBe(3);
  });

  it('returns null for an unknown semester', () => {
    expect(buildSemesterRecap({ semesters: [sem('s1', 4, 3)], coursesBySemester: {}, semesterId: 'nope' })).toBeNull();
  });
});

describe('shouldShowRecap (C3.2)', () => {
  it('shown once: only for a complete semester without recapShownAt', () => {
    expect(shouldShowRecap({ isComplete: true })).toBe(true);
    expect(shouldShowRecap({ isComplete: true, recapShownAt: { seconds: 1 } })).toBe(false);
    expect(shouldShowRecap({ isComplete: false })).toBe(false);
    expect(shouldShowRecap(undefined)).toBe(false);
  });
});

describe('canOfferWrittenAnalysis (C3.3)', () => {
  const adult = { ageStatus: 'adult' as const, aiConsent: true, marketingConsent: null };

  it('AI link hidden for minors and declined consent', () => {
    expect(canOfferWrittenAnalysis({ eligibility: { status: 'minor', aiAllowed: false, aiConsent: null }, privacy: adult, featureDisabled: false })).toBe(false);
    expect(canOfferWrittenAnalysis({ eligibility: { status: 'adult', aiAllowed: false, aiConsent: false }, privacy: adult, featureDisabled: false })).toBe(false);
    // Server answer unavailable: fall back to the profile, which must be an adult who said yes.
    expect(canOfferWrittenAnalysis({ eligibility: null, privacy: { ...adult, ageStatus: 'minor' }, featureDisabled: false })).toBe(false);
    expect(canOfferWrittenAnalysis({ eligibility: null, privacy: { ...adult, aiConsent: false }, featureDisabled: false })).toBe(false);
    expect(canOfferWrittenAnalysis({ eligibility: null, privacy: { ...adult, aiConsent: null }, featureDisabled: false })).toBe(false);
  });

  it('shown for an allowed adult unless Written Analysis is switched off', () => {
    expect(canOfferWrittenAnalysis({ eligibility: { status: 'adult', aiAllowed: true, aiConsent: true }, privacy: adult, featureDisabled: false })).toBe(true);
    expect(canOfferWrittenAnalysis({ eligibility: null, privacy: adult, featureDisabled: false })).toBe(true);
    expect(canOfferWrittenAnalysis({ eligibility: { status: 'adult', aiAllowed: true, aiConsent: true }, privacy: adult, featureDisabled: true })).toBe(false);
  });
});
