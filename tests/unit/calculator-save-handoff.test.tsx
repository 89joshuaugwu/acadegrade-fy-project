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

import CalculatorPage from '@/app/(public)/calculator/page';

const saveButton = () => screen.getAllByRole('button', { name: /save to your record/i })[0];

beforeEach(() => {
  sessionStorage.clear();
  mocks.push.mockReset();
  mocks.auth.user = null;
  mocks.auth.uid = null;
  window.history.replaceState(null, '', '/calculator');
});

describe('Calculator "Save to your record" handoff', () => {
  it('keeps the entered courses for a signed-out visitor and says so before sign-up', async () => {
    const user = userEvent.setup();
    render(<CalculatorPage />);

    await screen.findByRole('heading', { level: 1, name: 'Work out your GPA and CGPA' });
    await user.click(saveButton());

    const handoff = readCalculatorHandoff();
    expect(handoff?.mode).toBe('grade');
    expect(handoff?.courses).toEqual([
      { code: '', units: 3, grade: 'A' },
      { code: '', units: 3, grade: 'B' },
      { code: '', units: 2, grade: 'C' },
    ]);

    const dialog = await screen.findByRole('dialog', { name: /save these courses to your record/i });
    expect(within(dialog).getByText(/your 3 courses are kept on this device for 24 hours/i)).toBeInTheDocument();
    expect(within(dialog).getByRole('link', { name: /create your free record/i })).toHaveAttribute('href', '/register');
    expect(within(dialog).getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/login');
    expect(within(dialog).getByRole('button', { name: /not now/i })).toBeInTheDocument();
  });

  it('sends a signed-in student to Results with the courses waiting', async () => {
    const user = userEvent.setup();
    mocks.auth.user = { uid: 'student' };
    mocks.auth.uid = 'student';
    render(<CalculatorPage />);

    await screen.findByRole('heading', { level: 1, name: 'Work out your GPA and CGPA' });
    expect(screen.getByText(/adds these courses to results/i)).toBeInTheDocument();
    await user.click(saveButton());

    expect(readCalculatorHandoff()?.courses).toHaveLength(3);
    expect(mocks.push).toHaveBeenCalledWith('/results');
  });

  it('shares without an account: copies the link, opens no dialog and keeps nothing', async () => {
    const user = userEvent.setup();
    render(<CalculatorPage />);

    await screen.findByRole('heading', { level: 1, name: 'Work out your GPA and CGPA' });
    await user.click(screen.getByRole('button', { name: /share this calculation/i }));

    expect(await screen.findByRole('button', { name: /link copied/i })).toBeInTheDocument();
    expect(await navigator.clipboard.readText()).toBe(window.location.href);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(readCalculatorHandoff()).toBeNull();
  });
});
