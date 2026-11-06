import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  usePathname: () => '/admin/ai',
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { uid: 'admin-1', email: 'admin@acadegrade.example' } }),
}));

vi.mock('@/lib/firebase/auth', () => ({ signOut: vi.fn() }));
vi.mock('@/lib/firebase/fcm', () => ({ removeNotificationToken: vi.fn() }));
vi.mock('@/components/layout/MobileDrawer', () => ({ MobileDrawer: () => null }));
vi.mock('@/components/ui', () => ({ ThemeControl: () => <div aria-label="Theme controls" /> }));

import { AdminShell } from '@/components/layout/AdminShell';

describe('AdminShell', () => {
  it('groups navigation without dropping any admin destination', () => {
    render(<AdminShell><p>Content</p></AdminShell>);
    const delivery = screen.getByRole('group', { name: 'Delivery & settings' });
    expect(within(delivery).getByRole('link', { name: 'Advertising' })).toHaveAttribute('href', '/admin/ads');
    expect(within(delivery).getByRole('link', { name: 'Android release' })).toHaveAttribute('href', '/admin/mobile-release');
    expect(screen.getByRole('group', { name: 'Monitoring' })).toContainElement(screen.getByRole('link', { name: 'AI Operations' }));
    expect(within(screen.getByRole('navigation', { name: 'Admin primary navigation' })).getAllByRole('link')).toHaveLength(10);
  });
  it('keeps the tablet header above the content until the desktop rail appears', () => {
    render(<AdminShell><p>Content</p></AdminShell>);
    const shell = screen.getByRole('main').parentElement;
    expect(shell).toHaveClass('lg:flex-row');
    expect(shell).not.toHaveClass('md:flex-row');
    expect(screen.getByRole('main')).toHaveClass('min-w-0');
  });
  it('announces the current section and marks the active desktop destination', () => {
    render(<AdminShell><p>AI page content</p></AdminShell>);

    expect(screen.getByRole('link', { name: 'AI Operations' })).toBeInTheDocument();
    const navigation = screen.getByRole('navigation', { name: 'Admin primary navigation' });
    expect(navigation).toContainElement(screen.getByRole('link', { name: 'AI Operations' }));
    expect(screen.getByRole('link', { name: 'AI Operations' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Academic catalog' })).toHaveAttribute('href', '/admin/academic-catalog');
    expect(screen.getByRole('button', { name: 'Open AI Operations navigation' })).toHaveAttribute('aria-expanded', 'false');
  });
});
