import { describe, expect, it } from 'vitest';

import {
  getAcademicPlan,
  graduationSession,
  withAcademicTimelineDerivations,
} from '@/lib/academic/timeline';
import type { SemesterWithId } from '@/types/semester';
import type { UserWithId } from '@/types/user';

const profile = {
  entrySession: '2022/2023',
  currentSession: '2022/2023',
  courseDuration: 4,
  currentLevel: 400,
} as UserWithId;

function semester(level: number, number: 1 | 2, isComplete = true): SemesterWithId {
  return {
    id: `semester-${level}-${number}`,
    label: `${level}L Semester ${number}`,
    session: `${2022 + level / 100 - 1}/${2023 + level / 100 - 1}`,
    level,
    semester: number,
    gpa: 0,
    pi: 0,
    creditLoaded: 0,
    isComplete,
  } as SemesterWithId;
}

describe('academic timeline progression', () => {
  it('derives the final academic session from entry session plus programme duration', () => {
    expect(graduationSession('2022/2023', 4)).toBe('2025/2026');
  });

  it('leaves only final-year second semester after 400L first semester is recorded', () => {
    const recorded = [
      semester(100, 1), semester(100, 2),
      semester(200, 1), semester(200, 2),
      semester(300, 1), semester(300, 2),
      semester(400, 1),
    ];

    const plan = getAcademicPlan(profile, recorded);

    expect(plan.graduationSession).toBe('2025/2026');
    expect(plan.remainingSlots.map((slot) => slot.key)).toEqual(['400:2']);
    expect(plan.remainingAcademicSemesters).toBe(1);
  });

  it('suggests the earliest skipped valid semester before later recorded semesters', () => {
    const plan = getAcademicPlan(profile, [
      semester(100, 1),
      semester(200, 1),
    ]);

    expect(plan.remainingSlots[0]).toMatchObject({
      key: '100:2',
      level: 100,
      semester: 2,
      session: '2022/2023',
    });
  });

  it('counts duplicate records once and never suggests their academic slot again', () => {
    const duplicate = { ...semester(100, 1), id: 'legacy-duplicate' };
    const plan = getAcademicPlan(profile, [semester(100, 1), duplicate]);

    expect(plan.createdCount).toBe(1);
    expect(plan.remainingSlots.some((slot) => slot.key === '100:1')).toBe(false);
  });

  it('recalculates graduation when a profile duration update is prepared', () => {
    expect(withAcademicTimelineDerivations(profile, { courseDuration: 5 })).toEqual({
      courseDuration: 5,
      graduationSession: '2026/2027',
    });
  });
});
