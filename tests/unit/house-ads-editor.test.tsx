import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { AdsEditor } from '@/components/admin/ads/AdsEditor';
import { defaultHouseConfig } from '@/lib/ads/house';
import { createDefaultAdsConfig } from '@/lib/ads/config';

// Full renders are slow when many suites run in parallel.
vi.setConfig({ testTimeout: 20_000 });

function renderEditor(saveWeb = vi.fn().mockResolvedValue(undefined), saveAndroid = vi.fn().mockResolvedValue(undefined)) {
  render(<AdsEditor initialConfig={createDefaultAdsConfig()} onSave={saveWeb} android={{ initialConfig: defaultHouseConfig(), onSave: saveAndroid }} />);
  return { saveWeb, saveAndroid };
}

it('shows website and Android switches side by side under one save', () => {
  renderEditor();
  const where = screen.getByRole('region', { name: 'Where promotions show' });
  const website = within(where).getByRole('group', { name: 'Website' });
  const android = within(where).getByRole('group', { name: 'Android app' });
  expect(within(website).getAllByRole('switch').map((item) => item.getAttribute('aria-label'))).toEqual([
    'Show house promotions on the website', 'Website Dashboard slot', 'Website Results slot',
  ]);
  expect(within(android).getAllByRole('switch').map((item) => item.getAttribute('aria-label'))).toEqual([
    'Show house promotions in the Android app', 'Android Dashboard slot', 'Android Results slot', 'Use legacy banners when no campaign fits',
  ]);
  expect(screen.getAllByRole('button', { name: 'Save house promotions' })).toHaveLength(1);
});

it('saves only the Android side when only Android changed', async () => {
  const { saveWeb, saveAndroid } = renderEditor();
  const button = screen.getByRole('button', { name: 'Save house promotions' });
  expect(button).toBeDisabled();
  fireEvent.click(screen.getByRole('switch', { name: 'Show house promotions in the Android app' }));
  fireEvent.click(screen.getByRole('switch', { name: 'Use legacy banners when no campaign fits' }));
  expect(screen.getByRole('status')).toHaveTextContent('Unsaved changes: Android app');
  fireEvent.click(button);
  await waitFor(() => expect(saveAndroid).toHaveBeenCalledWith({ version: 1, enabled: true, includeLegacy: false, placements: { dashboard: true, results: false } }));
  expect(saveWeb).not.toHaveBeenCalled();
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('All changes saved'));
  expect(button).toBeDisabled();
});

it('saves the website first, then Android, and reports each result', async () => {
  const order: string[] = [];
  const saveWeb = vi.fn(async () => { order.push('web'); });
  const saveAndroid = vi.fn(async () => { order.push('android'); throw new Error('Android save failed'); });
  renderEditor(saveWeb, saveAndroid);
  fireEvent.click(screen.getByRole('switch', { name: 'Android Results slot' }));
  fireEvent.click(screen.getByRole('switch', { name: 'Show house promotions on the website' }));
  expect(screen.getByRole('status')).toHaveTextContent('Unsaved changes: website and Android app');
  fireEvent.click(screen.getByRole('button', { name: 'Save house promotions' }));
  await waitFor(() => expect(order).toEqual(['web', 'android']));
  expect(await screen.findByRole('alert')).toHaveTextContent('Android app: Android save failed');
  expect(screen.getByRole('status')).toHaveTextContent('Website saved.');
  expect(screen.getByRole('status')).toHaveTextContent('Unsaved changes: Android app');
});

it('discards both sides back to the saved snapshot', () => {
  const { saveAndroid } = renderEditor();
  fireEvent.click(screen.getByRole('switch', { name: 'Show house promotions in the Android app' }));
  fireEvent.click(screen.getByRole('button', { name: 'Discard changes' }));
  expect(screen.getByRole('switch', { name: 'Show house promotions in the Android app' })).toHaveAttribute('aria-checked', 'false');
  expect(screen.getByRole('status')).toHaveTextContent('All changes saved');
  expect(saveAndroid).not.toHaveBeenCalled();
});

it('keeps Android edits made while a save is in flight', async () => {
  let resolve!: () => void;
  const saveAndroid = vi.fn(() => new Promise<void>((done) => { resolve = done; }));
  renderEditor(vi.fn().mockResolvedValue(undefined), saveAndroid);
  fireEvent.click(screen.getByRole('switch', { name: 'Show house promotions in the Android app' }));
  fireEvent.click(screen.getByRole('button', { name: 'Save house promotions' }));
  fireEvent.click(screen.getByRole('switch', { name: 'Android Results slot' }));
  await act(async () => { resolve(); });
  expect(screen.getByRole('switch', { name: 'Android Results slot' })).toHaveAttribute('aria-checked', 'true');
  expect(screen.getByRole('status')).toHaveTextContent('Unsaved changes: Android app');
});

it('keeps the Android column usable when website campaigns could not load', async () => {
  const saveAndroid = vi.fn().mockResolvedValue(undefined);
  render(<AdsEditor initialConfig={null} webUnavailable={<p>Website campaigns unavailable</p>} onSave={vi.fn()} android={{ initialConfig: defaultHouseConfig(), onSave: saveAndroid }} />);
  expect(screen.getByText('Website campaigns unavailable')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Add campaign' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('switch', { name: 'Show house promotions in the Android app' }));
  fireEvent.click(screen.getByRole('button', { name: 'Save house promotions' }));
  await waitFor(() => expect(saveAndroid).toHaveBeenCalledTimes(1));
});
