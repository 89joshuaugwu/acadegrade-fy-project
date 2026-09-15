import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  queryCollection: vi.fn(),
  updateDocument: vi.fn(),
  deleteDocument: vi.fn(),
  setRTDB: vi.fn(),
  shouldReduceMotion: false,
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { uid: 'student-1' } }),
}));

vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: () => mocks.shouldReduceMotion,
}));

vi.mock('@/lib/firebase/firestore', () => ({
  queryCollection: mocks.queryCollection,
  updateDocument: mocks.updateDocument,
  deleteDocument: mocks.deleteDocument,
}));

vi.mock('@/lib/firebase/rtdb', () => ({ setRTDB: mocks.setRTDB }));

import NotificationsPage from '@/app/(student)/notifications/page';

const timestamp = {
  toMillis: () => Date.now() - 60_000,
};

describe('notification accessibility', () => {
  beforeEach(() => {
    mocks.queryCollection.mockReset();
    mocks.updateDocument.mockReset().mockResolvedValue(undefined);
    mocks.deleteDocument.mockReset().mockResolvedValue(undefined);
    mocks.setRTDB.mockReset().mockResolvedValue(undefined);
    mocks.shouldReduceMotion = false;
  });

  it('exposes an unread notification as a named keyboard-operable action', async () => {
    const user = userEvent.setup();
    mocks.queryCollection.mockResolvedValue([
      {
        id: 'notification-1',
        type: 'info',
        title: 'Semester updated',
        message: 'Your semester calculation is ready.',
        read: false,
        createdAt: timestamp,
      },
    ]);

    render(<NotificationsPage />);

    const markRead = await screen.findByRole('button', {
      name: 'Mark “Semester updated” as read',
    });
    markRead.focus();
    expect(markRead).toHaveFocus();

    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(mocks.updateDocument).toHaveBeenCalledWith(
        'notifications/student-1/items/notification-1',
        { read: true }
      );
    });
    expect(mocks.setRTDB).toHaveBeenCalledWith('notif_counts/student-1/unread', 0);
  });

  it('does not animate notification entries when reduced motion is requested', async () => {
    mocks.shouldReduceMotion = true;
    mocks.queryCollection.mockResolvedValue([
      {
        id: 'notification-1',
        type: 'success',
        title: 'Record saved',
        message: 'Your latest result was saved.',
        read: false,
        createdAt: timestamp,
      },
    ]);

    render(<NotificationsPage />);

    const row = await screen.findByRole('article', { name: 'Record saved' });
    expect(row).toHaveAttribute('data-reduced-motion', 'true');
  });
});
