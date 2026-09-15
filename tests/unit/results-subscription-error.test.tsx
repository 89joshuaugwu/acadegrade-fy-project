import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ retry: vi.fn() }));

vi.mock('@/hooks/useSemesters', () => ({
  useSemesters: () => ({
    semesters: [],
    loading: false,
    error: new Error('semesters offline'),
    retry: mocks.retry,
  }),
}));

vi.mock('@/hooks/usePlatformSettings', () => ({
  usePlatformSettings: () => ({ isFeatureDisabled: () => false }),
}));

vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => true }));
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { uid: 'student-1' } }),
}));
vi.mock('@/lib/firebase/firestore', () => ({
  deleteDocument: vi.fn(),
  queryCollection: vi.fn(),
}));
vi.mock('@/components/onboarding/ResultsTour', () => ({ ResultsTour: () => null }));

import ResultsListPage from '@/app/(student)/results/page';

describe('results subscription recovery', () => {
  it('distinguishes a load failure from an empty record and retries in place', async () => {
    const user = userEvent.setup();
    render(<ResultsListPage />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('results could not load');
    expect(screen.queryByText('No Results Yet')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(mocks.retry).toHaveBeenCalledTimes(1);
  });
});
