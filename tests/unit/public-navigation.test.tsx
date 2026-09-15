import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'next-themes';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const { authState } = vi.hoisted(() => ({
  authState: { user: null as { uid: string } | null, uid: null as string | null, loading: false, error: null },
}));

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => authState }));

import { Navbar } from '@/components/layout/Navbar';
import { PublicFooter } from '@/components/layout/PublicShell';
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

beforeEach(() => {
  Object.assign(authState, { user: null, uid: null, loading: false, error: null });
});

function renderWithTheme(ui: React.ReactNode) {
  return render(
    <ThemeProvider attribute="class" defaultTheme="system">
      {ui}
    </ThemeProvider>
  );
}

describe('public responsive navigation', () => {
  it('uses the branded AcadeGrade wordmark treatment', () => {
    renderWithTheme(<Navbar />);

    const homeLink = screen.getByRole('link', { name: 'AcadeGrade home' });
    expect(homeLink.querySelector('[data-wordmark-accent="grade"]')).toHaveTextContent('Grade');
  });

  it('keeps the compact navigation available through tablet widths', () => {
    renderWithTheme(<Navbar />);

    const header = screen.getByRole('banner');
    const publicNavigation = screen.getByRole('navigation', { name: 'Public navigation' });
    const desktopLinks = within(publicNavigation).getByRole('link', { name: 'Features' }).parentElement;
    const menuButton = within(publicNavigation).getByRole('button', { name: 'Open navigation menu' });

    expect(header).toHaveClass('sticky');
    expect(header).not.toHaveClass('fixed');
    expect(header).toHaveClass('public-nav-shell');
    expect(publicNavigation).toHaveClass('public-nav-capsule');
    expect(publicNavigation).toHaveClass('grid-cols-[1fr_auto]', 'lg:grid-cols-[1fr_auto_1fr]');
    expect(desktopLinks).toHaveClass('lg:flex');
    expect(desktopLinks).not.toHaveClass('md:flex');
    expect(menuButton).toHaveClass('lg:hidden');
    expect(screen.queryByRole('navigation', { name: 'Public mobile dock' })).not.toBeInTheDocument();
  });

  it('keeps a useful primary action visible while authentication resolves', () => {
    authState.loading = true;
    renderWithTheme(<Navbar />);

    const publicNavigation = screen.getByRole('navigation', { name: 'Public navigation' });
    expect(within(publicNavigation).getByRole('link', { name: 'Get started' })).toHaveAttribute('href', '/register');
  });

  it('opens the mobile navigation from the compact top capsule', async () => {
    const user = userEvent.setup();
    renderWithTheme(<Navbar />);

    await user.click(screen.getByRole('button', { name: 'Open navigation menu' }));

    const dialog = await screen.findByRole('dialog', { name: 'Navigate AcadeGrade' });
    const mobileNavigation = screen.getByRole('navigation', { name: 'Public mobile menu' });
    expect(mobileNavigation).toContainElement(screen.getByRole('link', { name: 'Features' }));
    expect(mobileNavigation).toContainElement(screen.getByRole('link', { name: 'How it works' }));
    expect(mobileNavigation).toContainElement(screen.getByRole('link', { name: 'About AcadeGrade' }));
    expect(mobileNavigation).toContainElement(screen.getByRole('link', { name: 'Calculator' }));
    expect(dialog).toHaveClass('public-mobile-menu', 'mt-[5.25rem]', 'self-start', 'lg:hidden');
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

    expect(actions).toHaveClass('lg:flex-row');
    expect(actions).not.toHaveClass('sm:flex-row');
    expect(actions).not.toHaveClass('md:flex-row');
    expect(primaryAction).toHaveClass('w-full', 'whitespace-nowrap', 'lg:w-auto');
  });
});

describe('public footer', () => {
  it('renders production copy without encoding artifacts', () => {
    render(<PublicFooter />);

    expect(screen.getByText(/© \d{4} AcadeGrade\. All rights reserved\./)).toBeInTheDocument();
    expect(screen.getByText('Personal academic planning, not an official university record.')).toBeInTheDocument();
  });
});
