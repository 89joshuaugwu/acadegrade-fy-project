import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  queryCollection: vi.fn(),
  updateDocument: vi.fn(),
  deleteDocument: vi.fn(),
  getDocument: vi.fn(),
  setRTDB: vi.fn(),
  user: { uid: 'student-1' },
}));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => true }));
vi.mock('@/lib/firebase/firestore', () => ({ queryCollection: mocks.queryCollection, updateDocument: mocks.updateDocument, deleteDocument: mocks.deleteDocument, getDocument: mocks.getDocument }));
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

describe('notifications page: announcements', () => {
  const now = Date.now();
  const announcement = (id: string, extra: Record<string, unknown> = {}) => ({
    id, title: `Announcement ${id}`, body: `Body ${id}`, status: 'published', linkUrl: null, audience: {},
    startsAt: { toMillis: () => now - 30_000 }, endsAt: null, showAsBanner: false, ...extra,
  });

  beforeEach(() => {
    localStorage.clear();
    mocks.updateDocument.mockReset().mockResolvedValue(undefined);
    mocks.setRTDB.mockReset().mockResolvedValue(undefined);
    mocks.getDocument.mockReset().mockResolvedValue({ university: 'University of Lagos', currentLevel: 300 });
    mocks.queryCollection.mockReset().mockImplementation(async (path: string) => (path === 'announcements'
      ? [
        announcement('all'),
        announcement('ended', { endsAt: { toMillis: () => now - 1000 } }),
        announcement('other-uni', { audience: { universities: ['Covenant University'] } }),
        announcement('my-level', { audience: { universities: ['university of lagos'], levels: [300] }, linkUrl: '/results' }),
      ]
      : [item]));
  });

  it('merges active announcements for this student into the inbox, newest first, and keeps read state on the device', async () => {
    const user = userEvent.setup();
    render(<NotificationsPage />);
    expect(await screen.findByRole('article', { name: 'Announcement all' })).toBeInTheDocument();
    expect(screen.getByRole('article', { name: 'Announcement my-level' })).toBeInTheDocument();
    expect(screen.queryByRole('article', { name: 'Announcement ended' })).not.toBeInTheDocument();
    expect(screen.queryByRole('article', { name: 'Announcement other-uni' })).not.toBeInTheDocument();
    // Announcements are newer than the stored item (1 minute old).
    const titles = screen.getAllByRole('article').map((node) => node.getAttribute('aria-label'));
    expect(titles.indexOf('Semester updated')).toBe(titles.length - 1);
    expect(screen.getByText(/You have 2 unread messages/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Mark “Announcement all” as read' }));
    await waitFor(() => expect(screen.getByText(/You have 1 unread message\b/)).toBeInTheDocument());
    // Read state lives on the device only: no Firestore or RTDB writes for announcements.
    expect(mocks.updateDocument).not.toHaveBeenCalled();
    expect(mocks.setRTDB).not.toHaveBeenCalled();
    expect(JSON.parse(localStorage.getItem('acadegrade:announcements-read:v1:student-1') ?? '[]')).toEqual(['all']);
  });

  it('shows the inbox even when announcements cannot be loaded', async () => {
    mocks.queryCollection.mockImplementation(async (path: string) => {
      if (path === 'announcements') throw new Error('permission-denied');
      return [item];
    });
    render(<NotificationsPage />);
    expect(await screen.findByRole('article', { name: 'Semester updated' })).toBeInTheDocument();
  });
});