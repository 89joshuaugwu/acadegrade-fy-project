import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  CONSENT_COOKIE,
  CONSENT_STORAGE_KEY,
  openCookieChoices,
  readCookieConsent,
  writeCookieConsent,
} from '@/lib/consent/cookies';
import { CookieConsentBanner } from '@/components/privacy/CookieConsentBanner';
import { CookieChoicesButton } from '@/components/privacy/CookieChoicesButton';
import { ProviderPlacement } from '@/components/ads/ProviderPlacement';
import { createDefaultProviderConfig } from '@/lib/ads/providers';

vi.mock('next/script', () => ({
  default: ({ src }: { src: string }) => <span data-testid="adsense-sdk" data-src={src} />,
}));

function clearCookie() {
  document.cookie = `${CONSENT_COOKIE}=; Max-Age=0; Path=/`;
}

function adsenseConfig() {
  const config = createDefaultProviderConfig();
  config.adsense = { enabled: true, publisherId: 'ca-pub-1234567890123456', slotId: '1234567890' };
  config.adsterra = { enabled: true, smartLinkUrl: 'https://example.com/offer' };
  return config;
}

beforeEach(() => {
  localStorage.clear();
  clearCookie();
  window.adsbygoogle = [];
});
afterEach(() => {
  delete window.adsbygoogle;
  window.location.hash = '';
});

describe('cookie consent storage', () => {
  it('has no choice until the visitor makes one', () => {
    expect(readCookieConsent()).toBeNull();
  });

  it('stores the choice in localStorage and a first-party cookie', () => {
    writeCookieConsent('ads');
    expect(readCookieConsent()).toBe('ads');
    expect(JSON.parse(localStorage.getItem(CONSENT_STORAGE_KEY)!)).toMatchObject({ choice: 'ads', version: 1 });
    expect(document.cookie).toContain(`${CONSENT_COOKIE}=ads`);
  });

  it('falls back to the cookie when storage is blocked', () => {
    writeCookieConsent('necessary');
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    expect(readCookieConsent()).toBe('necessary');
    getItem.mockRestore();
  });
});

describe('CookieConsentBanner', () => {
  it('asks first-time visitors with two equal choices and no way to dismiss without choosing', () => {
    render(<CookieConsentBanner />);
    const panel = screen.getByRole('dialog', { name: 'Cookie choices' });
    const necessary = screen.getByRole('button', { name: 'Necessary only' });
    const allow = screen.getByRole('button', { name: 'Allow ads & analytics' });
    expect(necessary.className).toBe(allow.className);
    expect(screen.queryByRole('button', { name: /close|dismiss/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /privacy policy/i })).toHaveAttribute('href', '/privacy');
    expect(panel).toBeInTheDocument();
  });

  it('records "Necessary only" and closes', () => {
    render(<CookieConsentBanner />);
    fireEvent.click(screen.getByRole('button', { name: 'Necessary only' }));
    expect(readCookieConsent()).toBe('necessary');
    expect(screen.queryByRole('dialog', { name: 'Cookie choices' })).not.toBeInTheDocument();
  });

  it('stays closed for a returning visitor and reopens from "Cookie choices"', () => {
    writeCookieConsent('ads');
    render(<><CookieConsentBanner /><CookieChoicesButton /></>);
    expect(screen.queryByRole('dialog', { name: 'Cookie choices' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cookie choices' }));
    expect(screen.getByRole('dialog', { name: 'Cookie choices' })).toBeInTheDocument();
    expect(screen.getByText(/currently allow ads/i)).toBeInTheDocument();
  });

  it('reopens from a plain #cookie-choices footer link', () => {
    writeCookieConsent('necessary');
    render(<CookieConsentBanner />);
    act(() => {
      window.location.hash = '#cookie-choices';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    expect(screen.getByRole('dialog', { name: 'Cookie choices' })).toBeInTheDocument();
  });

  it('reopens through openCookieChoices()', () => {
    writeCookieConsent('necessary');
    render(<CookieConsentBanner />);
    act(() => openCookieChoices());
    expect(screen.getByRole('dialog', { name: 'Cookie choices' })).toBeInTheDocument();
  });
});

describe('ProviderPlacement consent gate', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('No live requests in tests')));
  });
  afterEach(() => vi.unstubAllGlobals());

  it('does not load AdSense or partner links before consent', () => {
    const view = render(<ProviderPlacement config={adsenseConfig()} />);
    expect(screen.queryByTestId('adsense-sdk')).not.toBeInTheDocument();
    expect(document.querySelector('ins.adsbygoogle')).toBeNull();
    expect(screen.queryByRole('link', { name: 'View sponsored offer' })).not.toBeInTheDocument();
    expect(view.container).toBeEmptyDOMElement();
  });

  it('does not load AdSense after "Necessary only"', () => {
    writeCookieConsent('necessary');
    render(<ProviderPlacement config={adsenseConfig()} />);
    expect(screen.queryByTestId('adsense-sdk')).not.toBeInTheDocument();
  });

  it('loads AdSense once the visitor allows ads', () => {
    render(<ProviderPlacement config={adsenseConfig()} />);
    act(() => writeCookieConsent('ads'));
    expect(screen.getByTestId('adsense-sdk')).toBeInTheDocument();
    expect(document.querySelector('ins.adsbygoogle')).not.toBeNull();
  });
});
