import { render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider } from 'next-themes';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  pathname: '/dashboard',
  getDocument: vi.fn().mockResolvedValue(null),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => mocks.pathname,
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { uid: 'student-1', displayName: 'Ada Student', email: 'ada@example.com' },
  }),
}));

vi.mock('@/hooks/useProfile', () => ({
  useProfile: () => ({
    profile: { fullName: 'Ada Student', matric: 'AG/2026/001', avatarUrl: null },
  }),
}));

vi.mock('@/hooks/useNotifications', () => ({
  useNotifications: () => ({ unreadCount: 3 }),
}));

vi.mock('@/hooks/useAnalytics', () => ({
  useAnalytics: () => ({ insightsStale: false }),
}));

vi.mock('@/lib/firebase/firestore', () => ({
  getDocument: mocks.getDocument,
}));

vi.mock('@/lib/firebase/fcm', () => ({
  onForegroundMessage: () => () => undefined,
  removeNotificationToken: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/firebase/auth', () => ({
  signOut: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/components/layout/NotificationDropdown', () => ({
  NotificationDropdown: () => <button type="button">Notifications menu</button>,
}));

vi.mock('@/components/layout/MobileDrawer', () => ({
  MobileDrawer: () => null,
}));

vi.mock('@/components/onboarding/StudentTour', () => ({
  StudentTour: () => null,
}));

import { StudentShell } from '@/components/layout/StudentShell';

function renderShell() {
  return render(
    <ThemeProvider attribute="class" defaultTheme="system">
      <StudentShell><p>Student content</p></StudentShell>
    </ThemeProvider>
  );
}

describe('student shell navigation', () => {
  beforeEach(() => {
    mocks.pathname = '/dashboard';
    mocks.getDocument.mockResolvedValue(null);
  });

  it('provides a compact desktop rail and a separate route context bar', async () => {
    renderShell();

    expect(screen.getByRole('complementary', { name: 'Student navigation' }))
      .toHaveClass('w-[var(--student-rail-width)]');
    expect(screen.getByRole('banner', { name: 'Student page context' }))
      .toHaveTextContent('Dashboard');
    expect(screen.getByText('Student content')).toBeInTheDocument();
    await waitFor(() => expect(mocks.getDocument).toHaveBeenCalledWith('config/settings'));
  });

  it('marks the owning destination current in both desktop and bottom navigation', () => {
    mocks.pathname = '/results/semester-1';
    renderShell();

    const resultsLinks = screen.getAllByRole('link', { name: 'Results' });
    expect(resultsLinks).toHaveLength(2);
    expect(resultsLinks.every((link) => link.getAttribute('aria-current') === 'page')).toBe(true);
    expect(screen.getByRole('banner', { name: 'Student page context' }))
      .toHaveTextContent('Semester result');
  });
});
