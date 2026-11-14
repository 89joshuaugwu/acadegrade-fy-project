import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const nav = vi.hoisted(() => ({ search: '' }));
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams(nav.search) }));
vi.mock('next/link', () => ({ default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }));
vi.mock('@/hooks/useAuth', () => {
  const user = { uid: 'admin-1', email: 'admin@example.com', getIdToken: async () => 'admin-token' };
  return { useAuth: () => ({ user }) };
});
vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => true }));

import AdminLegalPage from '@/app/(admin)/admin/legal/page';
import { nextLegalVersion } from '@/lib/legal/versions';

type Handler = (url: string, init?: RequestInit) => { status: number; body: unknown };
let handler: Handler;

const respond = (reply: { status: number; body: unknown }) => ({ ok: reply.status >= 200 && reply.status < 300, status: reply.status, json: async () => reply.body }) as Response;
const calls = () => vi.mocked(fetch).mock.calls.map(([url, init]) => ({ url: String(url), method: (init as RequestInit | undefined)?.method ?? 'GET', body: (init as RequestInit | undefined)?.body ? JSON.parse(String((init as RequestInit).body)) : undefined }));

const BODY = '## Agreement {#agreement}\n\nYou agree to these terms.';
const documentData = (overrides: Record<string, unknown> = {}) => ({
  current: { version: '2026-11-13', effectiveDate: '2026-11-13', title: 'Terms of use', summary: 'The rules.', body: BODY, source: 'builtin' },
  configVersion: '2026-11-13',
  draft: null,
  versions: [],
  ...overrides,
});

beforeEach(() => {
  nav.search = '';
  handler = () => ({ status: 200, body: documentData() });
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => respond(handler(String(input), init))));
  vi.stubGlobal('confirm', vi.fn(() => true));
});

