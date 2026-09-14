import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import QuickCalculatorPage from '@/app/(public)/calculator/page';

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  push: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mocks.replace, push: mocks.push }),
  usePathname: () => '/calculator',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: null, uid: null, loading: false, error: null }),
}));

vi.mock('@/components/layout/Navbar', () => ({ Navbar: () => null }));
vi.mock('@/components/layout/PublicShell', () => ({ PublicFooter: () => null }));

describe('Quick calculator presentation', () => {
  beforeEach(() => {
    mocks.replace.mockReset();
    mocks.push.mockReset();
  });

  it('provides an accessible calculation workspace with explicit entry modes', async () => {
    render(<QuickCalculatorPage />);

    const workspace = await screen.findByRole('main', { name: /quick cgpa calculator/i });
    expect(workspace).toBeInTheDocument();
    const modes = within(workspace).getByRole('radiogroup', { name: /result entry mode/i });
    expect(within(modes).getByRole('radio', { name: /letter grades/i })).toBeChecked();
    expect(within(modes).getByRole('radio', { name: /scores out of 100/i })).not.toBeChecked();
    expect(within(workspace).getByRole('textbox', { name: /course code 1/i })).toBeInTheDocument();
    expect(within(workspace).getByRole('combobox', { name: /credit units 1/i })).toBeInTheDocument();
    expect(within(workspace).getByRole('combobox', { name: /grade 1/i })).toBeInTheDocument();
  });

  it('preserves the existing default calculation and score-mode conversion', async () => {
    const user = userEvent.setup();
    render(<QuickCalculatorPage />);

    const result = await screen.findByRole('status', { name: /current calculation/i });
    expect(within(result).getByText('8')).toBeInTheDocument();
    expect(within(result).getByText('3')).toBeInTheDocument();
    expect(within(result).getAllByText('4.13')).toHaveLength(2);

    await user.click(screen.getByRole('radio', { name: /scores out of 100/i }));
    const scoreInputs = screen.getAllByRole('spinbutton', { name: /score for course/i });
    expect(scoreInputs).toHaveLength(3);
    scoreInputs.forEach((input) => expect(input).toHaveValue(50));
  });

  it('opens an accessible account dialog for protected actions', async () => {
    const user = userEvent.setup();
    render(<QuickCalculatorPage />);

    await screen.findByRole('main', { name: /quick cgpa calculator/i });
    await user.click(screen.getByRole('button', { name: /share calculation/i }));

    const dialog = await screen.findByRole('dialog', { name: /create an account to continue/i });
    expect(within(dialog).getByRole('link', { name: /create account/i })).toHaveAttribute('href', '/register');
    expect(within(dialog).getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/login');
    await user.click(within(dialog).getByRole('button', { name: /not now/i }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /create an account to continue/i })).not.toBeInTheDocument();
    });
  });

  it('explains a cleared calculation and keeps the recovery action available', async () => {
    const user = userEvent.setup();
    render(<QuickCalculatorPage />);

    await screen.findByRole('main', { name: /quick cgpa calculator/i });
    await user.click(screen.getByRole('button', { name: /clear all courses/i }));
    expect(screen.getByText(/no courses in this calculation/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add a course/i })).toBeInTheDocument();
  });
});
