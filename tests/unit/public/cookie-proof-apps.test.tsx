import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { authState } = vi.hoisted(() => ({
  authState: { user: null as { uid: string; getIdToken: () => Promise<string> } | null, uid: null as string | null, loading: false, error: null },
}));

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => authState }));
vi.mock('@/lib/firebase/admin', () => ({ adminDb: {} }));

import { CONSENT_COOKIE, openCookieChoices, readCookieConsent, writeCookieConsent } from '@/lib/consent/cookies';
import { CookieStub, COOKIE_STUB_COPY } from '@/components/public/CookieStub';
import { CookieConsentBanner } from '@/components/privacy/CookieConsentBanner';
import { CookieChoicesLink } from '@/components/public/CookieChoicesLink';
import { ProofPreviewGate, hasProofPreviewParam } from '@/components/public/ProofPreviewGate';
import { OgSlip, OG_SIZE } from '@/lib/public/og';
import { GET as serviceWorker } from '@/app/sw.js/route';
import nextConfig from '@/next.config';

function clearConsent() {
  localStorage.clear();
  document.cookie = `${CONSENT_COOKIE}=; Max-Age=0; Path=/`;
}

beforeEach(() => {
  clearConsent();
  Object.assign(authState, { user: null, uid: null, loading: false, error: null });
});

afterEach(() => {
  window.location.hash = '';
  delete document.documentElement.dataset.cookieStub;
  vi.unstubAllGlobals();
});

describe('CookieStub', () => {
  it('asks once with two equal choices, a Choices link and the Privacy notice', () => {
    render(<CookieStub />);
    const stub = screen.getByRole('dialog', { name: 'Cookie choices' });
    expect(stub).toHaveTextContent(COOKIE_STUB_COPY.sentence);
    const allow = within(stub).getByRole('button', { name: 'Allow ads & analytics' });
    const necessary = within(stub).getByRole('button', { name: 'Necessary only' });
    expect(allow.className).toBe(necessary.className);
    expect(within(stub).getByRole('link', { name: 'Privacy notice' })).toHaveAttribute('href', '/privacy');
    expect(document.documentElement.dataset.cookieStub).toBe('open');
  });

  it('stores the choice with the shared consent logic and closes', async () => {
    render(<CookieStub />);
    await userEvent.click(screen.getByRole('button', { name: 'Necessary only' }));
    expect(readCookieConsent()).toBe('necessary');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.documentElement.dataset.cookieStub).toBeUndefined();
  });

  it('expands Choices to explain both options', async () => {
    render(<CookieStub />);
    const choices = screen.getByRole('button', { name: 'Choices' });
    expect(choices).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(choices);
    expect(choices).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(COOKIE_STUB_COPY.necessaryDetail)).toBeVisible();
  });

  it('reopens from the footer link with the current choice shown', async () => {
    writeCookieConsent('ads');
    render(
      <>
        <CookieStub />
        <CookieChoicesLink />
      </>
    );
    expect(screen.queryByRole('dialog')).toBeNull();
    await userEvent.click(screen.getByRole('link', { name: 'Cookie choices' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('You currently allow ads and analytics cookies.');
    act(() => openCookieChoices());
    expect(screen.getByRole('dialog')).toHaveFocus();
  });

  it('takes over from the site-wide banner on public pages', () => {
    const { rerender } = render(<CookieConsentBanner />);
    expect(screen.getByRole('dialog', { name: 'Cookie choices' })).toHaveTextContent('Google AdSense');
    rerender(
      <>
        <CookieConsentBanner />
        <CookieStub />
      </>
    );
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    expect(screen.getByRole('dialog')).toHaveTextContent(COOKIE_STUB_COPY.sentence);
  });
});

describe('ProofPreviewGate', () => {
  it('reads ?preview=proof', () => {
    expect(hasProofPreviewParam('?preview=proof')).toBe(true);
    expect(hasProofPreviewParam('?preview=other')).toBe(false);
  });

  it('shows samples only to a verified admin with the preview flag', async () => {
    window.history.replaceState(null, '', '/?preview=proof');
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ isAdmin: true }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    authState.user = { uid: 'admin', getIdToken: async () => 'token' };
    render(
      <ProofPreviewGate>
        <p>Sample proof</p>
      </ProofPreviewGate>
    );
    expect(await screen.findByText('Sample proof')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/verify', expect.objectContaining({ method: 'POST' }));
    window.history.replaceState(null, '', '/');
  });

  it('shows nothing to signed-out visitors or non-admins', async () => {
    window.history.replaceState(null, '', '/?preview=proof');
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ isAdmin: false }), { status: 403 }));
    vi.stubGlobal('fetch', fetchMock);
    const { rerender } = render(
      <ProofPreviewGate>
        <p>Sample proof</p>
      </ProofPreviewGate>
    );
    expect(fetchMock).not.toHaveBeenCalled();
    authState.user = { uid: 'student', getIdToken: async () => 'token' };
    rerender(
      <ProofPreviewGate>
        <p>Sample proof</p>
      </ProofPreviewGate>
    );
    await act(async () => undefined);
    expect(screen.queryByText('Sample proof')).toBeNull();
    window.history.replaceState(null, '', '/');
  });
});

describe('Open Graph slip', () => {
  it('prints the headline, line and meta on a 1200 x 630 slip', () => {
    expect(OG_SIZE).toEqual({ width: 1200, height: 630 });
    const { container } = render(<OgSlip meta="Free tools" headline="CGPA calculator" line="For Nigerian universities." />);
    expect(container).toHaveTextContent('AcadeGrade');
    expect(container).toHaveTextContent('CGPA calculator');
    expect(container).toHaveTextContent('For Nigerian universities.');
    expect(container).toHaveTextContent('Free tools');
  });
});

describe('service worker removal and caching headers', () => {
  it('serves a worker that clears caches and unregisters itself', async () => {
    const response = serviceWorker();
    expect(response.headers.get('Content-Type')).toContain('javascript');
    expect(response.headers.get('Cache-Control')).toContain('no-store');
    const body = await response.text();
    expect(body).toContain('caches.delete');
    expect(body).toContain('self.registration.unregister()');
  });

  it('keeps no-store for pages and APIs but not for static files', async () => {
    // Next compiles each `source` with path-to-regexp; do the same here.
    // @ts-expect-error: Next ships this compiled module without type declarations.
    const compiled = (await import('next/dist/compiled/path-to-regexp')) as { pathToRegexp: (source: string, keys: unknown[], options: { strict: boolean }) => RegExp };
    const { pathToRegexp } = compiled;
    const rules = await nextConfig.headers!();
    const matching = (path: string) =>
      rules.filter((rule) => pathToRegexp(rule.source, [], { strict: false }).test(path)).map((rule) => rule.headers[0].value);

    expect(matching('/')).toEqual(['no-cache, no-store, must-revalidate']);
    expect(matching('/calculator')).toEqual(['no-cache, no-store, must-revalidate']);
    expect(matching('/api/site/contact')).toEqual(['no-cache, no-store, must-revalidate']);
    expect(matching('/_next/static/chunks/main.js')).toEqual([]);
    expect(matching('/images/photos/study-desk/4x5-640.avif')).toEqual(['public, max-age=86400, stale-while-revalidate=604800']);
    expect(matching('/brand/acadegrade-mark.svg')).toEqual(['public, max-age=86400, stale-while-revalidate=604800']);
    expect(matching('/favicon-32x32.png')).toEqual(['public, max-age=86400, stale-while-revalidate=604800']);
    expect(matching('/sw.js')).toEqual([]);
  });
});
