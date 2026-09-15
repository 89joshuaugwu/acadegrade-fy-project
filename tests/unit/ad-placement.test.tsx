import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdPlacement } from '@/components/ads/AdPlacement';
import type { AdsConfig } from '@/lib/ads/types';

const mocks = vi.hoisted(() => ({ getDocument: vi.fn() }));

vi.mock('@/lib/firebase/firestore', () => ({
  getDocument: mocks.getDocument,
}));

function config(enabled = true): AdsConfig {
  return {
    version: 1,
    enabled,
    deliveryModes: { house: true, rewarded: false, thirdParty: false },
    placements: [
      { id: 'dashboard.overview', name: 'Dashboard overview', enabled: true },
    ],
    campaigns: [
      {
        id: 'insights-launch',
        name: 'Insights launch',
        placementIds: ['dashboard.overview'],
        deliveryMode: 'house',
        active: true,
        schedule: { startsAt: null, endsAt: null },
        weight: 1,
        frequencyCap: { maxImpressions: 3, windowHours: 24 },
        creative: {
          imageUrl: '',
          altText: '',
          headline: 'Find the courses shaping your CGPA',
          body: 'Use AI insights to turn your latest results into practical next steps.',
          ctaLabel: 'Explore insights',
        },
        linkUrl: 'https://acadegrade.example/insights',
      },
    ],
  };
}

describe('AdPlacement', () => {
  beforeEach(() => {
    localStorage.clear();
    mocks.getDocument.mockReset();
  });

  it('silently renders nothing when delivery is disabled', () => {
    const { container } = render(
      <AdPlacement placement="dashboard.overview" config={config(false)} seed="student-1" />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders an accessible house promotion when one is eligible', () => {
    render(<AdPlacement placement="dashboard.overview" config={config()} seed="student-1" />);

    expect(screen.getByRole('complementary', { name: 'Featured from AcadeGrade' }))
      .toBeInTheDocument();
    expect(screen.getByRole('link', { name: /explore insights/i })).toHaveAttribute(
      'href',
      'https://acadegrade.example/insights'
    );
    expect(screen.getByText('House promotion')).toBeInTheDocument();
  });

  it('loads a legacy banner inline when the new configuration is absent', async () => {
    mocks.getDocument.mockResolvedValueOnce({
      advertBanners: [{
        id: 'legacy-banner',
        imageUrl: 'https://cdn.example.com/legacy.png',
        linkUrl: 'https://example.com/legacy',
        isActive: true,
      }],
    });

    render(<AdPlacement placement="dashboard.overview" seed="student-1" now={1_788_768_000_000} />);

    expect(await screen.findByRole('complementary', { name: 'Featured from AcadeGrade' }))
      .toBeInTheDocument();
    expect(screen.getByRole('link', { name: /learn more/i }))
      .toHaveAttribute('href', 'https://example.com/legacy');
  });
});
