import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { MobileAdsEditor } from '@/components/admin/ads/MobileAdsEditor';
import { createDefaultMobileAdsConfig } from '@/lib/ads/mobile';

it('lets an administrator save separate Dashboard and Results banner IDs beside their switches', async () => {
  const onSave = vi.fn().mockResolvedValue(undefined);
  render(<MobileAdsEditor initialConfig={createDefaultMobileAdsConfig()} onSave={onSave} />);
  const banners = screen.getByRole('group', { name: 'Banners' });
  expect(within(banners).getByRole('switch', { name: 'Dashboard banner' })).toBeInTheDocument();
  expect(within(banners).getByRole('switch', { name: 'Results banner' })).toBeInTheDocument();
  const dashboard = 'ca-app-pub-1111111111111111/1111111111';
  const results = 'ca-app-pub-1111111111111111/2222222222';
  fireEvent.change(within(banners).getByLabelText('Dashboard banner ad unit ID'), { target: { value: dashboard } });
  fireEvent.change(within(banners).getByLabelText('Results banner ad unit ID'), { target: { value: results } });
  expect(screen.getByRole('status')).toHaveTextContent('Unsaved changes');
  fireEvent.click(screen.getByRole('button', { name: 'Save Android ad settings' }));
  await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
    dashboardBannerUnitId: dashboard, resultsBannerUnitId: results, bannerUnitId: dashboard,
  })));
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('All changes saved'));
});

it('uses the renamed Android switches', () => {
  render(<MobileAdsEditor initialConfig={createDefaultMobileAdsConfig()} onSave={vi.fn()} />);
  expect(screen.getByRole('switch', { name: 'Allow ads in the Android app' })).toBeInTheDocument();
  expect(screen.getByRole('switch', { name: 'Use Google test ads (no revenue)' })).toBeChecked();
  expect(screen.queryByText(/serving not verified/i)).not.toBeInTheDocument();
});

it('provides an explicitly staged iOS editor with its own save action and no rewarded switch', async () => {
  const onSave = vi.fn().mockResolvedValue(undefined);
  render(<MobileAdsEditor platform="iOS" initialConfig={createDefaultMobileAdsConfig()} onSave={onSave} />);
  expect(screen.getByRole('heading', { name: 'iOS AdMob' })).toBeInTheDocument();
  expect(screen.getByText(/Ad rendering is not connected in the iOS app yet/)).toBeInTheDocument();
  expect(screen.getByRole('switch', { name: 'Allow ads in the iOS app' })).toBeInTheDocument();
  expect(screen.queryByRole('switch', { name: 'Rewarded ads' })).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Results banner ad unit ID'), { target: { value: 'ca-app-pub-1111111111111111/2222222222' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save iOS ad settings' }));
  await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ resultsBannerUnitId: 'ca-app-pub-1111111111111111/2222222222' })));
});

it('explains the rewarded switch in one line, shows readiness and links to coin settings', () => {
  render(<MobileAdsEditor initialConfig={createDefaultMobileAdsConfig()} onSave={vi.fn()} rewardedReadiness={<p>Readiness strip</p>} />);
  const rewarded = screen.getByRole('group', { name: 'Rewarded ads' });
  expect(within(rewarded).getByRole('switch', { name: 'Rewarded ads' })).toBeInTheDocument();
  expect(within(rewarded).getByText('Needed for coins. When coins are off, a verified ad gives one extra Written Analysis refresh.')).toBeInTheDocument();
  expect(within(rewarded).getByLabelText('Rewarded ad unit ID')).toBeInTheDocument();
  expect(within(rewarded).getByText('Readiness strip')).toBeInTheDocument();
  expect(within(rewarded).getByRole('link', { name: /coin prices and caps/i })).toHaveAttribute('href', '/admin/usage');
  expect(screen.queryByText(/Check delivery prerequisites/)).not.toBeInTheDocument();
  expect(screen.getByText(/Saved but no ad\?/)).toHaveTextContent(/Help/);
});
