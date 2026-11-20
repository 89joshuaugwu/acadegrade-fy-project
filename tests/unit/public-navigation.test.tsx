import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const { authState, pathState } = vi.hoisted(() => ({
  authState: { user: null as { uid: string } | null },
  pathState: { value: '/' },
}));

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => authState }));
vi.mock('next/navigation', () => ({ usePathname: () => pathState.value }));
vi.mock('@/lib/site/contact', () => ({ getContactEmail: async () => 'help@acadegrade.example' }));

import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';
import { FOOTER_GROUPS, HEADER_LINKS } from '@/components/public/nav';

beforeAll(() => {
  // jsdom has no <dialog> methods.
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
});

beforeEach(() => {
  authState.user = null;
  pathState.value = '/';
});

describe('brand v2 header', () => {
  it('shows the four main links, Sign in and Start free', () => {
    render(<SiteHeader />);
    const nav = screen.getByRole('navigation', { name: 'Main' });
    for (const link of HEADER_LINKS) expect(within(nav).getByRole('link', { name: link.label })).toHaveAttribute('href', link.href);
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: 'Start free' })).toHaveAttribute('href', '/register');
  });

  it('marks the current page', () => {
    pathState.value = '/features/timetable';
    render(<SiteHeader />);
    expect(within(screen.getByRole('navigation', { name: 'Main' })).getByRole('link', { name: 'Features' })).toHaveAttribute('aria-current', 'page');
  });

  it('swaps to Open dashboard for a signed-in student', () => {
    authState.user = { uid: 'u1' };
    render(<SiteHeader />);
    expect(screen.getAllByRole('link', { name: 'Open dashboard' })[0]).toHaveAttribute('href', '/dashboard');
    expect(screen.queryByRole('link', { name: 'Start free' })).toBeNull();
  });

  it('opens and closes the phone menu', async () => {
    const user = userEvent.setup();
    render(<SiteHeader />);
    await user.click(screen.getByRole('button', { name: /Menu/ }));
    const menu = document.querySelector('dialog') as HTMLDialogElement;
    expect(menu.hasAttribute('open')).toBe(true);
    expect(within(menu).getByRole('link', { name: 'Calculator' })).toHaveAttribute('href', '/calculator');
    await user.click(within(menu).getByRole('button', { name: 'Close' }));
    expect(menu.hasAttribute('open')).toBe(false);
  });
});

describe('brand v2 footer', () => {
  it('lists every footer group and link, the contact email and cookie choices', async () => {
    render(await SiteFooter());
    for (const group of FOOTER_GROUPS) {
      const nav = screen.getByRole('navigation', { name: group.title });
      for (const link of group.links) expect(within(nav).getByRole('link', { name: link.label })).toHaveAttribute('href', link.href);
    }
    expect(screen.getByRole('link', { name: 'help@acadegrade.example' })).toHaveAttribute('href', 'mailto:help@acadegrade.example');
    expect(screen.getByText(/not an official university record/)).toBeInTheDocument();
  });
});
