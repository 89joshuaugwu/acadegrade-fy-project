import { render, screen, within } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const { nav, authState } = vi.hoisted(() => ({
  nav: { pathname: '/' as string | null },
  authState: { user: null as { uid: string; getIdToken?: () => Promise<string> } | null, uid: null as string | null, loading: false, error: null },
}));

vi.mock('next/navigation', () => ({ usePathname: () => nav.pathname }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => authState }));

import { shellForPath } from '@/components/public/shell-paths';
import { PublicChrome } from '@/components/public/PublicChrome';
import { SkipLink } from '@/components/public/SkipLink';
import { MotionReady, MOTION_READY_CLASS } from '@/components/public/MotionReady';
import { isCurrentPath } from '@/components/public/nav';
import { MinimalShell } from '@/components/public/shells/MinimalShell';
import { AuthShell } from '@/components/public/shells/AuthShell';
import { photoFor } from '@/lib/public/page-photos';

beforeAll(() => {
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
      this.setAttribute('open', '');
    };
    HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
      this.removeAttribute('open');
    };
  }
});

beforeEach(() => {
  nav.pathname = '/';
  Object.assign(authState, { user: null, uid: null, loading: false, error: null });
});

afterEach(() => {
  vi.unstubAllGlobals();
  document.documentElement.className = '';
});

// The brand v2 header and footer (components/site) are covered by tests/unit/public-navigation.test.tsx.

describe('shell routing under app/(public)', () => {
  it('sends auth and share routes to their own shells and everything else to the public shell', () => {
    expect(shellForPath('/')).toBe('public');
    expect(shellForPath('/calculator')).toBe('public');
    expect(shellForPath('/features/timetable')).toBe('public');
    expect(shellForPath('/login')).toBe('auth');
    expect(shellForPath('/register?step=2')).toBe('auth');
    expect(shellForPath('/forgot-password/')).toBe('auth');
    expect(shellForPath('/share/abc123')).toBe('minimal');
    expect(shellForPath('/c/CSC301')).toBe('minimal');
    expect(shellForPath('/c')).toBe('minimal');
    expect(shellForPath('/loginhelp')).toBe('public');
    expect(shellForPath(null)).toBe('public');
  });

  it('wraps public pages in header, main#content and footer', () => {
    nav.pathname = '/about';
    render(
      <PublicChrome header={<header>Header</header>} footer={<footer>Footer</footer>}>
        <p>Page</p>
      </PublicChrome>
    );
    const main = screen.getByRole('main');
    expect(main).toHaveAttribute('id', 'content');
    expect(main).toHaveTextContent('Page');
    expect(screen.getByRole('banner')).toHaveTextContent('Header');
    expect(screen.getByRole('contentinfo')).toHaveTextContent('Footer');
  });

  it('renders auth and minimal pages alone, so their shells bring their own landmarks', () => {
    nav.pathname = '/login';
    render(
      <PublicChrome header={<header>Header</header>} footer={<footer>Footer</footer>}>
        <p>Login page</p>
      </PublicChrome>
    );
    expect(screen.queryByRole('main')).toBeNull();
    expect(screen.queryByText('Header')).toBeNull();
    expect(screen.getByText('Login page')).toBeInTheDocument();
  });

  it('matches sections of a page as current', () => {
    expect(isCurrentPath('/tools/required-gpa', '/tools')).toBe(true);
    expect(isCurrentPath('/toolsx', '/tools')).toBe(false);
    expect(isCurrentPath('/', '/')).toBe(true);
  });
});

describe('SkipLink and MotionReady', () => {
  it('skips to #content', () => {
    render(<SkipLink />);
    expect(screen.getByRole('link', { name: 'Skip to content' })).toHaveAttribute('href', '#content');
  });

  it('adds pg-motion-ready to <html> once scripts run, unless data saver is on', () => {
    const { unmount } = render(<MotionReady />);
    expect(document.documentElement.classList.contains(MOTION_READY_CLASS)).toBe(true);
    unmount();
    document.documentElement.classList.remove(MOTION_READY_CLASS);
    localStorage.setItem('acadegrade:data-saver:v1', '1');
    render(<MotionReady />);
    expect(document.documentElement.classList.contains(MOTION_READY_CLASS)).toBe(false);
    expect(document.documentElement.dataset.dataSaver).toBe('on');
    localStorage.clear();
  });
});

describe('MinimalShell', () => {
  it('has a skip link, the mark linking home, a way back, main#content and the imprint', () => {
    render(
      <MinimalShell mainLabel="Shared record">
        <h1>Shared record</h1>
      </MinimalShell>
    );
    expect(screen.getByRole('link', { name: 'Skip to content' })).toHaveAttribute('href', '#content');
    expect(screen.getByRole('link', { name: 'AcadeGrade home' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Back to AcadeGrade' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('main', { name: 'Shared record' })).toHaveAttribute('id', 'content');
    expect(screen.getByRole('contentinfo')).toHaveTextContent('Personal academic planning, not an official university record');
    expect(screen.getByRole('link', { name: 'Privacy notice' })).toHaveAttribute('href', '/privacy');
  });

  it('takes a replacement imprint', () => {
    render(
      <MinimalShell imprint={<p>Custom line</p>}>
        <h1>Page</h1>
      </MinimalShell>
    );
    expect(screen.getByRole('contentinfo')).toHaveTextContent('Custom line');
  });
});

describe('AuthShell', () => {
  it('labels main by the h1 and keeps a way back, support and privacy', () => {
    render(
      <AuthShell title="Welcome back" sentence="Sign in to see your record and pick up where you left off." reassurance="Signing in never changes your saved results.">
        <form aria-label="Sign in with email" />
      </AuthShell>
    );
    expect(screen.getByRole('main', { name: 'Welcome back' })).toHaveAttribute('id', 'content');
    expect(screen.getByRole('heading', { level: 1, name: 'Welcome back' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to site' })).toHaveAttribute('href', '/');
    const links = screen.getByRole('navigation', { name: 'Help and site links' });
    expect(within(links).getByRole('link', { name: 'Support' })).toHaveAttribute('href', '/support');
    expect(within(links).getByRole('link', { name: 'Privacy notice' })).toHaveAttribute('href', '/privacy');
    expect(screen.getByRole('form', { name: 'Sign in with email' })).toBeInTheDocument();
  });

  it('shows the reassurance line beside the form, with the slot photo art-directed to desktop', () => {
    const { container } = render(<AuthShell title="Welcome back" photo="auth.login" reassurance="Signing in never changes your saved results."><div /></AuthShell>);
    expect(screen.getByRole('figure')).toHaveTextContent('Signing in never changes your saved results.');
    const slot = photoFor('auth.login');
    if (slot) {
      container.querySelectorAll('figure picture source').forEach((source) => expect(source).toHaveAttribute('media', '(min-width: 1024px)'));
      expect(screen.getByAltText(slot.alt).getAttribute('src')).toMatch(/^data:image\/gif/);
    } else {
      expect(container.querySelector('img')).toBeNull();
    }
  });

  it('puts a progress nav above the h1 when given', () => {
    render(<AuthShell title="Reset your password" progress={<nav aria-label="Reset progress" />}><div /></AuthShell>);
    expect(screen.getByRole('navigation', { name: 'Reset progress' })).toBeInTheDocument();
  });
});
