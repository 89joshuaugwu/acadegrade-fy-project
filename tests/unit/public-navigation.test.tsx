import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'next-themes';
import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: null, uid: null, loading: false, error: null }),
}));

import { Navbar } from '@/components/layout/Navbar';
import { HomeHero } from '@/components/marketing/HomeHero';

beforeAll(() => {
  class IntersectionObserverStub {
    observe() {}
    disconnect() {}
  }

  vi.stubGlobal('IntersectionObserver', IntersectionObserverStub);
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    callback(0);
    return 1;
  });
  vi.stubGlobal('cancelAnimationFrame', () => undefined);
});

function renderWithTheme(ui: React.ReactNode) {
  return render(
    <ThemeProvider attribute="class" defaultTheme="system">
      {ui}
    </ThemeProvider>
  );
}

describe('public responsive navigation', () => {
  it('keeps the compact navigation available through tablet widths', () => {
    renderWithTheme(<Navbar />);

    const desktopLinks = screen.getByRole('link', { name: 'Features' }).parentElement;
    const menuButton = screen.getByRole('button', { name: 'Open navigation menu' });

    expect(desktopLinks).toHaveClass('lg:flex');
    expect(desktopLinks).not.toHaveClass('md:flex');
    expect(menuButton).toHaveClass('lg:hidden');
  });

  it('opens a labelled mobile menu with navigation, theme, and account actions', async () => {
    const user = userEvent.setup();
    renderWithTheme(<Navbar />);

    await user.click(screen.getByRole('button', { name: 'Open navigation menu' }));

    const dialog = await screen.findByRole('dialog', { name: 'Navigate AcadeGrade' });
    expect(screen.getByRole('navigation', { name: 'Mobile navigation' })).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: 'Choose colour theme' })).toBeInTheDocument();
    expect(dialog).toContainElement(screen.getByRole('link', { name: 'Sign in' }));
    expect(dialog).toContainElement(screen.getByRole('link', { name: 'Get started' }));
  });
});

describe('public call-to-action responsiveness', () => {
  it('keeps long hero actions stacked until the desktop content width is available', () => {
    render(<HomeHero />);

    const primaryAction = screen.getByRole('link', { name: /start your academic record/i });
    const actions = primaryAction.parentElement;

    expect(actions).toHaveClass('md:flex-row');
    expect(actions).not.toHaveClass('sm:flex-row');
  });
});
