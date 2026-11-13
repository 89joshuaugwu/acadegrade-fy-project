import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultAdsConfig } from '@/lib/ads/config';
import { createDefaultMobileAdsConfig } from '@/lib/ads/mobile';
import { createDefaultProviderConfig } from '@/lib/ads/providers';
import { defaultHouseConfig } from '@/lib/ads/house';

vi.mock('@/hooks/useAuth', () => {
  const user = { getIdToken: async () => 'test-token' };
  return { useAuth: () => ({ user }) };
});
vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => true }));

import AdminAdsPage from '@/app/(admin)/admin/ads/page';

function mockApi({ houseError = false, warnings = [] as string[], coins = true as boolean | undefined } = {}) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, options) => {
    const path = String(url);
    const write = options?.method === 'PUT';
    const config = write ? JSON.parse(String(options.body)).config
      : path.endsWith('/house') ? { ...defaultHouseConfig(), enabled: true }
      : path.endsWith('/providers') ? createDefaultProviderConfig()
      : path.endsWith('/mobile') || path.endsWith('/ios') ? createDefaultMobileAdsConfig()
      : createDefaultAdsConfig();
    const failed = houseError && path === '/api/admin/ads';
    return {
      ok: !failed,
      json: async () => path === '/api/admin/settings'
        ? { settings: { advertBanners: [{ id: 'existing', imageUrl: 'https://example.com/banner.png', linkUrl: '', isActive: true }] } }
        : path === '/api/admin/usage' ? (coins === undefined ? {} : { policy: { coins: { enabled: coins } } })
        : failed ? { error: 'House configuration unavailable' }
        : { config, legacyBannerCount: 1, warnings },
    } as Response;
  });
}

const puts = (fetchMock: ReturnType<typeof mockApi>) => fetchMock.mock.calls.filter(([, options]) => options?.method === 'PUT').map(([url]) => url);

// Tab choices are written to the address, so every test starts from a clean one.
beforeEach(() => { window.history.replaceState(null, '', '/admin/ads'); });

