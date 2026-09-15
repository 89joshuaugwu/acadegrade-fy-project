import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { RecentResults } from '@/components/dashboard/RecentResults';

describe('dashboard recent results', () => {
  it('keeps grade, course context and score in a predictable three-column row', () => {
    render(
      <RecentResults
        courses={[
          {
            id: 'course-1',
            semesterId: 'semester-1',
            semesterLabel: '200L First Semester',
            session: '2025/2026',
            semesterIndex: 2,
            code: 'CSC 201',
            title: 'Data Structures and Algorithms',
            units: 3,
            grade: 'B',
            totalScore: 64,
          },
        ]}
      />
    );

    const result = screen.getByRole('link', { name: /CSC 201 Data Structures and Algorithms/i });
    expect(result).toHaveAttribute('href', '/results/semester-1?course=course-1');
    expect(result).toHaveTextContent('200L First Semester');
    expect(result).toHaveTextContent('64/100');
    expect(result).toHaveTextContent('B');
  });

  it('distinguishes grade-only records from records still awaiting a score', () => {
    render(
      <RecentResults
        courses={[
          {
            id: 'grade-only',
            semesterId: 'semester-1',
            semesterLabel: '100L First Semester',
            session: '2024/2025',
            semesterIndex: 0,
            code: 'GST 101',
            title: 'Communication in English',
            grade: 'A',
            totalScore: null,
          },
          {
            id: 'pending',
            semesterId: 'semester-1',
            semesterLabel: '100L First Semester',
            session: '2024/2025',
            semesterIndex: 0,
            code: 'MAT 101',
            title: 'Algebra',
            grade: null,
            totalScore: null,
          },
        ]}
      />
    );

    expect(screen.getByText('Grade only')).toBeInTheDocument();
    expect(screen.getByText('Awaiting score')).toBeInTheDocument();
  });

  it('turns the empty state into the next useful action', () => {
    render(<RecentResults courses={[]} />);

    expect(screen.getByRole('link', { name: 'Add your first semester' })).toHaveAttribute('href', '/results/new');
  });
});
