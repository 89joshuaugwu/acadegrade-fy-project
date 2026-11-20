import { describe, expect, it } from 'vitest';
import { DEGREE_CLASS_BANDS, GRADE_BANDS, MAX_GRADE_POINT } from '@/lib/cgpa/academicRules';
import {
  DEFAULT_SCALE,
  LIVE_SCALES,
  classBandLine,
  classTicks,
  gradeBandLine,
  hasScaleSwitcher,
  publicClassFor,
} from '@/lib/public/scales';
import { allCredits, creditsFor, formatCredit, formatImprintCredits, type PhotoCredit } from '@/lib/public/credits';

describe('public grading scales', () => {
  it('has one live scale, the Nigerian university 5-point scale with PI, so no switcher', () => {
    expect(LIVE_SCALES).toHaveLength(1);
    expect(DEFAULT_SCALE.line).toBe('Nigerian university 5-point scale, with PI');
    expect(DEFAULT_SCALE.hasPI).toBe(true);
    expect(hasScaleSwitcher()).toBe(false);
    expect(DEFAULT_SCALE.scoreSplit).toEqual({ ca: 30, exam: 70 });
  });

  it('reads bands and classes from the engine constants', () => {
    expect(DEFAULT_SCALE.maxPoint).toBe(MAX_GRADE_POINT);
    expect(DEFAULT_SCALE.gradeBands.map((band) => band.grade)).toEqual(GRADE_BANDS.map((band) => band.grade));
    expect(DEFAULT_SCALE.classBands.map((band) => band.min)).toEqual(DEGREE_CLASS_BANDS.map((band) => band.minCGPA));
    expect(DEFAULT_SCALE.classBands.map((band) => band.label)).toEqual([
      'First Class',
      'Second Class Upper',
      'Second Class Lower',
      'Third Class',
      'Pass',
      'Below a Pass',
    ]);
  });

  it('classifies with the engine rounding (4.495 shows 4.50, First Class)', () => {
    expect(publicClassFor(4.43).label).toBe('Second Class Upper');
    expect(publicClassFor(4.495).label).toBe('First Class');
    expect(publicClassFor(0.5).label).toBe('Below a Pass');
  });

  it('gives the arc ticks 1.50, 2.40, 3.50 and 4.50 with short names', () => {
    expect(classTicks().map((tick) => [tick.value, tick.short])).toEqual([
      [1.5, '3rd'],
      [2.4, '2:2'],
      [3.5, '2:1'],
      [4.5, '1st'],
    ]);
  });

  it('writes copy rows from the data', () => {
    expect(gradeBandLine(DEFAULT_SCALE.gradeBands[0])).toBe('A 70–100 → 5');
    expect(classBandLine(DEFAULT_SCALE.classBands[1])).toBe('Second Class Upper 3.50–4.49');
  });
});

describe('photograph credits registry', () => {
  const sample: PhotoCredit[] = [
    { id: 'a', title: 'Main gate, UNN', author: 'A', licence: 'CC BY-SA 4.0', via: 'Wikimedia Commons', altered: true },
    { id: 'b', title: 'Library', author: 'B', licence: 'CC0 1.0', via: 'Wikimedia Commons', altered: true },
    { id: 'c', title: 'Faculty of Arts, UNN', author: 'C', licence: 'CC BY-SA 4.0', via: 'Wikimedia Commons', altered: true },
  ];

  it('formats one credit and groups the imprint by licence', () => {
    expect(formatCredit(sample[0])).toBe('Main gate, UNN, by A (CC BY-SA 4.0, via Wikimedia Commons, tinted)');
    expect(formatImprintCredits(sample)).toBe(
      'Photographs: Main gate, UNN, by A; Faculty of Arts, UNN, by C (CC BY-SA 4.0, via Wikimedia Commons, tinted). Library, by B (CC0 1.0, via Wikimedia Commons, tinted).'
    );
    expect(formatImprintCredits([sample[1]])).toMatch(/^Photograph: Library/);
    expect(formatImprintCredits([])).toBeNull();
  });

  it('looks credits up by id and skips unknown ids', () => {
    expect(creditsFor(['b', 'not-a-picture', 'a'], sample).map((credit) => credit.id)).toEqual(['b', 'a']);
    expect(creditsFor(undefined, sample)).toHaveLength(3);
  });

  it('has no credits on the site while it ships with no photographs (owner decision 2)', () => {
    expect(allCredits()).toEqual([]);
    expect(creditsFor(['unn-main-gate'])).toEqual([]);
  });
});
