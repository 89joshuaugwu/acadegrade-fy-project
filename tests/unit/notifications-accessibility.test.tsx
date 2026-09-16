import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  queryCollection: vi.fn(),
  updateDocument: vi.fn(),
  deleteDocument: vi.fn(),
  setRTDB: vi.fn(),
  toastError: vi.fn(),
  shouldReduceMotion: false,
  user: { uid: 'student-1' },
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: mocks.user }),
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

vi.mock('react-hot-toast', () => ({
  default: { error: mocks.toastError },
}));

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
    mocks.toastError.mockReset();
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
    await waitFor(() => {
      expect(mocks.setRTDB).toHaveBeenCalledWith('notif_counts/student-1/unread', 0);
      expect(screen.queryByRole('button', { name: 'Mark “Semester updated” as read' })).not.toBeInTheDocument();
      expect(screen.getByLabelText('Read: Semester updated')).toHaveAttribute('data-state', 'read');
    });
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

  it('shows a retryable load failure instead of the empty inbox state', async () => {
    const user = userEvent.setup();
    mocks.queryCollection.mockRejectedValue(new Error('offline'));

    render(<NotificationsPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Notifications are unavailable');
    expect(screen.queryByText('All caught up!')).not.toBeInTheDocument();

    const callsBeforeRetry = mocks.queryCollection.mock.calls.length;
    mocks.queryCollection.mockResolvedValue([]);
    await user.click(screen.getByRole('button', { name: /try again/i }));

    expect(await screen.findByText('All caught up!')).toBeInTheDocument();
    expect(mocks.queryCollection.mock.calls.length).toBeGreaterThan(callsBeforeRetry);
  });

  it('keeps an unread notification visible and reports a mark-read failure', async () => {
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
    mocks.updateDocument.mockRejectedValueOnce(new Error('offline'));

    render(<NotificationsPage />);
    await user.click(await screen.findByRole('button', { name: /Mark .*Semester updated.* as read/ }));

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith('Could not mark the notification as read. Try again.');
    });
    expect(screen.getByRole('button', { name: /Mark .*Semester updated.* as read/ })).toBeInTheDocument();
  });

  it('keeps notifications visible and reports a clear-all failure', async () => {
    const user = userEvent.setup();
    mocks.queryCollection.mockResolvedValue([
      {
        id: 'notification-1',
        type: 'info',
        title: 'Semester updated',
        message: 'Your semester calculation is ready.',
        read: true,
        createdAt: timestamp,
      },
    ]);
    mocks.deleteDocument.mockRejectedValueOnce(new Error('offline'));

    render(<NotificationsPage />);
    await user.click(await screen.findByRole('button', { name: /clear all/i }));

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith('Could not clear notifications. Try again.');
    });
    expect(screen.getByRole('article', { name: 'Semester updated' })).toBeInTheDocument();
  });
});
