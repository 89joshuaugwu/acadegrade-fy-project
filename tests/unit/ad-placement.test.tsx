import { act, render, screen, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdPlacement } from '@/components/ads/AdPlacement';
import type { AdsConfig } from '@/lib/ads/types';

const mocks = vi.hoisted(() => ({ getDocument: vi.fn() }));
const historyKey = 'acadegrade:ads:impressions:v1';
const now = 1_788_768_000_000;
let observers: { notify: (ratio: number) => void; disconnect: ReturnType<typeof vi.fn> }[];

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
    observers = [];
    vi.stubGlobal('IntersectionObserver', class {
      disconnect = vi.fn();
      constructor(callback: IntersectionObserverCallback) {
        observers.push({
          notify: (ratio) => act(() => callback([
            { isIntersecting: ratio > 0, intersectionRatio: ratio } as IntersectionObserverEntry,
          ], this as unknown as IntersectionObserver)),
          disconnect: this.disconnect,
        });
      }
      observe() {}
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('does not consume a cap for a selected below-fold or less-than-half-visible creative', () => {
    render(<AdPlacement placement="dashboard.overview" config={config()} seed="student-1" now={now} />);
    expect(screen.getByText('House promotion')).toBeInTheDocument();
    expect(localStorage.getItem(historyKey)).toBeNull();
    observers.at(-1)!.notify(0);
    observers.at(-1)!.notify(0.49);
    expect(localStorage.getItem(historyKey)).toBeNull();
  });

  it('records once at half visibility, including repeated callbacks and equivalent config refreshes', () => {
    const view = render(<StrictMode><AdPlacement placement="dashboard.overview" config={config()} seed="student-1" now={now} /></StrictMode>);
    expect(localStorage.getItem(historyKey)).toBeNull();
    observers.at(-1)!.notify(0.5);
    observers.at(-1)!.notify(1);
    view.rerender(<StrictMode><AdPlacement placement="dashboard.overview" config={config()} seed="student-1" now={now} /></StrictMode>);
    observers.at(-1)!.notify(1);
    expect(JSON.parse(localStorage.getItem(historyKey)!)).toEqual({ 'insights-launch': [now] });
  });

  it('ignores queued visibility after disabling or replacing a creative', () => {
    const view = render(<AdPlacement placement="dashboard.overview" config={config()} seed="student-1" now={now} />);
    expect(observers).toHaveLength(1);
    const stale = observers.at(-1)!;
    const replacement = config();
    replacement.campaigns[0].id = 'replacement';
    view.rerender(<AdPlacement placement="dashboard.overview" config={replacement} seed="student-1" now={now} />);
    expect(stale.disconnect).toHaveBeenCalled();
    stale.notify(1);
    expect(localStorage.getItem(historyKey)).toBeNull();
    const current = observers.at(-1)!;
    current.notify(1);
    expect(JSON.parse(localStorage.getItem(historyKey)!)).toEqual({ replacement: [now] });
    view.rerender(<AdPlacement placement="dashboard.overview" config={config(false)} seed="student-1" now={now} />);
    current.notify(1);
    expect(screen.queryByText('House promotion')).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(historyKey)!)).toEqual({ replacement: [now] });
  });

  it('fails closed for impression counting when visibility observation is unavailable', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    render(<AdPlacement placement="dashboard.overview" config={config()} seed="student-1" now={now} />);
    expect(screen.getByText('House promotion')).toBeInTheDocument();
    expect(localStorage.getItem(historyKey)).toBeNull();
  });

  it('reads current storage when visible instead of overwriting newer impressions', () => {
    render(<AdPlacement placement="dashboard.overview" config={config()} seed="student-1" now={now} />);
    expect(observers).toHaveLength(1);
    localStorage.setItem(historyKey, JSON.stringify({ 'insights-launch': [now - 1], other: [now - 2] }));
    observers.at(-1)!.notify(1);
    expect(JSON.parse(localStorage.getItem(historyKey)!)).toEqual({ 'insights-launch': [now - 1, now], other: [now - 2] });
  });

  it('preserves stored caps during selection', () => {
    localStorage.setItem(historyKey, JSON.stringify({ 'insights-launch': [now - 3, now - 2, now - 1] }));
    const { container } = render(<AdPlacement placement="dashboard.overview" config={config()} seed="student-1" now={now} />);
    expect(container).toBeEmptyDOMElement();
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

  it('falls back to an active legacy banner when typed delivery is disabled', async () => {
    mocks.getDocument.mockResolvedValueOnce({
      adsConfig: config(false),
      advertBanners: [{
        id: 'legacy-banner',
        imageUrl: 'https://cdn.example.com/legacy.png',
        linkUrl: 'https://example.com/legacy',
        isActive: true,
      }],
    });

    render(<AdPlacement placement="dashboard.overview" seed="student-1" now={1_788_768_000_000} />);

    expect(await screen.findByRole('link', { name: /learn more/i }))
      .toHaveAttribute('href', 'https://example.com/legacy');
  });

  it('clears a selected campaign when a later configuration disables delivery', async () => {
    const view = render(<AdPlacement placement="dashboard.overview" config={config()} seed="student-1" />);
    expect(await screen.findByRole('complementary', { name: 'Featured from AcadeGrade' }))
      .toBeInTheDocument();

    view.rerender(<AdPlacement placement="dashboard.overview" config={config(false)} seed="student-1" />);

    await waitFor(() => {
      expect(screen.queryByRole('complementary', { name: 'Featured from AcadeGrade' }))
        .not.toBeInTheDocument();
    });
  });
});
