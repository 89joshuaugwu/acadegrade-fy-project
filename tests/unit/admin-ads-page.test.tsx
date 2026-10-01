import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { createDefaultAdsConfig } from '@/lib/ads/config';
import { createDefaultMobileAdsConfig } from '@/lib/ads/mobile';
import { createDefaultProviderConfig } from '@/lib/ads/providers';

vi.mock('@/hooks/useAuth', () => {
  const user = { getIdToken: async () => 'test-token' };
  return { useAuth: () => ({ user }) };
});

import AdminAdsPage from '@/app/(admin)/admin/ads/page';

function mockApi(houseError = false) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, options) => {
    const path = String(url);
    const write = options?.method === 'PUT';
    const config = write ? JSON.parse(String(options.body)).config
      : path.endsWith('/providers') ? createDefaultProviderConfig()
      : path.endsWith('/mobile') || path.endsWith('/ios') ? createDefaultMobileAdsConfig()
      : createDefaultAdsConfig();
    return {
      ok: !(houseError && path === '/api/admin/ads'),
      json: async () => path === '/api/admin/settings'
        ? { settings: { advertBanners: [{ id: 'existing', imageUrl: 'https://example.com/banner.png', linkUrl: '', isActive: true }] } }
        : houseError && path === '/api/admin/ads' ? { error: 'House configuration unavailable' }
        : { config, legacyBannerCount: 1 },
    } as Response;
  });
}

describe('Advertising page arrangement', () => {
  it('announces loading within the selected platform', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => new Promise<Response>(() => {}));
    const user = userEvent.setup();
    render(<AdminAdsPage />);
    expect(screen.getByRole('status', { name: 'Loading house campaigns' })).toHaveAttribute('aria-busy', 'true');
    await user.click(screen.getByRole('tab', { name: 'Android' }));
    expect(screen.getByRole('status', { name: 'Loading Android ad settings' })).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByRole('status', { name: 'Loading house campaigns' })).not.toBeInTheDocument();
  });

  it('keeps campaign drafts while switching platforms and leaves legacy banners separate', async () => {
    const fetchMock = mockApi();
    const user = userEvent.setup();
    render(<AdminAdsPage />);
    await user.click(await screen.findByRole('button', { name: 'Add campaign' }));
    await user.clear(screen.getByRole('textbox', { name: 'Campaign name' }));
    await user.type(screen.getByRole('textbox', { name: 'Campaign name' }), 'Workshop');
    await user.click(screen.getByRole('tab', { name: 'Android' }));
    expect(screen.getByRole('button', { name: 'Save Android ad settings' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save house campaigns' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'Web' }));
    expect(screen.getByRole('textbox', { name: 'Campaign name' })).toHaveValue('Workshop');
    expect(screen.getByText('Legacy house banners — existing promotions').closest('details')).not.toHaveAttribute('open');
    await user.click(screen.getByText('Legacy house banners — existing promotions'));
    expect(screen.getByText('Legacy house banners — existing promotions').closest('details')).toHaveAttribute('open');
    expect(screen.getByRole('textbox', { name: 'Image URL for advert 1' })).toHaveValue('https://example.com/banner.png');
    expect(fetchMock.mock.calls.every(([, options]) => !options?.method)).toBe(true);
  });

  it('lets Android settings load and save even when house campaigns cannot load', async () => {
    const fetchMock = mockApi(true);
    const user = userEvent.setup();
    render(<AdminAdsPage />);
    expect(await screen.findByText('House configuration unavailable')).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'Android' }));
    await user.type(await screen.findByRole('textbox', { name: 'Results banner ad unit ID' }), 'ca-app-pub-1111111111111111/2222222222');
    await user.click(screen.getByRole('button', { name: 'Save Android ad settings' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/admin/ads/mobile', expect.objectContaining({
      method: 'PUT', headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
      body: expect.stringContaining('ca-app-pub-1111111111111111/2222222222'),
    })));
    expect(fetchMock.mock.calls.filter(([, options]) => options?.method === 'PUT')).toHaveLength(1);
    await user.click(screen.getByRole('tab', { name: 'iOS' }));
    expect(await screen.findByRole('button', { name: 'Save iOS ad settings' })).toBeInTheDocument();
    expect(screen.getByText(/Configuration only — integration pending/)).toBeInTheDocument();
  });
});
