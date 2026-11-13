import { describe, expect, it } from 'vitest';

import { isCarryOver } from '@/lib/cgpa/academicRules';
import { buildCarryOverReport, knownGradeOf } from '@/lib/planning/carryOvers';

const course = (code: string, extra: Record<string, unknown> = {}) => ({ code, title: `${code} title`, units: 3, caScore: null, examScore: null, totalScore: null, grade: null, ...extra });
const scored = (code: string, total: number, units = 3) => course(code, { caScore: 0, examScore: total, totalScore: total, units });

describe('buildCarryOverReport (A4)', () => {
  it('treats only F as a carry-over: AR rows, pending rows and passing D/E are not carry-overs', () => {
    const report = buildCarryOverReport([
      { id: 's1', label: '100L First Semester', courses: [
        scored('MTH101', 30, 3),
        scored('PHY101', 47, 2),
        scored('CHM101', 42, 2),
        course('GST101', { isAR: true }),
        course('BIO101', { pending: true }),
      ] },
    ]);
    expect(report.outstanding.map(c => c.code)).toEqual(['MTH101']);
    expect(report.outstandingUnits).toBe(3);
    expect(report.atRisk.map(c => [c.code, c.grade])).toEqual([['MTH101', 'F'], ['PHY101', 'D'], ['CHM101', 'E']]);
  });

  it('clears a failure when the same normalised code is passed later, and keeps the latest failed attempt details', () => {
    const report = buildCarryOverReport([
      { id: 's1', label: '100L First Semester', courses: [scored('csc 101', 20, 3), scored('MTH101', 35, 3)] },
      { id: 's2', label: '100L Second Semester', courses: [scored('CSC101', 55, 3), scored('MTH 101', 38, 4)] },
    ]);
    expect(report.outstanding).toEqual([
      expect.objectContaining({ code: 'MTH 101', normalisedCode: 'MTH101', units: 4, semesterLabel: '100L Second Semester', attempts: 2 }),
    ]);
    expect(report.outstandingUnits).toBe(4);
  });

  it('does not clear a failure with a later awaiting-result attempt', () => {
    const report = buildCarryOverReport([
      { id: 's1', label: 'S1', courses: [scored('MTH101', 20)] },
      { id: 's2', label: 'S2', courses: [course('MTH101', { isAR: true })] },
    ]);
    expect(report.outstanding.map(c => c.normalisedCode)).toEqual(['MTH101']);
  });

  it('uses a letter grade when no scores exist', () => {
    const report = buildCarryOverReport([{ id: 's1', label: 'S1', courses: [course('ENG101', { grade: 'F' }), course('ENG102', { grade: 'E' })] }]);
    expect(report.outstanding.map(c => c.code)).toEqual(['ENG101']);
    expect(report.atRisk.map(c => c.grade)).toEqual(['F', 'E']);
  });

  it('agrees with the shared isCarryOver rule', () => {
    for (const row of [scored('A', 39), scored('A', 40), course('A', { grade: 'F', isAR: true }), course('A'), course('A', { totalScore: 10 })]) {
      expect(knownGradeOf(row) === 'F').toBe(isCarryOver(row));
    }
  });
});
