import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AdsEditor } from '@/components/admin/ads/AdsEditor';
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

describe('AdsEditor', () => {
  it('exposes the global and placement controls with future delivery modes disabled', () => {
    render(
      <AdsEditor
        initialConfig={createDefaultAdsConfig()}
        legacyBannerCount={2}
        onSave={vi.fn()}
      />
    );

    expect(screen.getByRole('switch', { name: 'Enable all typed ad delivery' })).not.toBeChecked();
    expect(screen.getByRole('switch', { name: 'Enable dashboard overview placement' })).toBeChecked();
    expect(screen.getByRole('switch', { name: 'Enable rewarded delivery' })).toBeDisabled();
    expect(screen.getByRole('switch', { name: 'Enable third-party delivery' })).toBeDisabled();
    expect(screen.getByText(/2 legacy banners remain active/i)).toBeInTheDocument();
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

    await user.click(screen.getByRole('button', { name: 'Save ads configuration' }));
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
});
