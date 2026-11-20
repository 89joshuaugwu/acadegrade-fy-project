import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ email: null as string | null, published: null as null | Record<string, unknown> }));

// Built-in text unless a test sets `mocks.published` (an admin-published version).
vi.mock('@/lib/legal/server', async () => {
  const { BUILTIN_LEGAL } = await vi.importActual<typeof import('@/lib/legal/builtin')>('@/lib/legal/builtin');
  return {
    getPublishedLegal: async (document: 'terms' | 'privacy') => (
      mocks.published ?? { ...BUILTIN_LEGAL[document], source: 'builtin' }
    ),
  };
});

vi.mock('@/lib/site/contact', async () => {
  const pure = await vi.importActual<typeof import('@/lib/site/contact-email')>('@/lib/site/contact-email');
  return { ...pure, getContactEmail: async () => mocks.email };
});
import PrivacyPage from '@/app/(public)/privacy/page';
import TermsPage from '@/app/(public)/terms/page';
import AccountDeletionPage from '@/app/(public)/account-deletion/page';

async function renderServer(page: () => Promise<React.ReactElement>) {
  return render(await page());
}

beforeEach(() => {
  mocks.email = null;
  mocks.published = null;
});

describe('Published legal text (R5)', () => {
  const published = (title: string) => ({
    version: '2026-12-01', effectiveDate: '2026-12-01', title, summary: 'Updated rules.',
    body: '## New section {#new}\n\nPublished by an admin. Contact {{contact:Terms of use question}}.',
    source: 'published',
  });

  it('renders a published version with its own version and effective date', async () => {
    mocks.published = published('Terms of use');
    mocks.email = 'help@example.org';
    const { container } = await renderServer(TermsPage);
    expect(screen.getByText('2026-12-01')).toBeInTheDocument();
    expect(container).toHaveTextContent('1 December 2026');
    expect(screen.getByRole('heading', { level: 2, name: 'New section' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'help@example.org' })).toHaveAttribute('href', expect.stringContaining('mailto:help@example.org'));
    // The old built-in sections are gone.
    expect(container).not.toHaveTextContent('Agreement and eligibility');
  });

  it('the privacy page renders its own published text too', async () => {
    mocks.published = published('Privacy notice');
    const { container } = await renderServer(PrivacyPage);
    expect(container).toHaveTextContent('Published by an admin.');
  });
});

describe('Privacy notice', () => {
  it('shows no draft banner, is versioned like config/legal, and names the operator with no placeholders left', async () => {
    const { container } = await renderServer(PrivacyPage);

    expect(container).not.toHaveTextContent('Draft — pending legal review');
    expect(screen.getByText('2026-11-17')).toBeInTheDocument();
    expect(container.querySelectorAll('[data-legal-placeholder]')).toHaveLength(0);
    expect(container).toHaveTextContent('operated by Joshua Chimaobie Ugwu');
    expect(container).toHaveTextContent('Google AdSense and Adsterra');
    expect(container).toHaveTextContent('up to 30 days');
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
    for (const link of screen.getAllByRole('link', { name: 'Cookie choices' })) expect(link).toHaveAttribute('href', '#cookie-choices');
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
    expect(container.querySelectorAll('[data-legal-placeholder]')).toHaveLength(0);
    expect(text).toMatch(/governed by the laws of the Federal Republic of Nigeria/);
    expect(text).toMatch(/Joshua Chimaobie Ugwu/);
    expect(container).not.toHaveTextContent('support@acadegrade.com');
  });
});

