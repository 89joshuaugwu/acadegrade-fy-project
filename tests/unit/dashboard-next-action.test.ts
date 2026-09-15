import { describe, expect, it } from 'vitest';

import { getDashboardNextAction } from '@/lib/dashboard/next-action';

describe('dashboard next action', () => {
  it('prioritizes creating the academic record when no semester exists', () => {
    expect(getDashboardNextAction({ hasAcademicData: false, atRiskCount: 4, unknownCount: 2, insightsStale: true }))
      .toMatchObject({ href: '/results/new', label: 'Add first semester' });
  });

  it('prioritizes known academic risk over incomplete records and stale insights', () => {
    expect(getDashboardNextAction({ hasAcademicData: true, atRiskCount: 2, unknownCount: 3, insightsStale: true }))
      .toMatchObject({ href: '/results', label: 'Review flagged courses', tone: 'warning' });
  });

  it('does not describe missing scores as failures', () => {
    expect(getDashboardNextAction({ hasAcademicData: true, atRiskCount: 0, unknownCount: 3, insightsStale: false }))
      .toMatchObject({ href: '/results', label: 'Complete pending scores', tone: 'info' });
  });
});
