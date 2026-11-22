import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SCALES } from '@/lib/cgpa/academicRules';
import { examNeededForGrades } from '@/components/cgpa/examNeeded';
import { GradeTable } from '@/components/cgpa/GradeTable';
import { GradingScaleProvider } from '@/hooks/useGradingScale';
import { prepareSemesterSave } from '@/lib/results/semester-save';
import type { CourseInput } from '@/types/course';

const course: CourseInput = { code: 'CSC 401', title: 'Compilers', units: 3, caScore: 25, examScore: 47 };

describe('grade entry follows the active scale', () => {
  it('grades with the polytechnic letters and points', () => {
    render(<GradingScaleProvider setting={{ id: 'nbte4' }}><GradeTable editable initialCourses={[course]} /></GradingScaleProvider>);
    expect(screen.getByTestId('grade-table-gpa')).toHaveTextContent('3.50');
    expect(screen.getAllByText('AB').length).toBeGreaterThan(0);
    const legend = screen.getByTestId('grade-table-distribution');
    expect(within(legend).getByText('BC')).toBeInTheDocument();
    expect(within(legend).queryByText('E')).toBeInTheDocument();
  });

  it('keeps the 5-point letters without a provider', () => {
    render(<GradeTable editable initialCourses={[course]} />);
    expect(screen.getByTestId('grade-table-gpa')).toHaveTextContent('5.00');
    expect(within(screen.getByTestId('grade-table-distribution')).queryByText('AB')).toBeNull();
  });

  it('saves points from the active scale', () => {
    const saved = prepareSemesterSave([course], SCALES.nbte4);
    expect(saved.courses[0]).toMatchObject({ grade: 'AB', gradePoint: 3.5 });
    expect(saved.summary.gpa).toBe(3.5);
    expect(prepareSemesterSave([course]).summary.gpa).toBe(5);
  });

  it('gives exam guidance for every passing band on the scale', () => {
    const rows = examNeededForGrades(25, SCALES.nbte4);
    expect(rows.map((row) => row.grade)).toEqual(['A', 'AB', 'B', 'BC', 'C', 'CD', 'D', 'E']);
    expect(rows[0]).toEqual({ grade: 'A', minScore: 75, needed: 50, status: 'needed' });
  });
});
