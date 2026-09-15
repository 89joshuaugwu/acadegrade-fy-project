import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/cgpa/CGPAArc', () => ({
  CGPAArc: () => <div>Academic metric arc</div>,
}));

import { StandingOverview } from '@/components/dashboard/StandingOverview';

describe('dashboard standing overview', () => {
  it('does not present zero or Fail as a real result before a student has data', () => {
    render(
      <StandingOverview
        hasAcademicData={false}
        isPIMode={false}
        onModeChange={() => undefined}
        cgpa={0}
        pi={0}
        degreeClassLabel="Fail"
        latestSemesterLabel={null}
        currentSemesterMetric={0}
        totalCredits={0}
        coursesDone={0}
        atRiskCount={0}
        unknownCount={0}
      />
    );

    expect(screen.getByText('No result yet')).toBeInTheDocument();
    expect(screen.queryByText('Fail')).not.toBeInTheDocument();
    expect(screen.queryByText('0.00')).not.toBeInTheDocument();
    expect(screen.getByText('Add a semester to calculate your standing.')).toBeInTheDocument();
  });
});
