import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  semesters: [] as unknown[],
  loading: false,
  error: null as Error | null,
}));

vi.mock('@/hooks/useSemesters', () => ({
  useSemesters: () => ({ ...state, retry: vi.fn() }),
}));
vi.mock('@/hooks/usePlatformSettings', () => ({
  usePlatformSettings: () => ({ isFeatureDisabled: () => false }),
}));
vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => true }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { uid: 'student-1' } }) }));
vi.mock('@/lib/firebase/firestore', () => ({ deleteDocument: vi.fn(), queryCollection: vi.fn() }));
vi.mock('@/components/onboarding/ResultsTour', () => ({ ResultsTour: () => null }));
// The placement's own delivery rules are covered in ad-placement.test.tsx.
vi.mock('@/components/ads/AdPlacement', () => ({
  AdPlacement: ({ placement, seed }: { placement: string; seed?: string }) => <div data-testid="ad-slot" data-placement={placement} data-seed={seed} />,
}));

import ResultsListPage from '@/app/(student)/results/page';

const semester = (id: string, label: string) => ({
  id, label, level: 100, semester: 1, gpa: 4.2, creditLoaded: 18, isComplete: true,
});

describe('Results page promotion slot', () => {
  beforeEach(() => {
    state.semesters = [];
    state.loading = false;
    state.error = null;
  });

  it('mounts the Results placement once, after the semester list', () => {
    state.semesters = [semester('a', 'First semester'), semester('b', 'Second semester')];
    render(<ResultsListPage />);
    const slot = screen.getByTestId('ad-slot');
    expect(slot).toHaveAttribute('data-placement', 'results.overview');
    expect(slot).toHaveAttribute('data-seed', 'student-1');
    const lastSemester = screen.getByText('Second semester');
    expect(lastSemester.compareDocumentPosition(slot) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole('button', { name: /new semester/i }).compareDocumentPosition(slot) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('never shows the slot without meaningful results content', () => {
    const view = render(<ResultsListPage />);
    expect(screen.getByText('No Results Yet')).toBeInTheDocument();
    expect(screen.queryByTestId('ad-slot')).not.toBeInTheDocument();
    state.error = new Error('offline');
    view.rerender(<ResultsListPage />);
    expect(screen.queryByTestId('ad-slot')).not.toBeInTheDocument();
    state.error = null;
    state.loading = true;
    view.rerender(<ResultsListPage />);
    expect(screen.queryByTestId('ad-slot')).not.toBeInTheDocument();
  });
});
