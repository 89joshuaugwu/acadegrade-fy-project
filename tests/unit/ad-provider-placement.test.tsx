import { act, render, screen } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProviderPlacement } from '@/components/ads/ProviderPlacement';
import { createDefaultProviderConfig } from '@/lib/ads/providers';

vi.mock('next/script', () => ({ default: ({ src }: { src: string }) => <div data-testid="adsense-sdk" data-src={src} /> }));

describe('ProviderPlacement', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('No live requests in tests')));
    window.adsbygoogle = [];
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    delete window.adsbygoogle;
  });

  it('uses current supplied settings when enabling, changing units and links, then disabling', () => {
    const view = render(<ProviderPlacement config={createDefaultProviderConfig()} />);
    const enabled = createDefaultProviderConfig();
    enabled.adsense = { enabled: true, publisherId: 'ca-pub-1234567890123456', slotId: '1234567890' };
    enabled.adsterra = { enabled: true, smartLinkUrl: 'https://example.com/first' };
    view.rerender(<ProviderPlacement config={enabled} />);
    const firstUnit = document.querySelector('ins.adsbygoogle');
    expect(firstUnit).toHaveAttribute('data-ad-slot', '1234567890');
    const changed = { ...enabled, adsense: { ...enabled.adsense, slotId: '9876543210' }, adsterra: { enabled: true, smartLinkUrl: 'https://example.com/second' } };
    view.rerender(<ProviderPlacement config={changed} />);
    expect(document.querySelector('ins.adsbygoogle')).not.toBe(firstUnit);
    expect(document.querySelector('ins.adsbygoogle')).toHaveAttribute('data-ad-slot', '9876543210');
    expect(window.adsbygoogle).toHaveLength(2);
    expect(screen.getByRole('link', { name: 'View sponsored offer' })).toHaveAttribute('href', 'https://example.com/second');
    view.rerender(<ProviderPlacement config={createDefaultProviderConfig()} />);
    expect(view.container).toBeEmptyDOMElement();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('clears supplied settings while loading and ignores a superseded fetched response', async () => {
    let finish!: (value: Response) => void;
    vi.mocked(fetch).mockReturnValueOnce(new Promise<Response>((resolve) => { finish = resolve; }));
    const enabled = createDefaultProviderConfig();
    enabled.adsterra = { enabled: true, smartLinkUrl: 'https://example.com/old' };
    const view = render(<ProviderPlacement config={enabled} />);
    view.rerender(<ProviderPlacement />);
    expect(view.container).toBeEmptyDOMElement();
    const signal = vi.mocked(fetch).mock.calls[0][1]?.signal;
    view.rerender(<ProviderPlacement config={createDefaultProviderConfig()} />);
    expect(signal?.aborted).toBe(true);
    await act(async () => { finish(Response.json({ config: enabled })); });
    expect(view.container).toBeEmptyDOMElement();
    // A stale fetch must not reappear when supplied props are removed again.
    view.rerender(<ProviderPlacement />);
    expect(view.container).toBeEmptyDOMElement();
    await act(async () => {});
    expect(view.container).toBeEmptyDOMElement();
  });
  it('renders nothing and loads no SDK when providers are off', () => {
    const { container } = render(<ProviderPlacement config={createDefaultProviderConfig()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the reviewed AdSense unit only when enabled', () => {
    const config = createDefaultProviderConfig();
    config.adsense = { enabled: true, publisherId: 'ca-pub-1234567890123456', slotId: '1234567890' };
    render(<ProviderPlacement config={config} />);
    expect(screen.getByTestId('adsense-sdk')).toHaveAttribute('data-src', 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1234567890123456');
    expect(document.querySelector('ins.adsbygoogle')).toHaveAttribute('data-ad-slot', '1234567890');
  });

  it('requests each AdSense element once through StrictMode and config refresh', () => {
    const push = vi.fn();
    window.adsbygoogle = { push } as unknown as Record<string, unknown>[];
    const config = createDefaultProviderConfig();
    config.adsense = { enabled: true, publisherId: 'ca-pub-1234567890123456', slotId: '1234567890' };
    const view = render(<StrictMode><ProviderPlacement config={config} /></StrictMode>);
    view.rerender(<StrictMode><ProviderPlacement config={{ ...config, adsense: { ...config.adsense } }} /></StrictMode>);
    expect(push).toHaveBeenCalledTimes(1);
    view.unmount();
    render(<ProviderPlacement config={config} />);
    expect(push).toHaveBeenCalledTimes(2);
    delete window.adsbygoogle;
  });

  it('uses a first-party outbound CTA without third-party scripts', () => {
    const config = createDefaultProviderConfig();
    config.adsterra = { enabled: true, smartLinkUrl: 'https://example.com/offer' };
    render(<ProviderPlacement config={config} />);
    expect(screen.getByRole('link', { name: 'View sponsored offer' })).toHaveAttribute('href', 'https://example.com/offer');
    expect(screen.queryByTestId('adsense-sdk')).not.toBeInTheDocument();
  });
});
