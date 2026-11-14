import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => true }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: null, loading: false }) }));
vi.mock('react-hot-toast', () => ({ default: { error: vi.fn(), success: vi.fn() } }));

import { WhatIfCalculator } from '@/components/ai/WhatIfCalculator';

// Guards the extraction of the required-GPA formula into the shared academic rules.
describe('WhatIfCalculator required GPA', () => {
  it('shows the GPA and average score needed over the remaining units', () => {
    // target starts at current + 0.2 = 3.6: (3.6 x 48 - 3.4 x 30) / 18 = 3.933...
    render(<WhatIfCalculator currentCGPA={3.4} totalCredits={30} initialRemainingSemesters={1} initialCreditLoad={18} />);
    expect(screen.getByText('3.93')).toBeInTheDocument();
    expect(screen.getByText('~79%')).toBeInTheDocument();
  });

  it('subtracts graded in-progress units from the remaining units', () => {
    // 1 semester x 18 units, 9 already graded: 9 units left.
    // target 3.6: (3.6 x (30 + 9) - 3.4 x 30) / 9 = 4.266...
    render(<WhatIfCalculator currentCGPA={3.4} totalCredits={30} initialRemainingSemesters={1} initialCreditLoad={18} gradedInProgressUnits={9} />);
    expect(screen.getByText('4.27')).toBeInTheDocument();
    expect(screen.queryByText(/Nothing left to plan/)).not.toBeInTheDocument();
  });

  it("shows 'nothing left to plan' when every remaining unit is already graded", () => {
    render(<WhatIfCalculator currentCGPA={3.4} totalCredits={30} initialRemainingSemesters={1} initialCreditLoad={18} gradedInProgressUnits={18} />);
    expect(screen.getByText(/Nothing left to plan/)).toBeInTheDocument();
    render(<WhatIfCalculator currentCGPA={3.4} totalCredits={30} initialRemainingSemesters={1} initialCreditLoad={18} gradedInProgressUnits={40} />);
    expect(screen.getAllByText(/Nothing left to plan/)).toHaveLength(2);
  });

  it('marks an unreachable target as impossible', () => {
    // target 5.0: (5 x 78 - 4.9 x 60) / 18 = 5.33
    render(<WhatIfCalculator currentCGPA={4.9} totalCredits={60} initialRemainingSemesters={1} initialCreditLoad={18} />);
    expect(screen.getByText('>5.00')).toBeInTheDocument();
    expect(screen.getByText('Impossible')).toBeInTheDocument();
  });
});
