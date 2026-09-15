import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { TrendChart } from '@/components/charts/TrendChart';

describe('trend chart accessibility', () => {
  it('provides an accessible chart summary and complete data table', () => {
    render(
      <TrendChart
        metric="both"
        semesters={[
          { semesterId: 's1', label: '100L First Semester', session: '2024/2025', gpa: 3.25, pi: 3.41, creditLoaded: 18 },
          { semesterId: 's2', label: '100L Second Semester', session: '2024/2025', gpa: 3.54, pi: 3.62, creditLoaded: 20 },
        ]}
      />
    );

    expect(screen.getByRole('img', { name: /semester GPA and performance index trend/i })).toBeInTheDocument();
    const table = screen.getByRole('table', { name: 'Semester GPA and PI values' });
    expect(table).toHaveTextContent('100L First Semester');
    expect(table).toHaveTextContent('3.25');
    expect(table).toHaveTextContent('3.41');
    expect(table).toHaveTextContent('100L Second Semester');
  });
});
