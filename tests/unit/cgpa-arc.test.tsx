import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/cgpa/DegreeClassBadge', () => ({
  DegreeClassBadge: ({ cgpa }: { cgpa: number }) => <span>Degree class CGPA {cgpa.toFixed(2)}</span>,
}));

import { CGPAArc } from '@/components/cgpa/CGPAArc';

describe('CGPA arc classification', () => {
  it('always derives degree class from CGPA when PI is the selected display metric', () => {
    render(<CGPAArc cgpa={4.61} pi={2.14} size="md" primaryMetric="pi" animateOnMount={false} />);

    expect(screen.getByText('Degree class CGPA 4.61')).toBeInTheDocument();
  });
});

describe('CGPA arc on another grading scale', () => {
  it('uses the scale maximum and colours the class by its rank', async () => {
    const { GradingScaleProvider } = await import('@/hooks/useGradingScale');
    render(
      <GradingScaleProvider setting={{ id: 'nbte4' }}>
        <CGPAArc cgpa={3.6} pi={3.2} size="md" animateOnMount={false} />
      </GradingScaleProvider>
    );
    // Distinction (top class) wears the first-class tone; the arc is out of 4.
    expect(screen.getByRole('img', { name: 'CGPA: 3.60 out of 4, PI: 3.20' })).toBeInTheDocument();
    expect(document.querySelector('[data-tone]')?.getAttribute('data-tone')).toBe('var(--grade-a)');
  });

  it('keeps the 5-point arc without a provider', () => {
    render(<CGPAArc cgpa={3.6} pi={3.2} size="md" animateOnMount={false} />);
    expect(screen.getByRole('img', { name: 'CGPA: 3.60 out of 5, PI: 3.20' })).toBeInTheDocument();
    expect(document.querySelector('[data-tone]')?.getAttribute('data-tone')).toBe('var(--grade-b)');
  });
});
