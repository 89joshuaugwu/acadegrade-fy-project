import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  notifications: [] as Array<Record<string, unknown>>,
  unreadCount: 0,
  updateDocument: vi.fn(),
  setRTDB: vi.fn(),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { uid: 'student-1' } }),
}));

vi.mock('@/hooks/useNotifications', () => ({
  useNotifications: () => ({
    notifications: mocks.notifications,
    unreadCount: mocks.unreadCount,
    loading: false,
  }),
}));

vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: () => true,
}));

vi.mock('@/lib/firebase/firestore', () => ({
  updateDocument: mocks.updateDocument,
}));

vi.mock('@/lib/firebase/rtdb', () => ({ setRTDB: mocks.setRTDB }));

import { NotificationDropdown } from '@/components/layout/NotificationDropdown';

describe('NotificationDropdown', () => {
  beforeEach(() => {
    mocks.notifications = [{
      id: 'notification-1',
      type: 'info',
      title: 'Semester saved',
      message: 'Your 300L result has been saved.',
      read: false,
      createdAt: { toDate: () => new Date(Date.now() - 60_000) },
    }];
    mocks.unreadCount = 1;
    mocks.updateDocument.mockReset().mockResolvedValue(undefined);
    mocks.setRTDB.mockReset().mockResolvedValue(undefined);
  });

  it('keeps its mobile panel viewport-bound and immediately changes the status icon after marking read', async () => {
    const user = userEvent.setup();
    render(<NotificationDropdown />);

    await user.click(screen.getByRole('button', { name: 'Notifications' }));

    const panel = screen.getByRole('dialog', { name: 'Notifications' });
    expect(panel).toHaveClass('fixed', 'inset-x-3', 'w-auto');

    await user.click(screen.getByRole('button', { name: 'Mark “Semester saved” as read' }));

    await waitFor(() => {
      expect(mocks.updateDocument).toHaveBeenCalledWith(
        'notifications/student-1/items/notification-1',
        { read: true },
      );
    });
    expect(mocks.setRTDB).toHaveBeenCalledWith('notif_counts/student-1/unread', 0);
    expect(screen.getByLabelText('Read: Semester saved')).toHaveAttribute('data-state', 'read');
  });
});
