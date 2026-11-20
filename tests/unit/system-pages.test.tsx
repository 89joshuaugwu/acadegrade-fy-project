import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const nav = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: nav.replace }) }));
// The real settings reader, with maintenance still on.
const settings = vi.hoisted(() => ({ maintenanceMode: true as boolean, fail: false }));
vi.mock('@/lib/firebase/client', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  doc: (...path: unknown[]) => ({ path }),
  getDocFromServer: async () => {
    if (settings.fail) throw new Error('unavailable');
    return { exists: () => true, data: () => ({ maintenanceMode: settings.maintenanceMode }) };
  },
}));
vi.mock('@/lib/site/contact', () => ({
  getContactEmail: vi.fn(async () => null),
  contactHref: (email: string | null, subject?: string) => (email ? `mailto:${email}?subject=${encodeURIComponent(subject ?? '')}` : '/support'),
}));

import MaintenancePage, { metadata as maintenanceMetadata } from '@/app/maintenance/page';
import OfflinePage, { metadata as offlineMetadata } from '@/app/offline/page';
import { MaintenanceWatch, RECHECK_MS } from '@/components/site/system/MaintenanceWatch';
import { OfflineWatch, tryAgain } from '@/components/site/system/OfflineWatch';
import { returnPlaceLabel } from '@/components/site/system/maintenance-return';
import { getContactEmail } from '@/lib/site/contact';

/** Lets pending promises (the settings read) settle under fake timers. */
async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

function setVisibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });
}

beforeEach(() => {
  settings.maintenanceMode = true;
  settings.fail = false;
  nav.replace.mockReset();
  setVisibility('visible');
});

afterEach(() => {
  vi.useRealTimers();
});

describe('maintenance return words', () => {
  it('names where the visitor will land', () => {
    expect(returnPlaceLabel('/')).toBe('the home page');
    expect(returnPlaceLabel('/dashboard')).toBe('your dashboard');
    expect(returnPlaceLabel('/login')).toBe('sign in');
    expect(returnPlaceLabel('/register?step=2')).toBe('registration');
    expect(returnPlaceLabel('/results/abc?importCode=XYZ')).toBe('where you were');
  });
});