describe('Legal document layout', () => {
  it('shows the version, date and reading time as plain text, a contents list and a closing panel', async () => {
    const { container } = await renderServer(PrivacyPage);
    expect(container.querySelector('[data-legal-document]')).not.toBeNull();
    expect(screen.getByRole('heading', { level: 1, name: 'Privacy notice' })).toBeInTheDocument();
    const facts = [...container.querySelectorAll('dl dt')].map((term) => [term.textContent, term.nextElementSibling?.textContent]);
    expect(facts).toEqual(expect.arrayContaining([
      ['Version', '2026-11-17'],
      ['Effective', '17 November 2026'],
      ['Reading time', expect.stringMatching(/^About \d+ minutes$/)],
    ]));
    expect(container).toHaveTextContent('Version 2026-11-17, effective 17 November 2026.');
    const navs = screen.getAllByRole('navigation', { name: 'Privacy notice contents' });
    expect(navs).toHaveLength(2); // sticky list from 1024px, <details> below that
    expect(within(navs[0]).getByRole('link', { name: /Who runs AcadeGrade/ })).toHaveAttribute('href', expect.stringMatching(/^#/));
    const phone = container.querySelector('details summary') as HTMLElement;
    expect(phone).toHaveTextContent(/Contents \(\d+ sections\)/);
    expect(screen.getAllByRole('link', { name: 'Terms of use' })[0]).toHaveAttribute('href', '/terms');
    expect(container.querySelector('.rounded-full')).toBeNull();
    expect(container).not.toHaveTextContent(' · ');
  });

  it('keeps the page address for print and hides the controls from print', async () => {
    const { container } = await renderServer(PrivacyPage);
    expect(container.querySelector('.ag-legal-address')).toHaveTextContent(/\/privacy$/);
    for (const nav of container.querySelectorAll('nav[aria-label="Privacy notice contents"]')) {
      expect(nav.closest('[data-print="hide"]')).not.toBeNull();
    }
  });

  it('opens no public link in a new tab and labels table cells for phones', async () => {
    const { container } = await renderServer(PrivacyPage);
    expect(container.querySelector('a[target="_blank"]')).toBeNull();
    expect(container.querySelector('td[data-label]')?.getAttribute('data-label')).toBeTruthy();
  });

  it('shows the change note of a published version', async () => {
    mocks.published = {
      version: '2026-12-01', effectiveDate: '2026-12-01', title: 'Terms of use', summary: '', changeNote: 'Clarified coins.',
      body: '## Coins {#coins}\n\nCoins are not money.', source: 'published',
    };
    const { container } = await renderServer(TermsPage);
    expect(container).toHaveTextContent('What changed: Clarified coins.');
    expect(screen.getAllByRole('link', { name: 'Privacy notice' })[0]).toHaveAttribute('href', '/privacy');
  });
});

describe('Account deletion page', () => {
  it('explains deletion in the app and on the web, and what is kept', async () => {
    const { container } = await renderServer(AccountDeletionPage);

    expect(screen.getByRole('heading', { level: 1, name: 'Delete your AcadeGrade account' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'In the Android app' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'On the website' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to Settings' })).toHaveAttribute('href', '/settings#delete-account');
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login?next=%2Fsettings%23delete-account');
    expect(screen.getByRole('heading', { name: 'What is deleted' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'What may be kept for a while, and why' })).toBeInTheDocument();
    for (const fact of ['30 days', '55 days', '21 days', 'Download my data', 'Danger Zone', 'Delete Account', 'cannot be undone',
      'Your timetables', 'Help and support requests you sent', 'Reports you made about AI answers',
      'Suggestions you sent for the university and course lists', 'finish it automatically within 21 days',
      'operated by Joshua Chimaobie Ugwu']) {
      expect(container).toHaveTextContent(fact);
    }
  });

  it('offers a request path for people who cannot sign in, with or without an email', async () => {
    mocks.email = 'help@example.org';
    const { unmount, container } = await renderServer(AccountDeletionPage);
    const section = container.querySelector('#cannot-sign-in') as HTMLElement;
    expect(within(section).getByRole('link', { name: 'help@example.org' }))
      .toHaveAttribute('href', 'mailto:help@example.org?subject=Account%20deletion%20request');
    expect(section).toHaveTextContent('Account deletion request');
    unmount();

    mocks.email = null;
    const { container: empty } = await renderServer(AccountDeletionPage);
    const fallback = empty.querySelector('#cannot-sign-in') as HTMLElement;
    expect(within(fallback).getByRole('link', { name: /send us a request without signing in/i })).toHaveAttribute('href', '/support#request');
    expect(fallback.querySelector('a[href^="mailto:"]')).toBeNull();
  });
});
