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
  it('keeps the drawer focused on account utilities without duplicating primary tabs', () => {
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
    expect(screen.queryByRole('navigation', { name: 'Student primary navigation' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Dashboard' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Results' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Insights' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Transcript' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Quick calculator' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'About AcadeGrade' })).not.toBeInTheDocument();

    const account = screen.getByRole('navigation', { name: 'Student account navigation' });
    expect(account).toContainElement(screen.getByRole('link', { name: 'Settings' }));
    expect(account).toContainElement(screen.getByRole('link', { name: /Notifications/ }));
  });
});