describe('maintenance page', () => {
  it('is calm, noindex and returns to a safe next path', async () => {
    render(await MaintenancePage({ searchParams: Promise.resolve({ next: '/dashboard' }) }));
    expect(screen.getByRole('heading', { level: 1, name: 'AcadeGrade is being updated' })).toBeInTheDocument();
    expect(screen.getByText(/Your saved records are not affected/)).toBeInTheDocument();
    expect(await screen.findByText(/takes you back to your dashboard when we're done\. Last checked/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Support' })).toHaveAttribute('href', '/support');
    expect(screen.getByRole('link', { name: 'Go to the home page' })).toHaveAttribute('href', '/');
    expect(maintenanceMetadata.robots).toMatchObject({ index: false, follow: false });
    expect(maintenanceMetadata.title).toBe('Back soon');
  });

  it('falls back to / for unsafe next values and names the support email when set', async () => {
    vi.mocked(getContactEmail).mockResolvedValueOnce('help@acadegrade.test');
    render(await MaintenancePage({ searchParams: Promise.resolve({ next: '//evil.example' }) }));
    expect(await screen.findByText(/takes you back to the home page/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Write to help@acadegrade.test' })).toHaveAttribute('href', expect.stringContaining('mailto:help@acadegrade.test'));
  });

  it('still renders when the contact lookup fails', async () => {
    vi.mocked(getContactEmail).mockRejectedValueOnce(new Error('firestore down'));
    render(await MaintenancePage({ searchParams: Promise.resolve({ next: '/maintenance' }) }));
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(await screen.findByText(/takes you back to the home page/)).toBeInTheDocument();
  });
});

describe('MaintenanceWatch', () => {
  it('reads config/settings and sends the visitor on when maintenance is off', async () => {
    settings.maintenanceMode = false;
    render(<MaintenanceWatch next="/login" place="sign in" />);
    expect(await screen.findByText("We're back. Taking you there…")).toBeInTheDocument();
    await vi.waitFor(() => expect(nav.replace).toHaveBeenCalledWith('/login'), { timeout: 2000 });
  });

  it('checks on mount, then every minute, and returns the visitor when maintenance ends', async () => {
    vi.useFakeTimers();
    const read = vi.fn<() => Promise<boolean>>().mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    render(<MaintenanceWatch next="/results?importCode=ABC123" place="where you were" read={read} />);
    await flush();
    expect(read).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('maintenance-line')).toHaveTextContent(/Last checked \d{2}:\d{2}\./);

    await act(async () => {
      vi.advanceTimersByTime(RECHECK_MS);
    });
    await flush();
    expect(read).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('status')).toHaveTextContent("We're back. Taking you there…");
    expect(nav.replace).not.toHaveBeenCalled();
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    expect(nav.replace).toHaveBeenCalledWith('/results?importCode=ABC123');
  });

  it('never redirects on a failed read and says it will try again', async () => {
    vi.useFakeTimers();
    const read = vi.fn<() => Promise<boolean>>().mockRejectedValue(new Error('offline'));
    render(<MaintenanceWatch next="/" place="the home page" read={read} />);
    await flush();
    expect(screen.getByTestId('maintenance-line')).toHaveTextContent("Couldn't check just now. We'll try again in a minute.");
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });
    expect(nav.replace).not.toHaveBeenCalled();
  });

  it('does not read while the tab is hidden, and checks as soon as it is visible again', async () => {
    vi.useFakeTimers();
    setVisibility('hidden');
    const read = vi.fn<() => Promise<boolean>>().mockResolvedValue(true);
    render(<MaintenanceWatch next="/" place="the home page" read={read} />);
    await act(async () => {
      vi.advanceTimersByTime(RECHECK_MS * 3);
    });
    expect(read).not.toHaveBeenCalled();

    setVisibility('visible');
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await flush();
    expect(read).toHaveBeenCalledTimes(1);
  });

  it('checks when the browser comes back online and on Check now', async () => {
    const read = vi.fn<() => Promise<boolean>>().mockResolvedValue(true);
    render(<MaintenanceWatch next="/" place="the home page" read={read} />);
    await flush();
    await act(async () => {
      window.dispatchEvent(new Event('online'));
    });
    await flush();
    expect(read).toHaveBeenCalledTimes(2);
    await act(async () => {
      screen.getByRole('button', { name: 'Check now' }).click();
    });
    await flush();
    expect(read).toHaveBeenCalledTimes(3);
  });
});

describe('offline page', () => {
  it('says only what is true and is noindex', () => {
    const { container } = render(<OfflinePage />);
    expect(screen.getByRole('heading', { level: 1, name: "You're offline" })).toBeInTheDocument();
    expect(container.textContent).toContain("Your record is safe: it's saved on your account, not on this phone.");
    expect(container.textContent).not.toMatch(/still available on your device|Return to Dashboard/i);
    expect(screen.getByRole('link', { name: 'Get the Android app' })).toHaveAttribute('href', '/app');
    expect(offlineMetadata.robots).toMatchObject({ index: false, follow: false });
  });

  it('notices when the connection comes back without reloading', async () => {
    const online = vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(false);
    render(<OfflineWatch />);
    expect(screen.getByText("We'll notice when your connection is back.")).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('');

    online.mockReturnValue(true);
    await act(async () => {
      window.dispatchEvent(new Event('online'));
    });
    expect(screen.getByRole('status')).toHaveTextContent("You're back online.");
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('Try again reloads the requested page, or goes back from /offline itself', () => {
    const location = { pathname: '/results', reload: vi.fn(), assign: vi.fn() };
    const history = { length: 3, back: vi.fn() };
    tryAgain(location, history);
    expect(location.reload).toHaveBeenCalled();

    location.pathname = '/offline';
    tryAgain(location, history);
    expect(history.back).toHaveBeenCalled();

    tryAgain(location, { length: 1, back: vi.fn() });
    expect(location.assign).toHaveBeenCalledWith('/');
  });
});
