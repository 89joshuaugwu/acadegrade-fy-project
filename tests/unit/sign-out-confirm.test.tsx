import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'next-themes';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  signOut: vi.fn().mockResolvedValue(undefined),
  removeNotificationToken: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { uid: 'student-1', displayName: 'Ada Student', email: 'ada@example.com' } }),
}));

vi.mock('@/hooks/useProfile', () => ({
  useProfile: () => ({ profile: { fullName: 'Ada Student', matric: 'AG/2026/001', avatarUrl: null } }),
}));

vi.mock('@/hooks/useNotifications', () => ({ useNotifications: () => ({ unreadCount: 0 }) }));
vi.mock('@/hooks/useAnalytics', () => ({ useAnalytics: () => ({ insightsStale: false }) }));
vi.mock('@/hooks/usePlatformSettings', () => ({
  usePlatformSettings: () => ({ settings: {}, loading: false, isFeatureDisabled: () => false }),
}));
vi.mock('@/lib/firebase/firestore', () => ({ getDocument: vi.fn().mockResolvedValue(null) }));
vi.mock('@/lib/firebase/fcm', () => ({
  onForegroundMessage: () => () => undefined,
  removeNotificationToken: mocks.removeNotificationToken,
}));
vi.mock('@/lib/firebase/auth', () => ({ signOut: mocks.signOut }));
vi.mock('@/components/layout/NotificationDropdown', () => ({
  NotificationDropdown: () => <button type="button">Notifications menu</button>,
}));
vi.mock('@/components/onboarding/StudentTour', () => ({ StudentTour: () => null }));

import { StudentShell } from '@/components/layout/StudentShell';
import { MobileDrawer } from '@/components/layout/MobileDrawer';

const BODY = "You'll need to sign in again to see your results on this device.";

function renderShell() {
  return render(
    <ThemeProvider attribute="class" defaultTheme="system">
      <StudentShell><p>Student content</p></StudentShell>
    </ThemeProvider>
  );
}

describe('sign-out confirmation', () => {
  beforeEach(() => {
    mocks.signOut.mockClear();
    mocks.removeNotificationToken.mockClear();
  });

  it('asks before signing out from the desktop rail and focuses Cancel', async () => {
    const user = userEvent.setup();
    renderShell();

    await user.click(screen.getByRole('button', { name: 'Sign out' }));

    const dialog = await screen.findByRole('dialog', { name: 'Sign out?' });
    expect(dialog).toHaveAccessibleDescription(BODY);
    expect(mocks.signOut).not.toHaveBeenCalled();
    await waitFor(() => expect(within(dialog).getByRole('button', { name: 'Cancel' })).toHaveFocus());
  });

  it('cancels with Escape without signing out', async () => {
    const user = userEvent.setup();
    renderShell();

    await user.click(screen.getByRole('button', { name: 'Sign out' }));
    await screen.findByRole('dialog', { name: 'Sign out?' });
    await user.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Sign out?' })).not.toBeInTheDocument());
    expect(mocks.signOut).not.toHaveBeenCalled();
  });

  it('signs out once the student confirms', async () => {
    const user = userEvent.setup();
    renderShell();

    await user.click(screen.getByRole('button', { name: 'Sign out' }));
    const dialog = await screen.findByRole('dialog', { name: 'Sign out?' });
    await user.click(within(dialog).getByRole('button', { name: 'Sign out' }));

    await waitFor(() => expect(mocks.signOut).toHaveBeenCalledTimes(1));
    expect(mocks.removeNotificationToken).toHaveBeenCalledWith('student-1');
  });

  it('closes the mobile drawer and asks before signing out', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <ThemeProvider attribute="class" defaultTheme="system">
        <MobileDrawer isOpen onClose={onClose} profile={null} />
      </ThemeProvider>
    );

    await user.click(screen.getByRole('button', { name: 'Sign out' }));

    expect(onClose).toHaveBeenCalled();
    const dialog = await screen.findByRole('dialog', { name: 'Sign out?' });
    expect(mocks.signOut).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole('button', { name: 'Sign out' }));
    await waitFor(() => expect(mocks.signOut).toHaveBeenCalledTimes(1));
  });
});
