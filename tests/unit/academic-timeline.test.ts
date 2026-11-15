import { describe, expect, it } from 'vitest';

import {
  buildAcademicSlots,
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

  it('default 100 leaves every existing plan unchanged', () => {
    for (const duration of [1, 3, 4, 5, 6]) {
      const before = buildAcademicSlots('2022/2023', duration);
      expect(buildAcademicSlots('2022/2023', duration, 100, 0)).toEqual(before);
      expect(buildAcademicSlots('2022/2023', duration, undefined, undefined)).toEqual(before);
      expect(before).toHaveLength(duration * 2);
      expect(before[0]).toMatchObject({ key: '100:1', level: 100, yearNumber: 1, label: '100L First Semester' });
    }
    // getAcademicPlan without the new profile fields is identical too.
    expect(getAcademicPlan(profile, []).slots).toEqual(buildAcademicSlots('2022/2023', 4));
  });

  it('starts a direct-entry plan at the entry level with fewer years', () => {
    const slots = buildAcademicSlots('2023/2024', 4, 200);
    expect(slots.map((slot) => slot.key)).toEqual(['200:1', '200:2', '300:1', '300:2', '400:1', '400:2']);
    expect(slots[0]).toMatchObject({ yearNumber: 1, session: '2023/2024' });
    expect(slots[5]).toMatchObject({ yearNumber: 3, session: '2025/2026' });
    expect(buildAcademicSlots('2024/2025', 4, 300).map((slot) => slot.key)).toEqual(['300:1', '300:2', '400:1', '400:2']);
  });

  it('ignores an invalid entry level and never goes below one year', () => {
    expect(buildAcademicSlots('2022/2023', 4, 250)).toEqual(buildAcademicSlots('2022/2023', 4));
    expect(buildAcademicSlots('2022/2023', 1, 300).map((slot) => slot.key)).toEqual(['300:1', '300:2']);
  });

  it('adds spill-over slots after the final level with spill:n keys', () => {
    const slots = buildAcademicSlots('2022/2023', 4, 100, 3);
    const spill = slots.slice(8);
    expect(spill.map((slot) => slot.key)).toEqual(['spill:1', 'spill:2', 'spill:3']);
    expect(spill.map((slot) => slot.spillOver)).toEqual([1, 2, 3]);
    expect(spill.every((slot) => slot.level === 400)).toBe(true);
    expect(spill.map((slot) => slot.semester)).toEqual([1, 2, 1]);
    expect(spill.map((slot) => slot.session)).toEqual(['2026/2027', '2026/2027', '2027/2028']);
    expect(buildAcademicSlots('2022/2023', 4, 100, 9)).toHaveLength(8 + 4);
  });

  it('finds a stored spill-over semester by its spill key', () => {
    const spillProfile = { ...profile, spilloverSemesters: 2 } as UserWithId;
    const stored = { ...semester(400, 1), id: 'spill_1', spillOver: 1 } as SemesterWithId;
    const plan = getAcademicPlan(spillProfile, [stored]);
    expect(plan.createdKeys.has('spill:1')).toBe(true);
    expect(plan.createdKeys.has('400:1')).toBe(false);
    expect(plan.remainingSlots[0].key).toBe('100:1');
  });

  it('recalculates graduation when a profile duration update is prepared', () => {
    expect(withAcademicTimelineDerivations(profile, { courseDuration: 5 })).toEqual({
      courseDuration: 5,
      graduationSession: '2026/2027',
    });
  });
});
