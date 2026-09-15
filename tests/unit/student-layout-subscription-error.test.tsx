import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  retry: vi.fn(),
  getDocument: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mocks.replace }),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { uid: 'student-1' }, loading: false }),
}));

vi.mock('@/hooks/useProfile', () => ({
  useProfile: () => ({
    profile: null,
    loading: false,
    error: new Error('profile offline'),
    retry: mocks.retry,
  }),
}));

vi.mock('@/lib/firebase/firestore', () => ({
  getDocument: mocks.getDocument,
}));

vi.mock('@/components/layout/StudentShell', () => ({
  StudentShell: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}));

import StudentLayout from '@/app/(student)/layout';

describe('student layout profile recovery', () => {
  beforeEach(() => {
    mocks.replace.mockReset();
    mocks.retry.mockReset();
    mocks.getDocument.mockReset().mockResolvedValue(null);
  });

  it('shows an accessible retry state without redirecting a failed profile to registration', async () => {
    const user = userEvent.setup();
    render(<StudentLayout><p>Student content</p></StudentLayout>);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('account could not load');
    expect(mocks.replace).not.toHaveBeenCalledWith('/register');

    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(mocks.retry).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(mocks.getDocument).toHaveBeenCalledWith('config/settings'));
  });
});
