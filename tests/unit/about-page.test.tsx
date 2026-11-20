import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_ABOUT_CONTENT, type AboutContent } from '@/lib/about/content';

const mocks = vi.hoisted(() => ({
  about: null as AboutContent | null,
  email: null as string | null,
  coins: false,
  user: null as null | { uid: string },
}));

vi.mock('@/lib/about/server', async () => {
  const content = await vi.importActual<typeof import('@/lib/about/content')>('@/lib/about/content');
  return { getAboutContent: async () => mocks.about ?? content.DEFAULT_ABOUT_CONTENT };
});
vi.mock('@/lib/site/contact', async () => {
  const pure = await vi.importActual<typeof import('@/lib/site/contact-email')>('@/lib/site/contact-email');
  return { ...pure, getContactEmail: async () => mocks.email };
});
vi.mock('@/lib/public/usage-public', () => ({
  readPublicUsage: async () => ({ dailyLimits: {}, coins: { enabled: mocks.coins, coinsPerAd: 1, dailyEarnCap: 1, features: {} } }),
}));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: mocks.user, uid: null, loading: false, error: null }) }));

import AboutPage from '@/app/(public)/about/page';
import { photoFor } from '@/lib/public/page-photos';

beforeEach(() => {
  mocks.about = null;
  mocks.email = null;
  mocks.coins = false;
  mocks.user = null;
});

describe('About page', () => {
  it('renders the admin headline in the h1 on the server, with no client fetch', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    mocks.about = { ...DEFAULT_ABOUT_CONTENT, headline: 'Know where you stand.', platformDescription: 'Saved by the admin.' };
    const { container } = render(await AboutPage());

    const h1 = screen.getByRole('heading', { level: 1, name: 'Know where you stand.' });
    expect(h1.querySelector('[data-headline="display"]')).not.toBeNull();
    expect(container).toHaveTextContent('Saved by the admin.');
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(container).not.toHaveTextContent('Showing our standard product information');
    vi.unstubAllGlobals();
  });

  it('shows the production defaults and drops a long headline to the head step', async () => {
    render(await AboutPage());
    expect(screen.getByRole('heading', { level: 1, name: 'A private record, made in Enugu.' })).toBeInTheDocument();
    mocks.about = { ...DEFAULT_ABOUT_CONTENT, headline: 'A much longer headline that the admin typed in full.' };
    render(await AboutPage());
    expect(screen.getByRole('heading', { level: 1, name: /much longer headline/ }).querySelector('[data-headline="long"]')).not.toBeNull();
  });

  it('names who runs it, with the founder links and no graduation claims', async () => {
    const { container } = render(await AboutPage());
    const text = container.textContent ?? '';
    expect(text).toContain('Joshua Chimaobie Ugwu');
    expect(text).toContain('Computer Science at ESUT');
    expect(text).not.toMatch(/final[- ]year|graduat/i);
    expect(text).not.toMatch(/@gmail\.com/i);
    expect(screen.getByRole('link', { name: 'Portfolio' })).toHaveAttribute('href', 'https://buildwithzaza.vercel.app');
    expect(screen.getByRole('link', { name: 'GitHub' })).toHaveAttribute('href', 'https://github.com/89joshuaugwu');
    expect(screen.getByRole('link', { name: 'LinkedIn' })).toHaveAttribute('href', 'https://www.linkedin.com/in/joshua-ugwu-63b2b0283');
    expect(container.querySelector('a[target="_blank"]')).toBeNull();
  });

  it('prints the working sheet from the engine', async () => {
    render(await AboutPage());
    const sheet = screen.getByRole('region', { name: 'Working sheet' });
    for (const value of ['4.15', '3.30', '4.43', 'Second Class Upper', '0.07 to go', '54 ÷ 13', '385 ÷ 87']) {
      expect(sheet).toHaveTextContent(value);
    }
  });

  it('uses no campus photograph: the owner image or the record fragment', async () => {
    const { container } = render(await AboutPage());
    expect(container.querySelector('img[src*="/images/campus/"]')).toBeNull();
    expect(container.querySelector('source[srcset*="/images/campus/"]')).toBeNull();
    // Owner decision 3: the 'about.intro' slot shows the owner's image (else the record fragment).
    const intro = photoFor('about.intro');
    if (intro) {
      const img = container.querySelector(`img[src="${intro.src}"]`);
      expect(img).not.toBeNull();
      expect(img).toHaveAttribute('sizes', expect.stringContaining('px'));
    }
  });

  it('shows the founder as initials, never the illustration as his portrait', async () => {
    render(await AboutPage());
    const who = screen.getByRole('region', { name: 'Who runs AcadeGrade' });
    expect(who).toHaveTextContent('JU');
    expect(who.querySelector('img')).toBeNull();
  });

  it('shows coin wording only while coins are on', async () => {
    const { container, unmount } = render(await AboutPage());
    expect(container).not.toHaveTextContent("Coins can't be bought");
    unmount();
    mocks.coins = true;
    const { container: on } = render(await AboutPage());
    expect(on).toHaveTextContent("Coins can't be bought");
  });

  it('offers a complete contact route with and without an email', async () => {
    mocks.email = 'hello@example.org';
    const { unmount } = render(await AboutPage());
    const write = screen.getByRole('region', { name: 'Write to us' });
    expect(within(write).getByRole('link', { name: 'hello@example.org' })).toHaveAttribute('href', 'mailto:hello@example.org?subject=AcadeGrade%20enquiry');
    expect(within(write).getByRole('link', { name: 'Get help on the support page' })).toHaveAttribute('href', '/support');
    unmount();

    mocks.email = null;
    render(await AboutPage());
    const fallback = screen.getByRole('region', { name: 'Write to us' });
    expect(within(fallback).getByRole('link', { name: 'Send us a request' })).toHaveAttribute('href', '/support#request');
    expect(within(fallback).getByRole('link', { name: 'Fix common problems' })).toHaveAttribute('href', '/support#quick-fixes');
    expect(fallback).not.toHaveTextContent(/will be published|coming soon/i);
  });

  it('swaps the primary action to Open dashboard when signed in', async () => {
    render(await AboutPage());
    expect(screen.getAllByRole('link', { name: 'Start your free record' })[0]).toHaveAttribute('href', '/register');
    mocks.user = { uid: 'u1' };
    render(await AboutPage());
    expect(screen.getAllByRole('link', { name: 'Open dashboard' })[0]).toHaveAttribute('href', '/dashboard');
  });
});
