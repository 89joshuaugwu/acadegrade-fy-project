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
