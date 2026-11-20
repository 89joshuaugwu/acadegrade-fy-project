import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SUPPORT_CATEGORY_LABELS } from '@/lib/support/tickets';
import { PUBLIC_SUPPORT_CATEGORIES } from '@/lib/support/public-request';

const mocks = vi.hoisted(() => ({
  email: null as string | null,
  disabled: [] as string[],
  user: null as null | { uid: string },
}));

vi.mock('@/lib/site/contact', async () => {
  const pure = await vi.importActual<typeof import('@/lib/site/contact-email')>('@/lib/site/contact-email');
  return { ...pure, getContactEmail: async () => mocks.email };
});
vi.mock('@/lib/platform/settings-server', () => ({ getPlatformSettings: async () => ({ disabledFeatures: mocks.disabled }) }));
vi.mock('@/lib/public/usage-public', () => ({ readPublicUsage: async () => null }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: mocks.user, uid: null, loading: false, error: null }) }));

import SupportPage from '@/app/(public)/support/page';

beforeEach(() => {
  mocks.email = null;
  mocks.disabled = [];
  mocks.user = null;
});

function reply(status: number, body: unknown, headers: Record<string, string> = {}) {
  return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } }));
}

/** The category is a brand v2 dropdown (a combobox and a listbox), not a native select. */
function chooseCategory(label: string) {
  fireEvent.click(screen.getByRole('combobox', { name: /What is it about\?/ }));
  fireEvent.click(screen.getByRole('option', { name: label }));
}

async function fillAndSend() {
  fireEvent.change(screen.getByLabelText('Your email address'), { target: { value: 'ada@example.org' } });
  chooseCategory(SUPPORT_CATEGORY_LABELS.account);
  fireEvent.change(screen.getByLabelText('Describe the problem'), { target: { value: 'I cannot sign in to my account.' } });
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Send request' }));
  });
}

