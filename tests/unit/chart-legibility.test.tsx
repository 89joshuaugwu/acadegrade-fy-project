import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => true }));

import { ForecastChart } from '@/components/charts/ForecastChart';
import { TrendChart } from '@/components/charts/TrendChart';

describe('ForecastChart', () => {
  it('has an accessible name and a screen-reader table separating history from projection', async () => {
    render(<ForecastChart history={[3.1, 1.005]} projected={[3.4, 3.6]} labels={['100L S1', '100L S2', 'Next Sem', 'Next Year']} metricName="CGPA" />);
    expect(await screen.findByRole('img', { name: /cgpa history and projection/i })).toBeInTheDocument();
    const table = screen.getByRole('table', { name: 'CGPA history and projection values' });
    const rows = within(table).getAllByRole('row');
    expect(rows[2]).toHaveTextContent('100L S2');
    expect(rows[2]).toHaveTextContent('1.01');
    expect(rows[2]).toHaveTextContent('Recorded');
    expect(rows[3]).toHaveTextContent('Next Sem');
    expect(rows[3]).toHaveTextContent('3.40');
    expect(rows[3]).toHaveTextContent('Projected');
  });

  it('keeps axis text out of the stretched SVG and lets the page scroll on touch', async () => {
    const { container } = render(<ForecastChart history={[3.1, 3.2]} projected={[3.4]} labels={['100L S1', '100L S2', 'Next Sem']} />);
    await screen.findByRole('img');
    expect(container.querySelectorAll('svg text')).toHaveLength(0);
    expect(container.querySelector('.touch-none')).toBeNull();
    expect(screen.getByText('Next Sem', { selector: '[data-axis="x"] *' })).toBeInTheDocument();
  });
});

describe('TrendChart', () => {
  it('rounds table values with the shared CGPA rounding and keeps axis text out of the SVG', () => {
    const { container } = render(
      <TrendChart metric="both" semesters={[{ semesterId: 's1', label: '100L First Semester', session: '2024/2025', gpa: 1.005, pi: 2.675, creditLoaded: 18 }]} />
    );
    const table = screen.getByRole('table', { name: 'Semester GPA and PI values' });
    expect(table).toHaveTextContent('1.01');
    expect(table).toHaveTextContent('2.68');
    expect(container.querySelectorAll('svg text')).toHaveLength(0);
    expect(container.querySelector('.touch-none')).toBeNull();
  });
});
