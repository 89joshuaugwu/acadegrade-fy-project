import { describe, expect, it } from 'vitest';
import { formatCgpa, requiredAverageForTarget } from '@/lib/cgpa/academicRules';
import {
  EXAMPLE_COURSES,
  EXAMPLE_GRADES,
  EXAMPLE_META_LINE,
  EXAMPLE_PRIOR_SEMESTERS,
  EXAMPLE_PRIOR_TOTALS,
  EXAMPLE_STUDENT,
  computeExampleSlip,
  exampleRunningCgpa,
  exampleSemesterFromScores,
} from '@/lib/public/example-student';

describe('example student (shared by every public page)', () => {
  it('is Chidera Okeke, 300L Computer Science, 2025/2026 first semester', () => {
    expect(EXAMPLE_STUDENT).toMatchObject({ name: 'Chidera Okeke', regNo: 'CSC/2023/0147', levelLabel: '300L', programme: 'Computer Science' });
    expect(EXAMPLE_META_LINE).toBe('Example · 300L Computer Science · 2025/2026 First Semester');
  });

  it('has five courses whose CA and exam add up to 76, 65, 56, 72 and 61 (CA within 30, exam within 70)', () => {
    expect(EXAMPLE_COURSES.map((course) => course.ca + course.exam)).toEqual([76, 65, 56, 72, 61]);
    expect(EXAMPLE_COURSES.every((course) => course.ca <= 30 && course.exam <= 70)).toBe(true);
    expect(EXAMPLE_COURSES.reduce((sum, course) => sum + course.units, 0)).toBe(13);
    expect(EXAMPLE_GRADES).toEqual({ 'CSC 301': 'A', 'CSC 303': 'B', 'MTH 301': 'C', 'CSC 305': 'A', 'GST 311': 'B' });
  });

  it('pins the prior record: 85 + 86 + 72 + 88 = 331 points over 74 units (CGPA 4.47)', () => {
    expect(EXAMPLE_PRIOR_SEMESTERS.map((semester) => semester.points)).toEqual([85, 86, 72, 88]);
    expect(EXAMPLE_PRIOR_TOTALS).toEqual({ units: 74, points: 331 });
    expect(formatCgpa(EXAMPLE_PRIOR_TOTALS.points / EXAMPLE_PRIOR_TOTALS.units)).toBe('4.47');
  });

  it('pins GPA 4.15 and PI 3.30 from the scores', () => {
    const semester = exampleSemesterFromScores();
    expect(formatCgpa(semester.gpa)).toBe('4.15');
    expect(formatCgpa(semester.pi)).toBe('3.30');
    expect(semester.creditLoaded).toBe(13);
  });

  it('pins the live slip at load: GPA 4.15, CGPA 4.43, Second Class Upper, 54 points', () => {
    const slip = computeExampleSlip();
    expect(slip.points).toBe(54);
    expect(formatCgpa(slip.gpa)).toBe('4.15');
    expect(formatCgpa(slip.cgpa)).toBe('4.43');
    expect(slip.totalPoints).toBe(385);
    expect(slip.totalUnits).toBe(87);
    expect(slip.classBand.label).toBe('Second Class Upper');
    expect(slip.carryOvers).toBe(0);
    expect(slip.toFirstClass).toBe(0.07);
  });

  it('MTH 301 C to A gives 4.49, still Second Class Upper', () => {
    const slip = computeExampleSlip({ 'MTH 301': 'A' });
    expect(slip.totalPoints).toBe(391);
    expect(formatCgpa(slip.cgpa)).toBe('4.49');
    expect(slip.classBand.label).toBe('Second Class Upper');
    expect(slip.toFirstClass).toBe(0.01);
  });

  it('then CSC 303 B to A gives 4.53, First Class', () => {
    const slip = computeExampleSlip({ 'MTH 301': 'A', 'CSC 303': 'A' });
    expect(slip.totalPoints).toBe(394);
    expect(formatCgpa(slip.cgpa)).toBe('4.53');
    expect(slip.classBand.label).toBe('First Class');
    expect(slip.toFirstClass).toBe(0);
  });

  it('counts an F as one carry-over', () => {
    expect(computeExampleSlip({ 'GST 311': 'F' }).carryOvers).toBe(1);
  });

  it('pins the running CGPA 4.72, 4.75, 4.42, 4.47, 4.43', () => {
    expect(exampleRunningCgpa().map(formatCgpa)).toEqual(['4.72', '4.75', '4.42', '4.47', '4.43']);
  });

  it('needs an average of 4.67 over 40 more units for First Class (4.6625, rounded up)', () => {
    const required = requiredAverageForTarget({ currentCgpa: 385 / 87, completedUnits: 87, remainingUnits: 40, targetCgpa: 4.5 });
    expect(required).toBeCloseTo(4.6625, 6);
    expect(Math.ceil((required as number) * 100 - 1e-9) / 100).toBe(4.67);
  });
});
