import { render, screen } from '@testing-library/react';
import { StrictMode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ProviderPlacement } from '@/components/ads/ProviderPlacement';
import { createDefaultProviderConfig } from '@/lib/ads/providers';

vi.mock('next/script', () => ({ default: ({ src }: { src: string }) => <div data-testid="adsense-sdk" data-src={src} /> }));

describe('ProviderPlacement', () => {
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
