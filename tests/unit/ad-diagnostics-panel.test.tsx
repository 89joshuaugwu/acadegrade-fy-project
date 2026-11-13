import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DeliveryDiagnostics } from '@/components/admin/ads/DeliveryDiagnostics';
import { PlacementPreview } from '@/components/admin/ads/PlacementPreview';
import { createDefaultAdsConfig } from '@/lib/ads/config';
import { diagnoseWebPlacements } from '@/lib/ads/diagnostics';
import { createDefaultProviderConfig } from '@/lib/ads/providers';
import type { AdCampaign } from '@/lib/ads/types';

const NOW = Date.parse('2026-11-13T12:00:00.000Z');
const campaign: AdCampaign = {
  id: 'planner', name: 'Planner', placementIds: ['dashboard.overview'], deliveryMode: 'house', active: true,
  schedule: { startsAt: null, endsAt: null }, weight: 1, frequencyCap: { maxImpressions: 3, windowHours: 24 },
  creative: { imageUrl: 'https://cdn.example.com/planner.png', altText: 'Weekly planner', headline: 'Plan your week', body: 'Turn results into a plan.', ctaLabel: 'Open planner' },
  linkUrl: 'https://example.com/planner',
};

let images: { src: string; load: () => void; fail: () => void }[];

beforeEach(() => {
  images = [];
  localStorage.clear();
  vi.stubGlobal('IntersectionObserver', vi.fn());
  vi.stubGlobal('Image', class {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    set src(value: string) { images.push({ src: value, load: () => this.onload?.(), fail: () => this.onerror?.() }); }
  });
});
afterEach(() => vi.unstubAllGlobals());

describe('PlacementPreview', () => {
  it('shows the creative at desktop and phone widths without links, view counting or ad requests', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    render(<PlacementPreview campaign={campaign} placements={['Dashboard overview']} />);
    expect(screen.getByRole('figure', { name: /desktop/i })).toHaveTextContent('Plan your week');
    expect(screen.getByRole('figure', { name: /phone/i })).toHaveTextContent('Open planner');
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText(/https:\/\/example\.com\/planner/)).toBeInTheDocument();
    expect(IntersectionObserver).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(localStorage.length).toBe(0);
  });

  it('warns when the image does not load, because the live slot would stay hidden', () => {
    render(<PlacementPreview campaign={campaign} placements={['Dashboard overview']} />);
    expect(screen.queryByText(/did not load/i)).not.toBeInTheDocument();
    act(() => images.at(-1)!.fail());
    expect(screen.getByText(/did not load/i)).toHaveTextContent(/hidden/i);
  });

  it('asks for content when the creative has neither an image nor a headline', () => {
    render(<PlacementPreview campaign={{ ...campaign, creative: { ...campaign.creative, imageUrl: '', headline: '' } }} placements={['Dashboard overview']} />);
    expect(screen.getByText(/add an image or a headline/i)).toBeInTheDocument();
    expect(screen.queryByRole('figure')).not.toBeInTheDocument();
  });
});

describe('DeliveryDiagnostics', () => {
  it('labels results as configuration status and explains each placement', async () => {
    const user = userEvent.setup();
    const onRecheck = vi.fn();
    const providers = createDefaultProviderConfig();
    providers.adsterra = { enabled: true, smartLinkUrl: 'https://example.com/smart' };
    const diagnoses = diagnoseWebPlacements({
      adsConfig: { ...createDefaultAdsConfig(), enabled: true, campaigns: [campaign] },
      legacyBanners: [],
      providerConfig: providers,
      now: NOW,
    });
    render(<DeliveryDiagnostics title="Web placements" diagnoses={diagnoses} checkedAt={NOW} onRecheck={onRecheck} />);

    expect(screen.getByText(/not proof/i)).toBeInTheDocument();
    const dashboard = screen.getByRole('region', { name: 'Dashboard overview' });
    expect(within(dashboard).getByText('House campaign')).toBeInTheDocument();
    expect(within(dashboard).getByText(/Planner \(100%\)/)).toBeInTheDocument();
    expect(within(dashboard).getByText('Adsterra SmartLink')).toBeInTheDocument();
    const results = screen.getByRole('region', { name: 'Results overview' });
    expect(within(results).getByText('Nothing to serve')).toBeInTheDocument();
    expect(within(results).getByText(/placement switch is off/i)).toBeInTheDocument();

    await user.click(within(dashboard).getByText(/preview planner/i));
    expect(within(dashboard).getByRole('figure', { name: /desktop/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Recheck now' }));
    expect(onRecheck).toHaveBeenCalledTimes(1);
  });

  it('shows a loading state while saved settings are still arriving', () => {
    render(<DeliveryDiagnostics title="Web placements" diagnoses={null} checkedAt={NOW} onRecheck={vi.fn()} />);
    expect(screen.getByRole('status', { name: /checking saved settings/i })).toHaveAttribute('aria-busy', 'true');
  });
});
