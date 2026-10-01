import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AdsEditor } from '@/components/admin/ads/AdsEditor';
import { LegacyBannerEditor } from '@/components/admin/ads/LegacyBannerEditor';
import { createDefaultAdsConfig } from '@/lib/ads/config';
import { parseAdminAdsMutation } from '@/lib/ads/admin-schema';

describe('parseAdminAdsMutation', () => {
  it('accepts only a validated ads configuration payload', () => {
    const config = createDefaultAdsConfig();
    expect(parseAdminAdsMutation({ config })).toEqual(config);
    expect(() => parseAdminAdsMutation({ config, apiKey: 'secret' }))
      .toThrow('Unsupported ads request field: apiKey');
    expect(() => parseAdminAdsMutation({ config: { ...config, enabled: 'yes' } }))
      .toThrow('Ads enabled must be a boolean');
  });
});

describe('LegacyBannerEditor', () => {
  it('keeps existing banners and saves only the edited legacy banner array', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<LegacyBannerEditor initialBanners={[{ id: 'existing', imageUrl: 'https://example.com/old.png', linkUrl: '', isActive: true }]} onSave={onSave} />);

    await user.type(screen.getByRole('textbox', { name: 'Target link for advert 1' }), 'https://example.com');
    await user.click(screen.getByRole('button', { name: 'Save Adverts' }));

    expect(onSave).toHaveBeenCalledWith([{ id: 'existing', imageUrl: 'https://example.com/old.png', linkUrl: 'https://example.com', isActive: true }]);
  });

  it('adds and deactivates a banner without changing the existing one', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<LegacyBannerEditor initialBanners={[{ id: 'existing', imageUrl: 'https://example.com/old.png', linkUrl: '', isActive: true }]} onSave={onSave} />);

    await user.click(screen.getByRole('button', { name: 'Add Advert' }));
    await user.click(screen.getByRole('switch', { name: 'Activate advert 2' }));
    await user.click(screen.getByRole('button', { name: 'Save Adverts' }));

    expect(onSave).toHaveBeenCalledWith([
      { id: 'existing', imageUrl: 'https://example.com/old.png', linkUrl: '', isActive: true },
      expect.objectContaining({ imageUrl: '', linkUrl: '', isActive: false }),
    ]);
  });
});

describe('AdsEditor', () => {
  it('exposes house-only and placement controls with other delivery modes disabled', () => {
    render(
      <AdsEditor
        initialConfig={createDefaultAdsConfig()}
        legacyBannerCount={2}
        onSave={vi.fn()}
      />
    );

    expect(screen.getByRole('switch', { name: 'Enable house campaign delivery' })).not.toBeChecked();
    expect(screen.getByRole('switch', { name: 'Enable dashboard overview placement' })).toBeChecked();
    expect(screen.getByRole('switch', { name: 'Enable rewarded delivery' })).toBeDisabled();
    expect(screen.getByRole('switch', { name: 'Enable third-party delivery' })).toBeDisabled();
    expect(screen.getByText(/2 legacy banner records/i)).toBeInTheDocument();
  });

  it('adds a valid inactive house campaign and submits the edited configuration', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <AdsEditor
        initialConfig={createDefaultAdsConfig()}
        legacyBannerCount={0}
        onSave={onSave}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Add campaign' }));
    expect(screen.getByRole('heading', { name: 'New house campaign' })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Activate New house campaign' })).not.toBeChecked();

    await user.click(screen.getByRole('button', { name: 'Save house campaigns' }));
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][0]).toMatchObject({
      enabled: false,
      campaigns: [{
        name: 'New house campaign',
        deliveryMode: 'house',
        active: false,
      }],
    });
  });

  it('can discard campaign changes without publishing or deleting saved campaigns', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<AdsEditor initialConfig={createDefaultAdsConfig()} legacyBannerCount={0} onSave={onSave} />);
    await user.click(screen.getByRole('button', { name: 'Add campaign' }));
    expect(screen.getByRole('status')).toHaveTextContent('Unsaved changes');
    await user.click(screen.getByRole('button', { name: 'Discard changes' }));
    expect(screen.queryByRole('heading', { name: 'New house campaign' })).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Saved configuration');
    expect(onSave).not.toHaveBeenCalled();
  });

  it('preserves edits made while a house-campaign save is in flight', async () => {
    const user = userEvent.setup();
    let finishSave!: () => void;
    const onSave = vi.fn(() => new Promise<void>(resolve => { finishSave = resolve; }));
    render(<AdsEditor initialConfig={createDefaultAdsConfig()} legacyBannerCount={0} onSave={onSave} />);
    await user.click(screen.getByRole('button', { name: 'Add campaign' }));
    await user.click(screen.getByRole('button', { name: 'Save house campaigns' }));
    await user.clear(screen.getByRole('textbox', { name: 'Campaign name' }));
    await user.type(screen.getByRole('textbox', { name: 'Campaign name' }), 'Later edit');
    await act(async () => { finishSave(); });
    expect(screen.getByRole('textbox', { name: 'Campaign name' })).toHaveValue('Later edit');
    expect(screen.getByRole('status')).toHaveTextContent('Unsaved changes');
    await user.click(screen.getByRole('button', { name: 'Discard changes' }));
    expect(screen.getByRole('textbox', { name: 'Campaign name' })).toHaveValue('New house campaign');
  });

  it('duplicates a campaign and confirms deletion before removing it', async () => {
    const user = userEvent.setup();
    const initial = {
      ...createDefaultAdsConfig(),
      campaigns: [{
        id: 'dashboard-message',
        name: 'Dashboard message',
        placementIds: ['dashboard.overview' as const],
        deliveryMode: 'house' as const,
        active: false,
        schedule: { startsAt: null, endsAt: null },
        weight: 1,
        frequencyCap: { maxImpressions: 3, windowHours: 24 },
        creative: { imageUrl: '', altText: '', headline: 'Study smarter', body: '', ctaLabel: '' },
        linkUrl: '',
      }],
    };
    render(<AdsEditor initialConfig={initial} legacyBannerCount={0} onSave={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Duplicate Dashboard message' }));
    expect(screen.getAllByRole('heading', { name: /Dashboard message/ })).toHaveLength(2);

    await user.click(screen.getByRole('button', { name: 'Delete Dashboard message' }));
    expect(screen.getByRole('dialog', { name: 'Delete Dashboard message?' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Delete campaign' }));
    await waitFor(() => {
      expect(screen.getAllByRole('heading', { name: /Dashboard message/ })).toHaveLength(1);
    });
  });
});
