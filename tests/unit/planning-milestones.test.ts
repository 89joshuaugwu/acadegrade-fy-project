import { describe, expect, it } from 'vitest';

import {
  detectMilestones,
  milestoneUpdate,
  planMilestoneWrites,
  sanitiseMilestoneId,
  type MilestoneSemester,
} from '@/lib/planning/milestones';

const sem = (id: string, gpa: number, creditLoaded: number, extra: Partial<MilestoneSemester> = {}): MilestoneSemester => ({
  id, gpa, pi: gpa, creditLoaded, isComplete: true, courses: [], ...extra,
});
const course = (code: string, total: number | null, extra: Record<string, unknown> = {}) => ({
  code, caScore: null, examScore: null, totalScore: total, ...extra,
});

describe('detectMilestones (C1.1)', () => {
  it('detects each milestone', () => {
    // CGPA 2.00 (2:2 is 2.40+, so Third) then (2*18 + 5*18)/36 = 3.50 (2:1): class moved up.
    const semesters = [
      sem('s1', 2, 18, { courses: [course('MTH 101', 30)] }),
      sem('s2', 5, 18, { courses: [course('mth101', 75)] }),
    ];
    const ids = detectMilestones({ semesters, isGraduated: true });
    expect(ids).toEqual(expect.arrayContaining([
      'first_semester',
      'programme_complete',
      'carry_overs_cleared',
      'personal_best_s2',
      'class_up_2_1',
    ]));
    expect(ids).toHaveLength(5);
  });

  it('needs two completed semesters for a personal best and a strict improvement', () => {
    expect(detectMilestones({ semesters: [sem('s1', 4, 18)], isGraduated: false })).toEqual(['first_semester']);
    expect(detectMilestones({ semesters: [sem('s1', 4, 18), sem('s2', 4, 18)], isGraduated: false })).not.toContain('personal_best_s2');
    // An incomplete newest semester is not a personal best.
    expect(detectMilestones({ semesters: [sem('s1', 3, 18), sem('s2', 5, 18, { isComplete: false })], isGraduated: false }))
      .not.toContain('personal_best_s2');
  });

  it('carry-overs cleared only when a failure existed and none is outstanding', () => {
    expect(detectMilestones({ semesters: [sem('s1', 4, 18, { courses: [course('CSC 101', 70)] })], isGraduated: false }))
      .not.toContain('carry_overs_cleared');
    expect(detectMilestones({ semesters: [sem('s1', 4, 18, { courses: [course('CSC 101', 20)] })], isGraduated: false }))
      .not.toContain('carry_overs_cleared');
  });

  it('awaiting rows never count', () => {
    // A complete semester holding only an awaiting-result row has no graded credits.
    const onlyAwaiting = [sem('s1', 0, 0, { courses: [course('CSC 101', null, { isAR: true })] })];
    expect(detectMilestones({ semesters: onlyAwaiting, isGraduated: false })).toEqual([]);

    // A failure "retaken" with an awaiting or pending row is still outstanding.
    const retakeAwaiting = [
      sem('s1', 4, 18, { courses: [course('CSC 101', 20)] }),
      sem('s2', 4, 18, { courses: [course('CSC 101', 80, { isAR: true }), course('CSC 101', 80, { pending: true })] }),
    ];
    expect(detectMilestones({ semesters: retakeAwaiting, isGraduated: false })).not.toContain('carry_overs_cleared');

    // Awaiting-only semesters are not "earlier" or "newest" for personal bests.
    const withAwaitingNewest = [sem('s1', 3, 18), sem('s2', 4, 18), sem('s3', 0, 0)];
    expect(detectMilestones({ semesters: withAwaitingNewest, isGraduated: false })).toContain('personal_best_s2');
  });

  it('sanitises ids to letters, digits and underscores', () => {
    expect(sanitiseMilestoneId('personal_best_a.b/c-d')).toBe('personal_best_a_b_c_d');
    expect(detectMilestones({ semesters: [sem('x.1', 3, 18), sem('y/2', 5, 18)], isGraduated: false })).toContain('personal_best_y_2');
  });
});

describe('planMilestoneWrites (C1.2)', () => {
  it('first run seeds silently', () => {
    expect(planMilestoneWrites(['first_semester', 'personal_best_s2'], undefined)).toEqual({
      celebrate: [],
      record: ['first_semester', 'personal_best_s2'],
    });
    // Nothing reached yet: still nothing to celebrate.
    expect(planMilestoneWrites([], undefined)).toEqual({ celebrate: [], record: [] });
  });

  it('celebrates only new ids', () => {
    const stored = { first_semester: { seconds: 1 } };
    expect(planMilestoneWrites(['first_semester', 'carry_overs_cleared'], stored)).toEqual({
      celebrate: ['carry_overs_cleared'],
      record: ['carry_overs_cleared'],
    });
    expect(planMilestoneWrites(['first_semester'], stored)).toEqual({ celebrate: [], record: [] });
    // An empty stored map (seeded with nothing) is not "never written".
    expect(planMilestoneWrites(['first_semester'], {})).toEqual({ celebrate: ['first_semester'], record: ['first_semester'] });
  });

  it('writes use dot paths', () => {
    const now = new Date('2026-11-14T00:00:00Z');
    expect(milestoneUpdate(['first_semester', 'class_up_2_1'], undefined, now)).toEqual({
      'milestones.first_semester': now,
      'milestones.class_up_2_1': now,
    });
    // Seeding with nothing reached writes an empty map once, so later milestones celebrate.
    expect(milestoneUpdate([], undefined, now)).toEqual({ milestones: {} });
    // Nothing new on an existing map: no write at all.
    expect(milestoneUpdate([], {}, now)).toBeNull();
    // Never replaces the whole map once it exists.
    expect(Object.keys(milestoneUpdate(['x'], { first_semester: 1 }, now)!)).toEqual(['milestones.x']);
  });
});

describe('milestones on another grading scale', () => {
  it('detects a class move and carry-overs with the active scale', async () => {
    const { SCALES } = await import('@/lib/cgpa/academicRules');
    const { detectMilestones: detect, describeMilestone: describe_ } = await import('@/lib/planning/milestones');
    const ids = detect({
      semesters: [
        { id: 's1', gpa: 2.6, pi: 2.6, creditLoaded: 10, isComplete: true, level: 100, semester: 1, courses: [{ code: 'COM 111', caScore: 10, examScore: 20 }] },
        { id: 's2', gpa: 3.9, pi: 3.9, creditLoaded: 30, isComplete: true, level: 100, semester: 2, courses: [{ code: 'COM 111', caScore: 20, examScore: 52 }] },
      ],
      isGraduated: false,
      scale: SCALES.nbte4,
    });
    expect(ids).toContain('carry_overs_cleared');
    expect(ids).toContain('class_up_Dist');
    expect(describe_('class_up_Dist', SCALES.nbte4).className).toBe('Distinction');
  });
});
