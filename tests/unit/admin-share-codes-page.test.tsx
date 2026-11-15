import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { uid: 'a', email: 'admin@test.example', getIdToken: async () => 'tok' } }) }));
vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => true }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

import AdminShareCodesPage from '@/app/(admin)/admin/share-codes/page';

vi.setConfig({ testTimeout: 15000 });

const row = (code: string, extra: Record<string, unknown> = {}) => ({
  code, useCount: 3, disabled: false, disabledReason: null, promotedAt: null, createdAt: '2026-11-01T00:00:00.000Z',
  authorId: `author-${code}`, courseCount: 1, courses: [{ code: 'CSC101', title: 'Intro', units: 3 }], ...extra,
});

describe('Admin share codes page', () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset().mockImplementation(async (_url: string, init?: RequestInit) => (init?.method === 'POST'
      ? new Response(JSON.stringify({ ok: true }), { status: 200 })
      : new Response(JSON.stringify({ codes: [row('AAAAAA'), row('BBBBBB', { disabled: true, disabledReason: 'spam' })], nextCursor: null }), { status: 200 })));
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('lists codes, shows the reason for a disabled one and the courses on demand', async () => {
    render(<AdminShareCodesPage />);
    expect(await screen.findByText('AAAAAA')).toBeInTheDocument();
    expect(screen.getByText('Reason: spam')).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Show courses in AAAAAA' }));
    expect(screen.getByText('Intro')).toBeInTheDocument();
  });

  it('disables a code with a reason and audits through the route', async () => {
    const user = userEvent.setup();
    render(<AdminShareCodesPage />);
    await user.click(await screen.findByRole('button', { name: 'Disable AAAAAA' }));
    const dialog = await screen.findByRole('dialog');
    const submit = within(dialog).getByRole('button', { name: 'Disable code' });
    expect(submit).toBeDisabled();
    await user.type(within(dialog).getByLabelText(/reason/i), 'Offensive titles');
    await user.click(submit);
    await waitFor(() => expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(true));
    const post = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST')!;
    expect(JSON.parse(post[1].body)).toEqual({ action: 'disable', code: 'AAAAAA', reason: 'Offensive titles' });
  });

  it('shows an error state when the list cannot load', async () => {
    fetchMock.mockResolvedValue(new Response('{}', { status: 500 }));
    render(<AdminShareCodesPage />);
    expect(await screen.findByText(/did not load/i)).toBeInTheDocument();
  });
});
