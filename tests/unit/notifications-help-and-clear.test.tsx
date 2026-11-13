import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  queryCollection: vi.fn(),
  updateDocument: vi.fn(),
  deleteDocument: vi.fn(),
  setRTDB: vi.fn(),
  user: { uid: 'student-1' },
}));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => true }));
vi.mock('@/lib/firebase/firestore', () => ({ queryCollection: mocks.queryCollection, updateDocument: mocks.updateDocument, deleteDocument: mocks.deleteDocument }));
vi.mock('@/lib/firebase/rtdb', () => ({ setRTDB: mocks.setRTDB }));
vi.mock('react-hot-toast', () => ({ default: { error: vi.fn(), success: vi.fn() } }));

import NotificationsPage from '@/app/(student)/notifications/page';

const item = { id: 'n1', type: 'info', title: 'Semester updated', message: 'Ready.', read: true, createdAt: { toMillis: () => Date.now() - 60_000 }, actionUrl: '/results' };


// Full-page renders with many async steps; allow for a loaded machine.
vi.setConfig({ testTimeout: 15000 });

describe('notifications page', () => {
  beforeEach(() => {
    mocks.queryCollection.mockReset().mockResolvedValue([item]);
    mocks.deleteDocument.mockReset().mockResolvedValue(undefined);
    mocks.setRTDB.mockReset().mockResolvedValue(undefined);
  });

  it('offers help for the page', async () => {
    const user = userEvent.setup();
    render(<NotificationsPage />);
    await user.click(await screen.findByRole('button', { name: 'Help: Notifications' }));
    expect(await screen.findByRole('dialog', { name: 'Notifications' })).toBeInTheDocument();
  });

  it('asks before deleting every notification', async () => {
    const user = userEvent.setup();
    render(<NotificationsPage />);
    await user.click(await screen.findByRole('button', { name: /clear all/i }));
    const dialog = await screen.findByRole('dialog', { name: /clear all notifications/i });
    expect(mocks.deleteDocument).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole('button', { name: /^clear all$/i }));
    await waitFor(() => expect(mocks.deleteDocument).toHaveBeenCalledWith('notifications/student-1/items/n1'));
  });

  it('links "View details" to the notification target', async () => {
    render(<NotificationsPage />);
    expect(await screen.findByRole('link', { name: /view details/i })).toHaveAttribute('href', '/results');
  });
});