describe('Admin legal documents page', () => {
  it('loads the live text, previews it and keeps Publish locked until a draft is saved', async () => {
    render(<AdminLegalPage />);
    expect(await screen.findByRole('textbox', { name: 'Text' })).toHaveValue(BODY);
    expect(calls()[0]).toMatchObject({ url: '/api/admin/legal/documents/terms', method: 'GET' });
    expect(screen.getByText(/the built-in text/)).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Preview' })).getByRole('heading', { level: 3, name: 'Agreement' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Publish…' })).toBeDisabled();
    // An unchanged draft may still be saved: it lets an admin re-issue the same text so everyone agrees again.
    expect(screen.getByRole('button', { name: 'Save draft' })).toBeEnabled();
    expect(screen.getByText(/Save a draft to enable publishing/)).toBeInTheDocument();
  });

  it('opens the Privacy notice from ?doc=privacy', async () => {
    nav.search = 'doc=privacy';
    render(<AdminLegalPage />);
    await screen.findByRole('textbox', { name: 'Text' });
    expect(calls()[0].url).toBe('/api/admin/legal/documents/privacy');
    expect(screen.getByRole('button', { name: 'Privacy notice' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('lists formatting problems from the preview and blocks saving until they are fixed', async () => {
    const user = userEvent.setup();
    render(<AdminLegalPage />);
    const text = await screen.findByRole('textbox', { name: 'Text' });
    await user.clear(text);
    // paste, not type: user-event treats "{" and "[" as key descriptors.
    await user.click(text);
    await user.paste('## A {#a}\n\nBad [link](javascript:alert(1))');
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/unsupported link/i);
    expect(screen.getByRole('button', { name: 'Save draft' })).toBeDisabled();
  });

  it('saves a draft, then the confirmation names the next version before publishing', async () => {
    const user = userEvent.setup();
    let published = false;
    handler = (url, init) => {
      if (init?.method === 'PUT') return { status: 200, body: { ok: true } };
      if (init?.method === 'POST') { published = true; return { status: 200, body: { version: nextLegalVersion('2026-11-13') } }; }
      return { status: 200, body: published ? documentData({ configVersion: nextLegalVersion('2026-11-13') }) : documentData() };
    };
    render(<AdminLegalPage />);
    const title = await screen.findByRole('textbox', { name: 'Title' });
    await user.type(title, ' (updated)');
    await user.click(screen.getByRole('button', { name: 'Save draft' }));

    await waitFor(() => expect(calls().some((call) => call.method === 'PUT')).toBe(true));
    const put = calls().find((call) => call.method === 'PUT')!;
    expect(put.body).toMatchObject({ title: 'Terms of use (updated)', body: BODY });
    expect(await screen.findByText(/Draft saved/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Publish…' }));
    const next = nextLegalVersion('2026-11-13');
    const dialog = await screen.findByRole('dialog', { name: `Publish Terms of use version ${next}?` });
    expect(dialog).toHaveTextContent('Every student will be asked to agree again the next time they open AcadeGrade.');
    expect(calls().some((call) => call.method === 'POST')).toBe(false);

    await user.click(within(dialog).getByRole('button', { name: 'Publish' }));
    await waitFor(() => expect(calls().some((call) => call.method === 'POST')).toBe(true));
    expect(calls().find((call) => call.method === 'POST')).toMatchObject({ url: '/api/admin/legal/documents/terms/publish', body: { expectedCurrentVersion: '2026-11-13' } });
    expect(await screen.findByText(/Every student will be asked to agree again\./)).toBeInTheDocument();
  });

  it('asks to save again after an edit, so unsaved text can never be published', async () => {
    const user = userEvent.setup();
    handler = (url, init) => (init?.method === 'PUT' ? { status: 200, body: { ok: true } } : { status: 200, body: documentData() });
    render(<AdminLegalPage />);
    await user.type(await screen.findByRole('textbox', { name: 'Title' }), '!');
    await user.click(screen.getByRole('button', { name: 'Save draft' }));
    await screen.findByText(/Draft saved/);
    expect(screen.getByRole('button', { name: 'Publish…' })).toBeEnabled();
    await user.type(screen.getByRole('textbox', { name: 'Title' }), '?');
    expect(screen.getByRole('button', { name: 'Publish…' })).toBeDisabled();
    expect(screen.getByText(/Save the draft before publishing/)).toBeInTheDocument();
  });

  it('shows the server error and offers a reload when the live version changed', async () => {
    const user = userEvent.setup();
    handler = (url, init) => {
      if (init?.method === 'PUT') return { status: 200, body: { ok: true } };
      if (init?.method === 'POST') return { status: 409, body: { error: 'The current version changed since you opened this page.', code: 'VERSION_MISMATCH' } };
      return { status: 200, body: documentData() };
    };
    render(<AdminLegalPage />);
    await user.type(await screen.findByRole('textbox', { name: 'Title' }), '!');
    await user.click(screen.getByRole('button', { name: 'Save draft' }));
    await screen.findByText(/Draft saved/);
    await user.click(screen.getByRole('button', { name: 'Publish…' }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Publish' }));
    expect(await screen.findByText(/current version changed/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument();
  });

  it('error state retries, and a missing API says it is not available yet', async () => {
    const user = userEvent.setup();
    let fail = true;
    handler = () => (fail ? { status: 500, body: { error: 'Boom' } } : { status: 200, body: documentData() });
    render(<AdminLegalPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Boom');
    fail = false;
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('textbox', { name: 'Text' })).toBeInTheDocument();
  });

  it('says the editor is not available yet when the server has no such API', async () => {
    handler = () => ({ status: 404, body: { error: 'Not found' } });
    render(<AdminLegalPage />);
    expect(await screen.findByText(/not available yet/i)).toBeInTheDocument();
  });

  it('shows the version history', async () => {
    handler = () => ({ status: 200, body: documentData({ versions: [{ version: '2026-11-14', publishedAt: '2026-11-14T10:00:00.000Z', publishedBy: 'admin@example.com', changeNote: 'Clarified coins' }] }) });
    render(<AdminLegalPage />);
    expect(await screen.findByText('2026-11-14')).toBeInTheDocument();
    expect(screen.getByText('Clarified coins')).toBeInTheDocument();
  });
});
