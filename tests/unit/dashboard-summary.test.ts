import { describe, expect, it } from 'vitest';
import { buildDashboardSummary } from '@/lib/dashboard/summary';

function timestamp(value: number) {
  return { toMillis: () => value };
}

describe('dashboard academic summary', () => {
  it('orders timestamped course updates across semesters and preserves navigation context', () => {
    const summary = buildDashboardSummary([
      {
        semesterId: 'first-semester',
        semesterLabel: '100L First Semester',
        session: '2024/2025',
        semesterIndex: 0,
        courses: [
          { id: 'phy', code: 'PHY 111', title: 'Physics', totalScore: 67, grade: 'B', updatedAt: timestamp(100) },
        ],
      },
      {
        semesterId: 'second-semester',
        semesterLabel: '100L Second Semester',
        session: '2024/2025',
        semesterIndex: 1,
        courses: [
          { id: 'bio', code: 'BIO 112', title: 'Biology', totalScore: 48, grade: 'D', updatedAt: timestamp(300) },
          { id: 'csc', code: 'CSC 112', title: 'Programming', totalScore: 74, grade: 'A', updatedAt: timestamp(200) },
        ],
      },
    ]);

    expect(summary.recent.map((course) => course.id)).toEqual(['bio', 'csc', 'phy']);
    expect(summary.recent[0]).toMatchObject({
      semesterId: 'second-semester',
      semesterLabel: '100L Second Semester',
      session: '2024/2025',
    });
    expect(summary.atRiskCount).toBe(1);
    expect(summary.unknownCount).toBe(0);
  });

  it('does not turn missing scores into failures and falls back to academic chronology', () => {
    const summary = buildDashboardSummary([
      {
        semesterId: 'older',
        semesterLabel: '100L First Semester',
        session: '2024/2025',
        semesterIndex: 0,
        courses: [
          { id: 'unknown', code: 'GST 101', title: 'Use of English', totalScore: null, grade: null },
        ],
      },
      {
        semesterId: 'newer',
        semesterLabel: '100L Second Semester',
        session: '2024/2025',
        semesterIndex: 1,
        courses: [
          { id: 'grade-only', code: 'CSC 102', title: 'Algorithms', totalScore: null, grade: 'E' },
          { id: 'safe', code: 'MAT 102', title: 'Algebra', totalScore: 62, grade: 'B' },
        ],
      },
    ]);

    expect(summary.totalCourses).toBe(3);
    expect(summary.atRiskCount).toBe(1);
    expect(summary.unknownCount).toBe(1);
    expect(summary.recent.map((course) => course.id)).toEqual(['grade-only', 'safe', 'unknown']);
  });

  it('uses the course id as a stable final tie-breaker', () => {
    const summary = buildDashboardSummary([
      {
        semesterId: 'same-semester',
        semesterLabel: '200L First Semester',
        session: '2025/2026',
        semesterIndex: 2,
        courses: [
          { id: 'course-b', code: 'CSC 201', title: 'Second copy', totalScore: 60 },
          { id: 'course-a', code: 'CSC 201', title: 'First copy', totalScore: 60 },
        ],
      },
    ]);

    expect(summary.recent.map((course) => course.id)).toEqual(['course-a', 'course-b']);
  });
});
