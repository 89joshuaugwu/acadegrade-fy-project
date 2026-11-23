import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/*
 * Link settings live in the "Share a link" dialog (components/transcript/ShareLinkDialog.tsx).
 * Covered elsewhere, so not repeated here (tests/unit/transcript-page-controls.test.tsx):
 * - sending the chosen expiry, level and PIN in one request
 *   -> 'keeps every link setting in the share dialog and sends them in one request'
 * - blocking a malformed PIN before calling the server
 *   -> 'refuses a malformed PIN inside the dialog without sending anything'
 * - Summary / PIN / views labels on active links
 *   -> 'shows the grading scale in the summary and each shared link as chips with labelled actions'
 */

const mocks = vi.hoisted(() => ({ queryCollection: vi.fn(), getIdToken: vi.fn(async () => 'token') }));

vi.mock('@/components/cgpa/CGPAArc', () => ({ CGPAArc: () => <div data-testid="cgpa-arc" /> }));
vi.mock('@/components/transcript/ShareQr', () => ({ ShareQr: ({ url }: { url: string }) => <div>QR for {url}</div> }));
vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => true }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/transcript',
}));
const authValue = { user: { uid: 'student-1', photoURL: null, getIdToken: mocks.getIdToken }, loading: false };
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => authValue }));
vi.mock('@/hooks/useProfile', () => ({ useProfile: () => ({ profile: { fullName: 'Ada Student', matric: 'AG/001', currentLevel: 300 } }) }));
vi.mock('@/lib/firebase/firestore', () => ({
  deleteDocument: vi.fn(),
  queryCollection: mocks.queryCollection,
  getDocument: vi.fn().mockResolvedValue(null),
  where: vi.fn(),
}));
vi.mock('react-hot-toast', () => ({ default: { error: vi.fn(), success: vi.fn(), loading: vi.fn() } }));

import TranscriptPage from '@/app/(student)/transcript/page';

const semester = { id: 'semester-1', label: 'First Semester', session: '2025/2026', level: 300, semester: 1, gpa: 4.2, pi: 4.1, creditLoaded: 18, isComplete: true };

function loadWith(links: unknown[] = []) {
  mocks.queryCollection.mockImplementation(async (path: string) => {
    if (path.endsWith('/semesters')) return [semester];
    if (path === 'shared_transcripts') return links;
    return [];
  });
}

function stubShare(reply: Record<string, unknown> = { shareId: 'abc', shareUrl: 'https://grade.example/share/abc' }) {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: vi.fn().mockResolvedValue(reply) });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const sentBody = (fetchMock: ReturnType<typeof vi.fn>) => {
  const call = fetchMock.mock.calls.find(([url]) => String(url) === '/api/transcript/share');
  return JSON.parse(String(call?.[1]?.body));
};

async function openShareDialog(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: /share a link/i }, { timeout: 5000 }));
  return screen.findByRole('dialog', { name: 'Share a link' });
}

beforeEach(() => {
  mocks.queryCollection.mockReset();
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('Share link settings', () => {
  it('by default asks for a 30-day full link with no PIN', async () => {
    const user = userEvent.setup();
    loadWith();
    const fetchMock = stubShare();
    render(<TranscriptPage />);

    const dialog = await openShareDialog(user);
    expect(within(dialog).getByRole('radio', { name: '30 days' })).toBeChecked();
    expect(within(dialog).getByRole('radio', { name: 'Full transcript' })).toBeChecked();
    expect(within(dialog).getByLabelText('PIN (optional)')).toHaveValue('');

    await user.click(within(dialog).getByRole('button', { name: 'Create link' }));
    await screen.findByRole('dialog', { name: 'Your link is ready' });
    expect(sentBody(fetchMock)).toEqual({ showPhoto: true, expiresInDays: 30, level: 'full' });
  });

  it('keeps the PIN out of the form and the page once the link is sent', async () => {
    const user = userEvent.setup();
    loadWith();
    const fetchMock = stubShare({ shareId: 'abc', shareUrl: 'https://grade.example/share/abc', expiresInDays: 7, level: 'summary', hasPin: true });
    render(<TranscriptPage />);

    let dialog = await openShareDialog(user);
    await user.click(within(dialog).getByRole('radio', { name: '7 days' }));
    await user.click(within(dialog).getByRole('radio', { name: 'Summary only' }));
    const pin = within(dialog).getByLabelText('PIN (optional)');
    expect(pin).toHaveAttribute('type', 'password');
    expect(pin).not.toHaveAttribute('name');
    await user.type(pin, '4821');
    await user.click(within(dialog).getByRole('button', { name: 'Create link' }));

    const ready = await screen.findByRole('dialog', { name: 'Your link is ready' });
    expect(sentBody(fetchMock).pin).toBe('4821');
    expect(ready).toHaveAccessibleDescription(/link and the PIN.*for 7 days/i);
    expect(within(ready).getByText('Summary')).toBeInTheDocument();
    expect(within(ready).getByText('PIN')).toBeInTheDocument();
    expect(within(ready).getByText('QR for https://grade.example/share/abc')).toBeInTheDocument();
    expect(document.body.innerHTML).not.toContain('4821');

    // Reopening starts with an empty PIN field.
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    dialog = await openShareDialog(user);
    expect(within(dialog).getByLabelText('PIN (optional)')).toHaveValue('');
  });

  it('explains that the PIN cannot be shown again and is typed by the viewer', async () => {
    const user = userEvent.setup();
    loadWith();
    stubShare();
    render(<TranscriptPage />);

    const dialog = await openShareDialog(user);
    const pin = within(dialog).getByLabelText('PIN (optional)');
    expect(pin).toHaveAccessibleDescription(/person opening the link must type it/i);
    expect(pin).toHaveAccessibleDescription(/can't be shown again/i);
    expect(dialog.textContent ?? '').not.toMatch(/verified/i);
  });

  it('never puts the stored PIN hash on the page for an active link', async () => {
    loadWith([{ id: 'share-1', expiresAt: new Date(Date.now() + 86_400_000), shareLevel: 'summary', pinHash: 'hash-SECRET-9f3a', viewCount: 3 }]);
    stubShare();
    render(<TranscriptPage />);

    const list = await screen.findByRole('list', { name: 'Link details' }, { timeout: 5000 });
    expect(within(list).getByText('PIN')).toBeInTheDocument();
    expect(document.body.innerHTML).not.toContain('hash-SECRET-9f3a');
    expect(document.body.innerHTML).not.toContain('pinHash');
  });
});
