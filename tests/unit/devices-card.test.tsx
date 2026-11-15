import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ signOut: vi.fn(async () => undefined), toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/firebase/client', () => ({ auth: { signOut: mocks.signOut } }));
vi.mock('react-hot-toast', () => ({ default: mocks.toast }));
vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => true }));

import { DevicesCard } from '@/components/privacy/DevicesCard';

vi.setConfig({ testTimeout: 15000 });

const profile = {
  fcmDevices: {
    '0123456789abcdef': { platform: 'android', label: 'Pixel 7', addedAt: 1700000000000, lastSeenAt: 1700000500000 },
    fedcba9876543210: { platform: 'web', label: 'Chrome on Windows', addedAt: 1690000000000, lastSeenAt: 1690000500000 },
    'not-a-device': { label: 'Bad' },
  },
};

describe('DevicesCard', () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    mocks.signOut.mockClear();
    fetchMock.mockReset().mockResolvedValue(new Response('{"ok":true}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('lists devices newest first, ignores malformed ids and has an empty state', () => {
    const view = render(<DevicesCard profile={profile} getToken={async () => 'tok'} />);
    const items = screen.getAllByRole('listitem').map((item) => item.textContent);
    expect(items).toHaveLength(2);
    expect(items[0]).toContain('Pixel 7');
    expect(screen.queryByText('Bad')).not.toBeInTheDocument();
    view.rerender(<DevicesCard profile={{}} getToken={async () => 'tok'} />);
    expect(screen.getByText(/No devices are listed yet/)).toBeInTheDocument();
  });

  it('removes one device through the route and hides it', async () => {
    render(<DevicesCard profile={profile} getToken={async () => 'tok'} />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Remove Pixel 7' }));
    await waitFor(() => expect(screen.queryByText('Pixel 7')).not.toBeInTheDocument());
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/user/devices');
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ action: 'remove', deviceId: '0123456789abcdef' });
  });

  it('says other devices sign out within an hour and signs out after confirming', async () => {
    const assign = vi.fn();
    vi.stubGlobal('location', { ...window.location, assign });
    const user = userEvent.setup();
    render(<DevicesCard profile={profile} getToken={async () => 'tok'} />);
    expect(screen.getByText(/within an hour/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Sign out everywhere' }));
    const dialog = await screen.findByRole('dialog', { name: 'Sign out everywhere?' });
    expect(dialog).toHaveTextContent('within an hour');
    await user.click(screen.getAllByRole('button', { name: 'Sign out everywhere' }).at(-1)!);
    await waitFor(() => expect(mocks.signOut).toHaveBeenCalled());
    expect(JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)).toEqual({ action: 'sign-out-all' });
    expect(assign).toHaveBeenCalledWith('/login');
  });

  it('keeps the user signed in and shows an error when the request fails', async () => {
    fetchMock.mockResolvedValue(new Response('{}', { status: 500 }));
    const user = userEvent.setup();
    render(<DevicesCard profile={profile} getToken={async () => 'tok'} />);
    await user.click(screen.getByRole('button', { name: 'Sign out everywhere' }));
    await user.click((await screen.findAllByRole('button', { name: 'Sign out everywhere' })).at(-1)!);
    await waitFor(() => expect(mocks.toast.error).toHaveBeenCalled());
    expect(mocks.signOut).not.toHaveBeenCalled();
  });
});
