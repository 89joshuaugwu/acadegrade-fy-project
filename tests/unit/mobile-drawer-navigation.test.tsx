import { render, screen } from '@testing-library/react';
import { ThemeProvider } from 'next-themes';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  usePathname: () => '/results/semester-1',
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { uid: 'student-1', email: 'ada@example.com' } }),
}));

vi.mock('@/lib/firebase/auth', () => ({ signOut: vi.fn() }));
vi.mock('@/lib/firebase/fcm', () => ({ removeNotificationToken: vi.fn() }));

import { MobileDrawer } from '@/components/layout/MobileDrawer';

describe('student mobile drawer', () => {
  it('mirrors the four primary destinations and keeps account tools separate', () => {
    render(
      <ThemeProvider attribute="class" defaultTheme="system">
        <MobileDrawer
          isOpen
          onClose={() => undefined}
          profile={{ fullName: 'Ada Student', matric: 'AG/2026/001' } as never}
          unreadCount={2}
        />
      </ThemeProvider>
    );

    expect(screen.getByRole('dialog', { name: 'Student navigation' })).toBeInTheDocument();
    const primary = screen.getByRole('navigation', { name: 'Student primary navigation' });
    expect(primary).toContainElement(screen.getByRole('link', { name: 'Dashboard' }));
    expect(primary).toContainElement(screen.getByRole('link', { name: 'Results' }));
    expect(primary).toContainElement(screen.getByRole('link', { name: 'Insights' }));
    expect(primary).toContainElement(screen.getByRole('link', { name: 'Transcript' }));
    expect(screen.getByRole('link', { name: 'Results' })).toHaveAttribute('aria-current', 'page');

    const tools = screen.getByRole('navigation', { name: 'Student account navigation' });
    expect(tools).toContainElement(screen.getByRole('link', { name: 'Settings' }));
    expect(tools).toContainElement(screen.getByRole('link', { name: /Notifications/ }));
  });
});
