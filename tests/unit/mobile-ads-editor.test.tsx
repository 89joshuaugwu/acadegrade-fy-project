import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { MobileAdsEditor } from '@/components/admin/ads/MobileAdsEditor';
import { createDefaultMobileAdsConfig } from '@/lib/ads/mobile';

it('lets an administrator save separate Dashboard and Results banner IDs', async () => {
  const onSave = vi.fn().mockResolvedValue(undefined);
  render(<MobileAdsEditor initialConfig={createDefaultMobileAdsConfig()} onSave={onSave} />);
  const dashboard = 'ca-app-pub-1111111111111111/1111111111';
  const results = 'ca-app-pub-1111111111111111/2222222222';
  fireEvent.change(screen.getByLabelText('Dashboard banner ad unit ID'), { target: { value: dashboard } });
  fireEvent.change(screen.getByLabelText('Results banner ad unit ID'), { target: { value: results } });
  fireEvent.click(screen.getByRole('button', { name: 'Save Android ad settings' }));
  await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
    dashboardBannerUnitId: dashboard, resultsBannerUnitId: results, bannerUnitId: dashboard,
  })));
});

it('provides an explicitly staged iOS editor with its own save action', async () => {
  const onSave = vi.fn().mockResolvedValue(undefined);
  render(<MobileAdsEditor platform="iOS" initialConfig={createDefaultMobileAdsConfig()} onSave={onSave} />);
  expect(screen.getByRole('heading', { name: 'iOS AdMob' })).toBeInTheDocument();
  expect(screen.getByText(/Ad rendering is not connected in the iOS app yet/)).toBeInTheDocument();
  expect(screen.getByRole('switch', { name: 'Enable iOS ads' })).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Results banner ad unit ID'), { target: { value: 'ca-app-pub-1111111111111111/2222222222' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save iOS ad settings' }));
  await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ resultsBannerUnitId: 'ca-app-pub-1111111111111111/2222222222' })));
});
