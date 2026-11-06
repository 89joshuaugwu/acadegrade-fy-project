import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { MobileHouseAdsEditor } from '@/components/admin/ads/MobileHouseAdsEditor';
import { defaultHouseConfig } from '@/lib/ads/house';
import { createDefaultAdsConfig } from '@/lib/ads/config';
import { createDefaultMobileAdsConfig } from '@/lib/ads/mobile';
import { createDefaultProviderConfig } from '@/lib/ads/providers';
vi.mock('@/hooks/useAuth', () => {
  const user = { getIdToken: async () => 'admin-token' };
  return { useAuth: () => ({ user }) };
});
import AdminAdsPage from '@/app/(admin)/admin/ads/page';

it('opts in independently with clear dirty and saved feedback', async () => {
  const save = vi.fn().mockResolvedValue(undefined);
  render(<MobileHouseAdsEditor initialConfig={defaultHouseConfig()} onSave={save} />);
  const button = screen.getByRole('button', { name: 'Save Android house promotions' });
  expect(button).toBeDisabled();
  fireEvent.click(screen.getByRole('switch', { name: 'Share website house campaigns on Android' }));
  fireEvent.click(screen.getByRole('switch', { name: 'Include legacy banner fallback' }));
  expect(screen.getByRole('status')).toHaveTextContent('Unsaved');
  fireEvent.click(button);
  await waitFor(() => expect(save).toHaveBeenCalledWith({ version: 1, enabled: true, includeLegacy: false, placements: { dashboard: true, results: false } }));
  await waitFor(() => expect(button).toBeDisabled());
  expect(screen.getByRole('status')).toHaveTextContent('Saved');
});
it('retains edits made while saving and surfaces a failed independent save', async () => {
  let resolve!: () => void;
  const save = vi.fn().mockImplementationOnce(() => new Promise<void>(r => { resolve = r; })).mockRejectedValueOnce(new Error('Save failed'));
  render(<MobileHouseAdsEditor initialConfig={defaultHouseConfig()} onSave={save} />);
  fireEvent.click(screen.getByRole('switch', { name: 'Share website house campaigns on Android' }));
  fireEvent.click(screen.getByRole('button', { name: 'Save Android house promotions' }));
  fireEvent.click(screen.getByRole('switch', { name: 'House promotions on Results overview' }));
  resolve();
  await waitFor(() => expect(screen.getByRole('button', { name: 'Save Android house promotions' })).toBeEnabled());
  expect(screen.getByRole('status')).toHaveTextContent('Unsaved');
  fireEvent.click(screen.getByRole('button', { name: 'Save Android house promotions' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Save failed');
  expect(screen.getByRole('status')).toHaveTextContent('Unsaved');
});

it('keeps house drafts across tabs and saves only the independent house endpoint', async () => {
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, options) => {
    const path = String(url);
    const config = options?.method === 'PUT' ? JSON.parse(String(options.body)).config
      : path.endsWith('/house') ? defaultHouseConfig()
      : path.endsWith('/mobile') || path.endsWith('/ios') ? createDefaultMobileAdsConfig()
      : path.endsWith('/providers') ? createDefaultProviderConfig() : createDefaultAdsConfig();
    return { ok: true, json: async () => ({ config, settings: { advertBanners: [] }, legacyBannerCount: 0 }) } as Response;
  });
  render(<AdminAdsPage />);
  fireEvent.click(screen.getByRole('tab', { name: 'Android' }));
  fireEvent.click(await screen.findByRole('switch', { name: 'Share website house campaigns on Android' }));
  fireEvent.click(screen.getByRole('tab', { name: 'Web' }));
  fireEvent.click(screen.getByRole('tab', { name: 'Android' }));
  expect(screen.getByRole('switch', { name: 'Share website house campaigns on Android' })).toHaveAttribute('aria-checked', 'true');
  fireEvent.click(screen.getByRole('button', { name: 'Save Android house promotions' }));
  await waitFor(() => expect(fetchMock.mock.calls.filter(([, options]) => options?.method === 'PUT').map(([url]) => url)).toEqual(['/api/admin/ads/house']));
  expect(fetchMock).toHaveBeenCalledWith('/api/admin/ads/house', expect.objectContaining({ headers: { Authorization: 'Bearer admin-token', 'Content-Type': 'application/json' } }));
});
