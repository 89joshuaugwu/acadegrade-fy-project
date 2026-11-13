import { render, renderHook, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ semesters: [] as Record<string, unknown>[] }));

vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => true }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: null, uid: null, loading: false }) }));
vi.mock('@/hooks/useSemesters', () => ({
  useSemesters: () => ({ semesters: mocks.semesters, loading: false, error: null, retry: vi.fn() }),
}));

import { useCGPA } from '@/hooks/useCGPA';
import { CGPAArc } from '@/components/cgpa/CGPAArc';
import { GradeTable } from '@/components/cgpa/GradeTable';

describe('useCGPA', () => {
  it('classifies 539 points over 120 units as 2:1 instead of Fail', () => {
    mocks.semesters = [
      { id: 's1', label: 'Year 1', session: '2023/2024', gpa: 4.5, pi: 4, creditLoaded: 40 },
      { id: 's2', label: 'Year 2', session: '2024/2025', gpa: 4.4875, pi: 4, creditLoaded: 80 },
    ];
    const { result } = renderHook(() => useCGPA());
    expect(result.current.cgpa).toBeCloseTo(539 / 120, 9);
    expect(result.current.totalCredits).toBe(120);
    expect(result.current.degreeClass.shortLabel).toBe('2:1');
  });

  it('counts graded credits from a semester not yet marked complete (same rule as Android)', () => {
    mocks.semesters = [
      { id: 's1', label: 'Year 1', session: '2023/2024', gpa: 4, pi: 4.2, creditLoaded: 12, isComplete: true },
      { id: 's2', label: 'Year 2', session: '2024/2025', gpa: 3, pi: 3.1, creditLoaded: 18, isComplete: false },
    ];
    const { result } = renderHook(() => useCGPA());
    expect(result.current.cgpa).toBeCloseTo(3.4, 9);
    expect(result.current.totalCredits).toBe(30);
  });

  it('is Fail with no semesters', () => {
    mocks.semesters = [];
    const { result } = renderHook(() => useCGPA());
    expect(result.current.cgpa).toBe(0);
    expect(result.current.degreeClass.shortLabel).toBe('Fail');
  });
});

describe('CGPAArc', () => {
  it('shows the rounded CGPA it classifies: 0.995 is 1.00 and Pass', () => {
    render(<CGPAArc cgpa={0.995} pi={2} size="md" animateOnMount={false} />);
    expect(screen.getByText('1.00')).toBeInTheDocument();
    expect(screen.getByText('Pass')).toBeInTheDocument();
  });
});

describe('GradeTable', () => {
  it('grades an imported fractional total between bands with the lower band, not F', () => {
    render(<GradeTable initialCourses={[{ code: 'CSC 411', title: 'Graphics', units: 2, caScore: 19.5, examScore: 50 }]} />);
    expect(screen.getAllByRole('cell', { name: 'B' }).length).toBeGreaterThan(0);
    expect(screen.queryAllByRole('cell', { name: 'F' })).toHaveLength(0);
    expect(screen.getByText('4.00')).toBeInTheDocument();
  });

  it('leaves awaiting-result rows out of the semester GPA', () => {
    render(<GradeTable initialCourses={[
      { code: 'CSC 401', title: 'Compilers', units: 3, caScore: 25, examScore: 50 },
      { code: 'CSC 499', title: 'Project', units: 6, caScore: null, examScore: null, isAR: true },
    ]} />);
    expect(screen.getByText('5.00')).toBeInTheDocument();
  });
});