// Full-page renders with many fetches run slowly under a parallel suite.
describe('Advertising page arrangement', { timeout: 15_000 }, () => {
  it('has four tabs by job, opens on Status and gives each tab its own help', async () => {
    mockApi();
    const user = userEvent.setup();
    render(<AdminAdsPage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Advertising' })).toBeInTheDocument();
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['Status', 'House promotions', 'Web ad networks', 'Android AdMob']);
    expect(screen.getByRole('tab', { name: 'Status' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('button', { name: 'Help: Advertising: Status' })).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'Android AdMob' }));
    expect(screen.getByRole('button', { name: 'Help: Advertising: Android AdMob' })).toBeInTheDocument();
    expect(window.location.search).toBe('?tab=admob');
    expect(screen.queryByRole('tab', { name: 'iOS' })).not.toBeInTheDocument();
  });

  it('shows every slot, the network and AdMob state, readiness and one recheck on Status without saving', async () => {
    const fetchMock = mockApi({ coins: true });
    render(<AdminAdsPage />);
    const dashboard = await screen.findByRole('region', { name: 'Dashboard overview' });
    // House delivery is off by default, so the active legacy banner fills the slot.
    expect(within(dashboard).getByText('Legacy fallback')).toBeInTheDocument();
    expect(within(dashboard).getByText(/master switch is off/i)).toBeInTheDocument();
    expect(within(dashboard).getByText('Google AdSense')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Results overview' })).getByText('Nothing to serve')).toBeInTheDocument();
    const android = await screen.findByRole('region', { name: 'Android Dashboard overview' });
    expect(within(android).getByText('Legacy fallback')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Android Results overview' })).getByText(/placement switch is off/i)).toBeInTheDocument();
    const summary = await screen.findByRole('list', { name: 'Other ad sources' });
    expect(summary).toHaveTextContent('Web ad networks: Off');
    expect(summary).toHaveTextContent('AdMob banners: Off');
    const readiness = await screen.findByRole('region', { name: 'Rewarded readiness' });
    await waitFor(() => expect(readiness).toHaveTextContent('Earning is off because Android app ads are not allowed.'));
    expect(within(readiness).getAllByRole('listitem')[3]).toHaveTextContent(/Coins on.*Yes/);
    expect(screen.getAllByRole('button', { name: 'Recheck now' })).toHaveLength(1);
    expect(puts(fetchMock)).toEqual([]);
  });

  it('deep-links to a tab from the address', async () => {
    window.history.replaceState(null, '', '/admin/ads?tab=networks');
    mockApi();
    render(<AdminAdsPage />);
    expect(screen.getByRole('tab', { name: 'Web ad networks' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('button', { name: 'Help: Advertising: Web ad networks' })).toBeInTheDocument();
  });

  it('keeps provider, Android and iOS drafts across tabs while saving only the chosen editor', async () => {
    const fetchMock = mockApi();
    const user = userEvent.setup();
    render(<AdminAdsPage />);
    await user.click(screen.getByRole('tab', { name: 'Web ad networks' }));
    await user.click(await screen.findByRole('textbox', { name: 'Publisher ID' }));
    await user.paste('ca-pub-1111111111111111');
    await user.click(screen.getByRole('tab', { name: 'Android AdMob' }));
    const androidAdmob = await screen.findByRole('region', { name: 'Android AdMob' });
    await user.click(within(androidAdmob).getByRole('textbox', { name: 'Results banner ad unit ID' }));
    await user.paste('ca-app-pub-1111111111111111/2222222222');
    const ios = screen.getByText('iOS (not live; configuration only)');
    expect(ios.closest('details')).not.toHaveAttribute('open');
    await user.click(ios);
    const iosAdmob = await screen.findByRole('region', { name: 'iOS AdMob' });
    await user.click(within(iosAdmob).getByRole('textbox', { name: 'Results banner ad unit ID' }));
    await user.paste('ca-app-pub-2222222222222222/3333333333');
    await user.click(screen.getByRole('tab', { name: 'Web ad networks' }));
    expect(screen.getByRole('textbox', { name: 'Publisher ID' })).toHaveValue('ca-pub-1111111111111111');
    await user.click(screen.getByRole('button', { name: 'Save web ad networks' }));
    await waitFor(() => expect(puts(fetchMock)).toEqual(['/api/admin/ads/providers']));
    await user.click(screen.getByRole('tab', { name: 'Android AdMob' }));
    expect(within(androidAdmob).getByRole('textbox', { name: 'Results banner ad unit ID' })).toHaveValue('ca-app-pub-1111111111111111/2222222222');
    expect(within(iosAdmob).getByRole('textbox', { name: 'Results banner ad unit ID' })).toHaveValue('ca-app-pub-2222222222222222/3333333333');
  });

  it('announces loading within the selected tab', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => new Promise<Response>(() => {}));
    const user = userEvent.setup();
    render(<AdminAdsPage />);
    expect(screen.getAllByRole('status', { name: 'Checking saved settings' }).length).toBeGreaterThan(0);
    await user.click(screen.getByRole('tab', { name: 'House promotions' }));
    expect(screen.getByRole('status', { name: 'Loading house promotions' })).toHaveAttribute('aria-busy', 'true');
    await user.click(screen.getByRole('tab', { name: 'Android AdMob' }));
    expect(screen.getByRole('status', { name: 'Loading Android ad settings' })).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByRole('status', { name: 'Loading house promotions' })).not.toBeInTheDocument();
  });

  it('keeps campaign drafts across tabs and tucks legacy banners under Advanced', async () => {
    const fetchMock = mockApi();
    const user = userEvent.setup();
    render(<AdminAdsPage />);
    await user.click(screen.getByRole('tab', { name: 'House promotions' }));
    await user.click(await screen.findByRole('button', { name: 'Add campaign' }));
    await user.clear(screen.getByRole('textbox', { name: 'Campaign name' }));
    await user.click(screen.getByRole('textbox', { name: 'Campaign name' }));
    await user.paste('Workshop');
    await user.click(screen.getByRole('tab', { name: 'Android AdMob' }));
    expect(await screen.findByRole('button', { name: 'Save Android ad settings' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save house promotions' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'House promotions' }));
    expect(screen.getByRole('textbox', { name: 'Campaign name' })).toHaveValue('Workshop');
    const advanced = screen.getByText('Advanced').closest('details')!;
    expect(advanced).not.toHaveAttribute('open');
    await user.click(screen.getByText('Advanced'));
    expect(advanced).toHaveAttribute('open');
    expect(within(advanced).getByRole('heading', { name: 'Legacy banners (fallback)' })).toBeInTheDocument();
    expect(within(advanced).getByRole('textbox', { name: 'Image URL for advert 1' })).toHaveValue('https://example.com/banner.png');
    expect(within(advanced).getByRole('switch', { name: 'Allow house delivery mode' })).toBeChecked();
    expect(puts(fetchMock)).toEqual([]);
  });

  it('saves website and Android house settings with one save, only the changed sides', async () => {
    const fetchMock = mockApi();
    const user = userEvent.setup();
    render(<AdminAdsPage />);
    await user.click(screen.getByRole('tab', { name: 'House promotions' }));
    await user.click(await screen.findByRole('switch', { name: 'Show house promotions on the website' }));
    await user.click(await screen.findByRole('switch', { name: 'Android Results slot' }));
    await user.click(screen.getByRole('button', { name: 'Save house promotions' }));
    await waitFor(() => expect(puts(fetchMock)).toEqual(['/api/admin/ads', '/api/admin/ads/house']));
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/ads/house', expect.objectContaining({ headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' } }));
    await user.click(screen.getByRole('switch', { name: 'Show house promotions in the Android app' }));
    await user.click(screen.getByRole('button', { name: 'Save house promotions' }));
    await waitFor(() => expect(puts(fetchMock)).toEqual(['/api/admin/ads', '/api/admin/ads/house', '/api/admin/ads/house']));
  });

  it('shows stored campaigns that cannot be served instead of hiding them silently', async () => {
    mockApi({ warnings: ['Campaign 2 (Old offer) is not served: Campaign 2 linkUrl must not include a username or password.'] });
    const user = userEvent.setup();
    render(<AdminAdsPage />);
    await user.click(screen.getByRole('tab', { name: 'House promotions' }));
    expect(await screen.findByText(/Old offer.*not served/)).toBeInTheDocument();
  });

  it('lets Android settings load and save even when website campaigns cannot load', async () => {
    const fetchMock = mockApi({ houseError: true });
    const user = userEvent.setup();
    render(<AdminAdsPage />);
    await user.click(screen.getByRole('tab', { name: 'House promotions' }));
    expect(await screen.findByText('House configuration unavailable')).toBeInTheDocument();
    await user.click(await screen.findByRole('switch', { name: 'Show house promotions in the Android app' }));
    await user.click(screen.getByRole('button', { name: 'Save house promotions' }));
    await waitFor(() => expect(puts(fetchMock)).toEqual(['/api/admin/ads/house']));
    await user.click(screen.getByRole('tab', { name: 'Android AdMob' }));
    const androidAdmob = await screen.findByRole('region', { name: 'Android AdMob' });
    await user.click(within(androidAdmob).getByRole('textbox', { name: 'Results banner ad unit ID' }));
    await user.paste('ca-app-pub-1111111111111111/2222222222');
    await user.click(screen.getByRole('button', { name: 'Save Android ad settings' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/admin/ads/mobile', expect.objectContaining({
      method: 'PUT', headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
      body: expect.stringContaining('ca-app-pub-1111111111111111/2222222222'),
    })));
  });
});
