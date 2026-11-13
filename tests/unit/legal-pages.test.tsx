import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ email: null as string | null }));

vi.mock('@/lib/site/contact', async () => {
  const pure = await vi.importActual<typeof import('@/lib/site/contact-email')>('@/lib/site/contact-email');
  return { ...pure, getContactEmail: async () => mocks.email };
});
vi.mock('@/components/layout/Navbar', () => ({ Navbar: () => null }));
vi.mock('@/components/layout/PublicShell', () => ({ PublicFooter: () => null }));
vi.mock('@/components/marketing/PublicPage', async () => {
  const actual = await vi.importActual<typeof import('@/components/marketing/PublicPage')>('@/components/marketing/PublicPage');
  // The real PublicPage is an async server component; tests render its content directly.
  return { ...actual, PublicPage: ({ children }: { children: React.ReactNode }) => <main>{children}</main> };
});

import PrivacyPage from '@/app/(public)/privacy/page';
import TermsPage from '@/app/(public)/terms/page';
import AccountDeletionPage from '@/app/(public)/account-deletion/page';
import SupportPage from '@/app/(public)/support/page';

async function renderServer(page: () => Promise<React.ReactElement>) {
  return render(await page());
}

beforeEach(() => {
  mocks.email = null;
});

describe('Privacy notice', () => {
  it('shows no draft banner, is versioned like config/legal, and keeps placeholders visible', async () => {
    const { container } = await renderServer(PrivacyPage);

    expect(container).not.toHaveTextContent('Draft — pending legal review');
    expect(screen.getByText('2026-11-13')).toBeInTheDocument();
    const placeholders = Array.from(container.querySelectorAll('[data-legal-placeholder]')).map((el) => el.textContent);
    expect(placeholders).toEqual(expect.arrayContaining(['[OPERATOR NAME]', '[DPO CONTACT]', '[RETENTION PERIOD]']));
  });

  it('covers every required topic', async () => {
    const { container } = await renderServer(PrivacyPage);
    const text = container.textContent ?? '';

    for (const heading of [
      'Who runs AcadeGrade', 'Information we collect', 'How we use information, and why we are allowed to',
      'AI processing and result scanning', 'Where your data is stored', 'How long we keep information',
      'Ads, cookies and your consent', 'Users under 18', 'Your rights and how to use them', 'Complaints',
      'Security and data breaches',
    ]) {
      expect(screen.getByRole('heading', { level: 2, name: heading })).toBeInTheDocument();
    }
    expect(text).toMatch(/Google \(Gemini API\)/);
    expect(text).toMatch(/Groq/);
    expect(text).toMatch(/OpenRouter/);
    expect(text).toMatch(/can show your name and matriculation number/);
    expect(text).toMatch(/United States/);
    expect(text).toMatch(/Legitimate interests/);
    expect(text).toMatch(/72 hours/);
    expect(text).toMatch(/Download my data/);
    expect(screen.getByRole('link', { name: /nigeria data protection commission/i })).toHaveAttribute('href', 'https://ndpc.gov.ng');
    expect(screen.getByRole('link', { name: 'Cookie choices' })).toHaveAttribute('href', '#cookie-choices');
    expect(screen.getAllByRole('link', { name: 'account deletion page' })[0]).toHaveAttribute('href', '/account-deletion');
  });

  it('uses the configured contact address and never the old hard-coded one', async () => {
    mocks.email = 'privacy@example.org';
    const { container } = await renderServer(PrivacyPage);

    expect(screen.getAllByRole('link', { name: 'privacy@example.org' })[0]).toHaveAttribute('href', 'mailto:privacy@example.org?subject=Privacy%20request');
    expect(container).not.toHaveTextContent('support@acadegrade.com');
  });

  it('points to the support page when no address is configured', async () => {
    const { container } = await renderServer(PrivacyPage);

    expect(screen.getAllByRole('link', { name: 'the AcadeGrade support page' })[0]).toHaveAttribute('href', '/support');
    expect(container.querySelector('a[href^="mailto:"]')).toBeNull();
  });
});

describe('Terms of use', () => {
  it('is versioned, has no draft banner, and covers coins, unofficial records, AI output and governing law', async () => {
    const { container } = await renderServer(TermsPage);
    const text = container.textContent ?? '';

    expect(container).not.toHaveTextContent('Draft — pending legal review');
    expect(screen.getByText('2026-11-13')).toBeInTheDocument();
    expect(text).toMatch(/not issued, verified or endorsed by any university/);
    expect(text).toMatch(/Coins are not money and have no cash value/);
    expect(text).toMatch(/cannot be sold, transferred/);
    expect(text).toMatch(/There are no refunds for coins/);
    expect(text).toMatch(/ask you to agree to it again/);
    expect(text).toMatch(/under 18/);
    expect(Array.from(container.querySelectorAll('[data-legal-placeholder]')).map((el) => el.textContent))
      .toContain('[GOVERNING LAW — e.g., Federal Republic of Nigeria]');
    expect(container).not.toHaveTextContent('support@acadegrade.com');
  });
});

describe('Account deletion page', () => {
  it('explains deletion in the app and on the web, and what is kept', async () => {
    await renderServer(AccountDeletionPage);

    expect(screen.getByRole('heading', { level: 1, name: 'Delete your AcadeGrade account' })).toBeInTheDocument();
    const android = screen.getByRole('article', { name: 'In the Android app' });
    expect(within(android).getByText('Delete Account')).toBeInTheDocument();
    expect(screen.getByRole('article', { name: 'On the web' })).toHaveTextContent(/Settings/);
    expect(screen.getByRole('heading', { name: 'What is deleted' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'What may be kept for a while, and why' })).toBeInTheDocument();
  });

  it('offers a request path for people who cannot sign in', async () => {
    mocks.email = 'help@example.org';
    const { unmount } = await renderServer(AccountDeletionPage);
    const section = screen.getByRole('heading', { name: /can.t sign in/i }).parentElement as HTMLElement;
    expect(within(section).getByRole('link', { name: 'help@example.org' }))
      .toHaveAttribute('href', 'mailto:help@example.org?subject=Account%20deletion%20request');
    unmount();

    mocks.email = null;
    await renderServer(AccountDeletionPage);
    const fallback = screen.getByRole('heading', { name: /can.t sign in/i }).parentElement as HTMLElement;
    expect(within(fallback).getByRole('link', { name: 'the AcadeGrade support page' })).toHaveAttribute('href', '/support');
  });
});

describe('Support page contact', () => {
  it('emails the configured address, or offers guides when none is configured', async () => {
    mocks.email = 'help@example.org';
    const { unmount, container } = await renderServer(SupportPage);
    expect(screen.getByRole('link', { name: /contact support/i })).toHaveAttribute('href', 'mailto:help@example.org?subject=AcadeGrade%20support%20request');
    expect(screen.getByRole('link', { name: 'account deletion page' })).toHaveAttribute('href', '/account-deletion');
    expect(container).not.toHaveTextContent('support@acadegrade.com');
    unmount();

    mocks.email = null;
    const { container: empty } = await renderServer(SupportPage);
    expect(empty.querySelector('a[href^="mailto:"]')).toBeNull();
  });
});
