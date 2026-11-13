import { describe, expect, it } from 'vitest';

import { parseTargetClass, planDegreeGoal, TARGET_CLASS_OPTIONS } from '@/lib/planning/degreeGoal';

// 3.20 CGPA over 60 units, two semesters of 20 units left (40 units).
const base = { currentCgpa: 3.2, completedUnits: 60, remainingSemesters: 2, unitsPerSemester: 20 };

describe('planDegreeGoal (A6)', () => {
  it('gives the GPA needed each remaining semester for a reachable goal', () => {
    const plan = planDegreeGoal({ ...base, targetClass: '2:1' });
    expect(plan.kind).toBe('plan');
    if (plan.kind !== 'plan') return;
    // (3.5 x 100 - 3.2 x 60) / 40 = 3.95
    expect(plan.target.requiredGpa).toBeCloseTo(3.95, 10);
    expect(plan.target.state).toBe('reachable');
    expect(plan.target.band.shortLabel).toBe('2:1');
    expect(plan.suggestion).toBeNull();
  });

  it('gives the maximum reachable CGPA', () => {
    const plan = planDegreeGoal({ ...base, targetClass: '2:1' });
    if (plan.kind !== 'plan') throw new Error('expected a plan');
    // (3.2 x 60 + 5 x 40) / 100 = 3.92
    expect(plan.maxReachable).toBeCloseTo(3.92, 10);
  });

  it('gives the GPA needed to keep the current class', () => {
    const plan = planDegreeGoal({ ...base, targetClass: '2:1' });
    if (plan.kind !== 'plan') throw new Error('expected a plan');
    expect(plan.keepCurrent.band.shortLabel).toBe('2:2');
    // (2.4 x 100 - 3.2 x 60) / 40 = 1.2
    expect(plan.keepCurrent.requiredGpa).toBeCloseTo(1.2, 10);
    expect(plan.keepCurrent.state).toBe('reachable');
  });

  it('marks an out-of-reach goal and suggests the best class still reachable', () => {
    const plan = planDegreeGoal({ ...base, targetClass: '1st' });
    if (plan.kind !== 'plan') throw new Error('expected a plan');
    // (4.5 x 100 - 192) / 40 = 6.45
    expect(plan.target.requiredGpa).toBeCloseTo(6.45, 10);
    expect(plan.target.state).toBe('unreachable');
    expect(plan.suggestion?.shortLabel).toBe('2:1');
  });

  it('marks a goal that any result now secures', () => {
    const plan = planDegreeGoal({ ...base, targetClass: '3rd' });
    if (plan.kind !== 'plan') throw new Error('expected a plan');
    expect(plan.target.state).toBe('secured');
  });

  it('suggests using unrounded comparison so it never suggests the unreachable target itself', () => {
    // max reachable = (4.47 x 100 + 5 x 2) / 102 = 4.4804 -> 2:1, never 1st
    const plan = planDegreeGoal({ currentCgpa: 4.47, completedUnits: 100, remainingSemesters: 1, unitsPerSemester: 2, targetClass: '1st' });
    if (plan.kind !== 'plan') throw new Error('expected a plan');
    expect(plan.target.state).toBe('unreachable');
    expect(plan.suggestion?.shortLabel).toBe('2:1');
  });

  it('reports the final class when no semesters remain', () => {
    const plan = planDegreeGoal({ ...base, remainingSemesters: 0, targetClass: '2:1' });
    expect(plan.kind).toBe('final');
    if (plan.kind === 'final') expect(plan.current.shortLabel).toBe('2:2');
  });

  it('treats a student with no graded units as starting from scratch', () => {
    const plan = planDegreeGoal({ currentCgpa: 0, completedUnits: 0, remainingSemesters: 8, unitsPerSemester: 18, targetClass: '1st' });
    if (plan.kind !== 'plan') throw new Error('expected a plan');
    expect(plan.target.requiredGpa).toBeCloseTo(4.5, 10);
    expect(plan.maxReachable).toBe(5);
  });
});

describe('parseTargetClass', () => {
  it('accepts the saved short labels and rejects anything else', () => {
    expect(TARGET_CLASS_OPTIONS.map(o => o.value)).toEqual(['1st', '2:1', '2:2', '3rd', 'Pass']);
    expect(parseTargetClass('2:1')).toBe('2:1');
    expect(parseTargetClass('Fail')).toBeNull();
    expect(parseTargetClass(undefined)).toBeNull();
    expect(parseTargetClass(4.5)).toBeNull();
  });
});
