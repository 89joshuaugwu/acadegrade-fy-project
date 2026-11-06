import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProviderEditor } from '@/components/admin/ads/ProviderEditor';
import { MobileAdsEditor } from '@/components/admin/ads/MobileAdsEditor';
import { createDefaultProviderConfig } from '@/lib/ads/providers';
import { createDefaultMobileAdsConfig } from '@/lib/ads/mobile';

describe.each(['providers', 'Android', 'iOS'] as const)('%s draft safety', kind => {
  function setup(onSave = vi.fn(async () => {})) {
    if (kind === 'providers') render(<ProviderEditor initialConfig={createDefaultProviderConfig()} onSave={onSave} />);
    else render(<MobileAdsEditor platform={kind} initialConfig={createDefaultMobileAdsConfig()} onSave={onSave} />);
    return {
      field: screen.getByRole('textbox', { name: kind === 'providers' ? 'Publisher ID' : 'Results banner ad unit ID' }),
      save: screen.getByRole('button', { name: kind === 'providers' ? 'Save provider settings' : `Save ${kind} ad settings` }),
      first: kind === 'providers' ? 'ca-pub-1111111111111111' : 'ca-app-pub-1111111111111111/1111111111',
      later: kind === 'providers' ? 'ca-pub-2222222222222222' : 'ca-app-pub-2222222222222222/2222222222',
    };
  }

  it('discards local changes without saving', () => {
    const onSave = vi.fn(async () => {});
    const { field, first } = setup(onSave);
    fireEvent.change(field, { target: { value: first } });
    expect(screen.getByRole('status')).toHaveTextContent('Unsaved changes');
    fireEvent.click(screen.getByRole('button', { name: 'Discard changes' }));
    expect(field).toHaveValue('');
    expect(onSave).not.toHaveBeenCalled();
  });

  it('preserves newer edits after a save resolves and discards to the saved snapshot', async () => {
    let finish!: () => void;
    const onSave = vi.fn(() => new Promise<void>(resolve => { finish = resolve; }));
    const { field, save, first, later } = setup(onSave);
    fireEvent.change(field, { target: { value: first } });
    fireEvent.click(save);
    fireEvent.change(field, { target: { value: later } });
    await act(async () => { finish(); });
    expect(field).toHaveValue(later);
    expect(screen.getByRole('status')).toHaveTextContent('Unsaved changes');
    fireEvent.click(screen.getByRole('button', { name: 'Discard changes' }));
    expect(field).toHaveValue(first);
  });

  it('retains a failed draft for retry or discard', async () => {
    const { field, save, first } = setup(vi.fn(async () => { throw new Error('Save unavailable. Retry.'); }));
    fireEvent.change(field, { target: { value: first } });
    await act(async () => { fireEvent.click(save); });
    expect(screen.getByRole('alert')).toHaveTextContent('Save unavailable');
    expect(field).toHaveValue(first);
    expect(screen.getByRole('status')).toHaveTextContent('Unsaved changes');
  });
});
