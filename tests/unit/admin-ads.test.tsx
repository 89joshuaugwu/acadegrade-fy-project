import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AdsEditor } from '@/components/admin/ads/AdsEditor';
import { LegacyBannerEditor } from '@/components/admin/ads/LegacyBannerEditor';
import { createDefaultAdsConfig } from '@/lib/ads/config';
import { parseAdminAdsMutation } from '@/lib/ads/admin-schema';

// Full renders are slow when many suites run in parallel.
vi.setConfig({ testTimeout: 20_000 });

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
  it('is titled as the fallback it is and says when it shows', () => {
    render(<LegacyBannerEditor initialBanners={[]} onSave={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'Legacy banners (fallback)' })).toBeInTheDocument();
    expect(screen.getByText("Shown on the web Dashboard when no campaign fits, even if website promotions are off. Turn a banner's Active switch off to stop it.")).toBeInTheDocument();
  });

  it('keeps existing banners and saves only the edited legacy banner array', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<LegacyBannerEditor initialBanners={[{ id: 'existing', imageUrl: 'https://example.com/old.png', linkUrl: '', isActive: true }]} onSave={onSave} />);

    await user.click(screen.getByRole('textbox', { name: 'Target link for advert 1' }));
    await user.paste('https://example.com');
    await user.click(screen.getByRole('button', { name: 'Save legacy banners' }));

    expect(onSave).toHaveBeenCalledWith([{ id: 'existing', imageUrl: 'https://example.com/old.png', linkUrl: 'https://example.com', isActive: true }]);
  });

  it('shows unsaved state, discards to saved banners, and keeps a failed save as a draft', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockRejectedValue(new Error('offline'));
    render(<LegacyBannerEditor initialBanners={[{ id: 'existing', imageUrl: 'https://example.com/old.png', linkUrl: '', isActive: true }]} onSave={onSave} />);
    expect(screen.getByRole('status')).toHaveTextContent('All changes saved');
    expect(screen.getByRole('button', { name: 'Save legacy banners' })).toBeDisabled();
    await user.click(screen.getByRole('switch', { name: 'Activate advert 1' }));
    expect(screen.getByRole('status')).toHaveTextContent('Unsaved changes');
    await user.click(screen.getByRole('button', { name: 'Save legacy banners' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not be saved/i);
    expect(screen.getByRole('switch', { name: 'Activate advert 1' })).toHaveAttribute('aria-checked', 'false');
    await user.click(screen.getByRole('button', { name: 'Discard changes' }));
    expect(screen.getByRole('switch', { name: 'Activate advert 1' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('All changes saved');
  });

  it('adds and deactivates a banner without changing the existing one', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<LegacyBannerEditor initialBanners={[{ id: 'existing', imageUrl: 'https://example.com/old.png', linkUrl: '', isActive: true }]} onSave={onSave} />);

    await user.click(screen.getByRole('button', { name: 'Add banner' }));
    await user.click(screen.getByRole('switch', { name: 'Activate advert 2' }));
    await user.click(screen.getByRole('button', { name: 'Save legacy banners' }));

    expect(onSave).toHaveBeenCalledWith([
      { id: 'existing', imageUrl: 'https://example.com/old.png', linkUrl: '', isActive: true },
      expect.objectContaining({ imageUrl: '', linkUrl: '', isActive: false }),
    ]);
  });
});

