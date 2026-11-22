import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { NextActionCard } from '@/components/dashboard/NextActionCard';
import { getDashboardNextAction } from '@/lib/dashboard/next-action';

describe('NextActionCard', () => {
  it('keeps the eyebrow for screen readers only, with the title as the visible heading', () => {
    const action = getDashboardNextAction({ hasAcademicData: true, atRiskCount: 2, unknownCount: 0, insightsStale: false });
    render(<NextActionCard action={action} />);

    const eyebrow = screen.getByText(`${action.eyebrow}:`, { exact: false });
    expect(eyebrow).toHaveClass('sr-only');
    // Read with the heading, so its meaning survives for assistive tech.
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(`${action.eyebrow}: ${action.title}`);
    expect(screen.getByRole('link', { name: action.label })).toHaveAttribute('href', action.href);
  });
});