describe('Support page', () => {
  it('is complete and production-ready with no contact email', async () => {
    const { container } = render(await SupportPage());
    expect(screen.getByRole('heading', { level: 1, name: 'Tell us what went wrong.' })).toBeInTheDocument();
    expect(screen.getByRole('form', { name: 'Support request' })).toBeInTheDocument();
    expect(container.querySelector('a[href^="mailto:"]')).toBeNull();
    const text = container.textContent ?? '';
    for (const banned of [/firebase/i, /\btoken\b/i, /will be published/i, /until then/i, /coming soon/i, /\broute\b/i]) {
      expect(text).not.toMatch(banned);
    }
    expect(container.querySelector('img[src*="/images/campus/"]')).toBeNull();
  });

  it('lists fourteen quick fixes and matches the FAQ JSON-LD to them', async () => {
    const { container } = render(await SupportPage());
    const fixes = container.querySelector('#quick-fixes') as HTMLElement;
    expect(fixes.querySelectorAll('details summary')).toHaveLength(14);
    const scripts = [...container.querySelectorAll('script[type="application/ld+json"]')].map((node) => JSON.parse(node.textContent ?? '{}'));
    const faq = scripts.find((entry) => entry['@type'] === 'FAQPage');
    expect(faq.mainEntity).toHaveLength(14);
    for (const entry of faq.mainEntity) expect(fixes).toHaveTextContent(entry.name);
    expect(fixes).not.toHaveTextContent(/coins/i);
  });

  it('uses the shared category labels in the form and the include table', async () => {
    const { container } = render(await SupportPage());
    expect(container.querySelector('select')).toBeNull();
    const combobox = screen.getByRole('combobox', { name: /What is it about\?/ });
    expect(combobox).toHaveTextContent('Choose one');
    fireEvent.click(combobox);
    const options = within(screen.getByRole('listbox')).getAllByRole('option').map((option) => option.textContent);
    expect(options).toEqual(PUBLIC_SUPPORT_CATEGORIES.map((category) => SUPPORT_CATEGORY_LABELS[category]));
    fireEvent.click(screen.getByRole('option', { name: SUPPORT_CATEGORY_LABELS.privacy }));
    expect(combobox).toHaveTextContent(SUPPORT_CATEGORY_LABELS.privacy);
    expect(container.querySelector('input[type="hidden"][name="category"]')).toHaveValue('privacy');
    for (const label of Object.values(SUPPORT_CATEGORY_LABELS)) expect(screen.getAllByText(label).length).toBeGreaterThan(0);
  });

  it('checks the form before sending and posts to the public route', async () => {
    const fetchMock = vi.fn(() => reply(201, { ok: true }));
    vi.stubGlobal('fetch', fetchMock);
    render(await SupportPage());

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Send request' }));
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByText('Enter the email address we should reply to')).toBeInTheDocument();
    expect(screen.getByText('Choose what it is about')).toBeInTheDocument();
    expect(screen.getByLabelText('Your email address')).toHaveFocus();

    await fillAndSend();
    expect(fetchMock).toHaveBeenCalledWith('/api/support/public', expect.objectContaining({ method: 'POST' }));
    const body = JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(body).toMatchObject({ email: 'ada@example.org', category: 'account', route: '/support', website: '' });
    expect(await screen.findByText('Sent. We will reply to ada@example.org.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Send another request' }));
    expect(screen.getByLabelText('Your email address')).toHaveValue('');
    vi.unstubAllGlobals();
  });

  it.each([
    [400, { error: 'Enter the email address we should reply to' }, {}, 'Enter the email address we should reply to'],
    [429, { error: 'You have sent several requests already. Please wait before sending another.', retryAfterSeconds: 600 }, { 'Retry-After': '600' }, /send again in about 10 minutes/],
    [500, { error: 'Your request could not be sent. Please try again.' }, {}, 'Your request could not be sent. Please try again.'],
  ])('shows the %s response', async (status, body, headers, message) => {
    vi.stubGlobal('fetch', vi.fn(() => reply(status, body, headers)));
    render(await SupportPage());
    await fillAndSend();
    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    if (status === 429) expect(screen.getByRole('button', { name: 'Send request' })).toHaveAttribute('aria-disabled', 'true');
    vi.unstubAllGlobals();
  });

  it('moves focus to the category dropdown when the API names it', async () => {
    vi.stubGlobal('fetch', vi.fn(() => reply(400, { error: 'Choose what it is about' })));
    render(await SupportPage());
    await fillAndSend();
    await waitFor(() => expect(screen.getByRole('combobox', { name: /What is it about\?/ })).toHaveFocus());
    expect(screen.getAllByRole('alert').length).toBeGreaterThan(0);
    vi.unstubAllGlobals();
  });

  it('shows the paused state on 503 and when support is switched off', async () => {
    vi.stubGlobal('fetch', vi.fn(() => reply(503, { code: 'FEATURE_DISABLED', feature: 'support' })));
    const { unmount } = render(await SupportPage());
    await fillAndSend();
    await waitFor(() => expect(screen.getByText('Requests are paused for a short while.')).toBeInTheDocument());
    unmount();
    vi.unstubAllGlobals();

    mocks.disabled = ['support'];
    mocks.email = 'help@example.org';
    const { unmount: second } = render(await SupportPage());
    expect(screen.getByText('Requests are paused for a short while.')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Email support' })[0]).toHaveAttribute('href', 'mailto:help@example.org?subject=AcadeGrade%20support%20request');
    second();

    mocks.email = null;
    const { container } = render(await SupportPage());
    expect(screen.queryByRole('link', { name: 'Email support' })).toBeNull();
    expect(container.querySelector('#quick-fixes')).not.toBeNull();
    expect(screen.queryByRole('heading', { name: 'Still stuck?' })).toBeNull();
  });

  it('opens with two ways in: Settings for signed-in students, the form below for everyone else', async () => {
    render(await SupportPage());
    expect(screen.getByRole('heading', { level: 2, name: 'Signed in?' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to Settings' })).toHaveAttribute('href', '/settings#help');
    expect(screen.getByRole('heading', { level: 2, name: "Can't sign in?" })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Write to us below' })).toHaveAttribute('href', '#request');
    expect(screen.getAllByRole('link', { name: 'Forgot password?' })[0]).toHaveAttribute('href', '/forgot-password');
  });

  it('sends signed-in students to Settings > Help and support, with the form one tap away', async () => {
    mocks.user = { uid: 'u1' };
    render(await SupportPage());
    expect(screen.getByRole('link', { name: 'Open Help and support' })).toHaveAttribute('href', '/settings#help');
    fireEvent.click(screen.getByRole('button', { name: 'Write from this page instead' }));
    expect(screen.getByRole('form', { name: 'Support request' })).toBeInTheDocument();
  });
});