describe('creative previews', () => {
  it('previews a draft campaign in its placements at desktop and phone widths without links', async () => {
    const user = userEvent.setup();
    render(<AdsEditor initialConfig={createDefaultAdsConfig()} onSave={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Add campaign' }));
    await user.click(screen.getByText('Preview New house campaign'));
    expect(screen.getByRole('figure', { name: /desktop/i })).toHaveTextContent('New house campaign');
    expect(screen.getByRole('figure', { name: /phone/i })).toBeInTheDocument();
    expect(screen.getByText(/Shown in Dashboard overview/)).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('previews a legacy banner as the Dashboard shows it, or explains why it cannot be shown', async () => {
    const user = userEvent.setup();
    render(<LegacyBannerEditor initialBanners={[
      { id: 'existing', imageUrl: 'https://example.com/old.png', linkUrl: '', isActive: true },
      { id: 'unsafe', imageUrl: 'http://example.com/old.png', linkUrl: '', isActive: true },
    ]} onSave={vi.fn()} />);
    await user.click(screen.getByText('Preview advert 1'));
    expect(screen.getByRole('figure', { name: /desktop/i })).toBeInTheDocument();
    await user.click(screen.getByText('Preview advert 2'));
    expect(screen.getByText(/advert 2 is skipped on the site/i)).toBeInTheDocument();
  });
});

describe('AdsEditor', () => {
  it('exposes house-only controls without inert modes', () => {
    render(
      <AdsEditor
        initialConfig={createDefaultAdsConfig()}
        onSave={vi.fn()}
      />
    );

    expect(screen.getByRole('switch', { name: 'Show house promotions on the website' })).not.toBeChecked();
    expect(screen.getByRole('switch', { name: 'Website Dashboard slot' })).toBeChecked();
    expect(screen.queryByRole('switch', { name: 'Enable rewarded delivery' })).not.toBeInTheDocument();
    expect(screen.queryByRole('switch', { name: 'Enable third-party delivery' })).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Delivery mode' })).not.toBeInTheDocument();
    expect(screen.getByText('Advanced').closest('details')).not.toHaveAttribute('open');
    expect(screen.getByRole('switch', { name: 'Allow house delivery mode' })).toBeChecked();
    // Without Android settings, only the website column is shown.
    expect(screen.queryByRole('switch', { name: 'Show house promotions in the Android app' })).not.toBeInTheDocument();
  });

  it('names where each campaign shows and warns how Android picks campaigns', async () => {
    const user = userEvent.setup();
    render(<AdsEditor initialConfig={createDefaultAdsConfig()} onSave={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Add campaign' }));
    const showOn = screen.getByRole('group', { name: 'Show on' });
    expect(within(showOn).getByRole('checkbox', { name: 'Dashboard' })).toBeChecked();
    expect(within(showOn).getByRole('checkbox', { name: 'Results' })).not.toBeChecked();
    expect(within(showOn).getByText('Android uses only campaigns ticked for Dashboard, in both Android slots.')).toBeInTheDocument();
  });

  it('lists the Results placement as off for an older saved configuration without marking it unsaved', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    const older = createDefaultAdsConfig();
    older.placements = older.placements.filter((placement) => placement.id === 'dashboard.overview');
    render(<AdsEditor initialConfig={older} onSave={onSave} />);

    const results = screen.getByRole('switch', { name: 'Website Results slot' });
    expect(results).not.toBeChecked();
    expect(screen.getByRole('status')).toHaveTextContent('All changes saved');
    await user.click(results);
    expect(screen.getByRole('status')).toHaveTextContent('Unsaved changes');
    await user.click(screen.getByRole('button', { name: 'Save house promotions' }));
    expect(onSave.mock.calls[0][0].placements).toEqual([
      { id: 'dashboard.overview', name: 'Dashboard overview', enabled: true },
      { id: 'results.overview', name: 'Results overview', enabled: true },
    ]);
  });

  it('explains unsafe campaign URLs beside the field and refuses to save them', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<AdsEditor initialConfig={createDefaultAdsConfig()} onSave={onSave} />);
    await user.click(screen.getByRole('button', { name: 'Add campaign' }));

    const destination = screen.getByRole('textbox', { name: 'Destination URL' });
    await user.click(destination);
    await user.paste('https://user:secret@example.com/offer');
    expect(destination).toHaveAttribute('aria-invalid', 'true');
    expect(destination).toHaveAccessibleDescription(/remove the username and password/i);

    const image = screen.getByRole('textbox', { name: 'Creative image URL' });
    await user.click(image);
    await user.paste('http://cdn.example.com/a.png');
    expect(image).toHaveAccessibleDescription(/must start with https/i);

    await user.click(screen.getByRole('button', { name: 'Save house promotions' }));
    expect(onSave).not.toHaveBeenCalled();
    // The save summary uses the same field names as the form, not property names.
    expect(screen.getAllByRole('alert').map((alert) => alert.textContent).join(' '))
      .toMatch(/Campaign 1 image URL must be an HTTPS URL/);
  });

  it('adds a valid inactive house campaign and submits the edited configuration', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <AdsEditor
        initialConfig={createDefaultAdsConfig()}
        onSave={onSave}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Add campaign' }));
    expect(screen.getByRole('heading', { name: 'New house campaign' })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Activate New house campaign' })).not.toBeChecked();

    await user.click(screen.getByRole('button', { name: 'Save house promotions' }));
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
    render(<AdsEditor initialConfig={createDefaultAdsConfig()} onSave={onSave} />);
    await user.click(screen.getByRole('button', { name: 'Add campaign' }));
    expect(screen.getByRole('status')).toHaveTextContent('Unsaved changes');
    await user.click(screen.getByRole('button', { name: 'Discard changes' }));
    expect(screen.queryByRole('heading', { name: 'New house campaign' })).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('All changes saved');
    expect(onSave).not.toHaveBeenCalled();
  });

  it('preserves edits made while a house-campaign save is in flight', async () => {
    const user = userEvent.setup();
    let finishSave!: () => void;
    const onSave = vi.fn(() => new Promise<void>(resolve => { finishSave = resolve; }));
    render(<AdsEditor initialConfig={createDefaultAdsConfig()} onSave={onSave} />);
    await user.click(screen.getByRole('button', { name: 'Add campaign' }));
    await user.click(screen.getByRole('button', { name: 'Save house promotions' }));
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
    render(<AdsEditor initialConfig={initial} onSave={vi.fn()} />);

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
