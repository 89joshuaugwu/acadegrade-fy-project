import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readCalculatorHandoff } from '@/lib/handoff/calculator';

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  auth: { user: null as null | { uid: string }, uid: null as string | null, loading: false, error: null },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: mocks.push }),
  usePathname: () => '/calculator',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => mocks.auth }));
vi.mock('@/components/layout/Navbar', () => ({ Navbar: () => null }));
vi.mock('@/components/layout/PublicShell', () => ({ PublicFooter: () => null }));

import QuickCalculatorPage from '@/app/(public)/calculator/page';

beforeEach(() => {
  sessionStorage.clear();
  mocks.push.mockReset();
  mocks.auth.user = null;
  mocks.auth.uid = null;
});

describe('Calculator "Save to profile" handoff', () => {
  it('keeps the entered courses for a signed-out visitor and says so before sign-up', async () => {
    const user = userEvent.setup();
    render(<QuickCalculatorPage />);

    await screen.findByRole('main', { name: /quick cgpa calculator/i });
    await user.click(screen.getByRole('button', { name: /save to profile/i }));

    const handoff = readCalculatorHandoff();
    expect(handoff?.mode).toBe('grade');
    expect(handoff?.courses).toEqual([
      { code: '', units: 3, grade: 'A' },
      { code: '', units: 3, grade: 'B' },
      { code: '', units: 2, grade: 'C' },
    ]);

    const dialog = await screen.findByRole('dialog', { name: /create an account to continue/i });
    expect(within(dialog).getByText(/your 3 courses are kept on this device/i)).toBeInTheDocument();
    expect(within(dialog).getByRole('link', { name: /create account/i })).toHaveAttribute('href', '/register');
    expect(within(dialog).getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/login');
  });

  it('sends a signed-in student to Results with the courses waiting', async () => {
    const user = userEvent.setup();
    mocks.auth.user = { uid: 'student' };
    mocks.auth.uid = 'student';
    render(<QuickCalculatorPage />);

    await screen.findByRole('main', { name: /quick cgpa calculator/i });
    await user.click(screen.getByRole('button', { name: /save to profile/i }));

    expect(readCalculatorHandoff()?.courses).toHaveLength(3);
    expect(mocks.push).toHaveBeenCalledWith('/results');
  });

  it('reminds the visitor on sign-in and sign-up that their courses are waiting', async () => {
    const { saveCalculatorHandoff } = await import('@/lib/handoff/calculator');
    const { CalculatorHandoffNotice } = await import('@/components/marketing/CalculatorHandoffNotice');
    const { unmount } = render(<CalculatorHandoffNotice />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    unmount();

    saveCalculatorHandoff({ mode: 'grade', courses: [{ code: 'CSC 101', units: 3, grade: 'A' }, { code: 'MTH 101', units: 2, grade: 'B' }] });
    render(<CalculatorHandoffNotice />);
    expect(await screen.findByRole('status')).toHaveTextContent(/your 2 calculator courses are saved on this device/i);
  });

  it('does not keep anything when the share action (not save) asks for an account', async () => {
    const user = userEvent.setup();
    render(<QuickCalculatorPage />);

    await screen.findByRole('main', { name: /quick cgpa calculator/i });
    await user.click(screen.getByRole('button', { name: /share calculation/i }));

    expect(readCalculatorHandoff()).toBeNull();
  });
});
