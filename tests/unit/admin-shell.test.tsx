import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const navigation = vi.hoisted(() => ({ pathname: '/admin/ai' }));
vi.mock('next/navigation', () => ({
  usePathname: () => navigation.pathname,
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { uid: 'admin-1', email: 'admin@acadegrade.example' } }),
}));
vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => true }));

vi.mock('@/lib/firebase/auth', () => ({ signOut: vi.fn() }));
vi.mock('@/lib/firebase/fcm', () => ({ removeNotificationToken: vi.fn() }));
vi.mock('@/components/ui/ThemeControl', () => ({ ThemeControl: () => <div aria-label="Theme controls" /> }));

import { AdminShell } from '@/components/layout/AdminShell';

const groupLinks = (name: string) => within(screen.getByRole('group', { name })).getAllByRole('link').map((link) => [link.textContent, link.getAttribute('href')]);

describe('AdminShell', () => {
  it('groups navigation by job with the renamed labels', () => {
    navigation.pathname = '/admin/ai';
    render(<AdminShell><p>Content</p></AdminShell>);
    const primary = screen.getByRole('navigation', { name: 'Admin primary navigation' });
    expect(within(primary).getAllByRole('link').map((link) => link.textContent)).toEqual([
      'Overview', 'Users', 'Academic catalogue', 'Academic analytics', 'API health',
      'AI providers', 'Free uses & coins', 'Advertising', 'Android release', 'Settings', 'Audit log',
    ]);
    expect(groupLinks('Students')).toEqual([['Users', '/admin/users'], ['Academic catalogue', '/admin/academic-catalog']]);
    expect(groupLinks('Monitoring')).toEqual([['Academic analytics', '/admin/analytics'], ['API health', '/admin/api-analytics']]);
    expect(groupLinks('AI, limits & ads')).toEqual([['AI providers', '/admin/ai'], ['Free uses & coins', '/admin/usage'], ['Advertising', '/admin/ads']]);
    expect(groupLinks('Release & system')).toEqual([['Android release', '/admin/mobile-release'], ['Settings', '/admin/settings'], ['Audit log', '/admin/audit']]);
  });

  it('keeps the legacy course list out of the navigation', () => {
    navigation.pathname = '/admin/dashboard';
    render(<AdminShell><p>Content</p></AdminShell>);
    expect(screen.queryByRole('link', { name: /course catalogue/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /legacy course list/i })).not.toBeInTheDocument();
  });

  it('keeps the tablet header above the content until the desktop rail appears', () => {
    render(<AdminShell><p>Content</p></AdminShell>);
    const shell = screen.getByRole('main').parentElement;
    expect(shell).toHaveClass('lg:flex-row');
    expect(shell).not.toHaveClass('md:flex-row');
    expect(screen.getByRole('main')).toHaveClass('min-w-0');
  });

  it('names the current section and marks the active destination', () => {
    navigation.pathname = '/admin/ai';
    render(<AdminShell><p>AI page content</p></AdminShell>);
    expect(screen.getByRole('link', { name: 'AI providers' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Open AI providers navigation' })).toHaveAttribute('aria-expanded', 'false');
  });

  it('titles the hidden legacy course list for the mobile header', () => {
    navigation.pathname = '/admin/courses';
    render(<AdminShell><p>Courses</p></AdminShell>);
    expect(screen.getByRole('button', { name: 'Open Legacy course list navigation' })).toBeInTheDocument();
  });

  it('opens the same grouped navigation on small screens', async () => {
    navigation.pathname = '/admin/usage';
    const user = userEvent.setup();
    render(<AdminShell><p>Usage</p></AdminShell>);
    await user.click(screen.getByRole('button', { name: 'Open Free uses & coins navigation' }));
    const dialog = await screen.findByRole('dialog', { name: 'Admin navigation' });
    const mobile = within(dialog).getByRole('navigation', { name: 'Admin mobile navigation' });
    expect(within(mobile).getAllByRole('link')).toHaveLength(11);
    expect(within(mobile).getByRole('link', { name: 'Free uses & coins' })).toHaveAttribute('aria-current', 'page');
    expect(within(mobile).getByRole('group', { name: 'Release & system' })).toBeInTheDocument();
  });
});
