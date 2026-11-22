import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ queryCollection: vi.fn(), getIdToken: vi.fn(async () => 'token') }));

vi.mock('@/components/cgpa/CGPAArc', () => ({ CGPAArc: () => <div>Academic metric arc</div> }));
vi.mock('@/components/transcript/ShareQr', () => ({ ShareQr: ({ url }: { url: string }) => <div>QR for {url}</div> }));
vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => true }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/transcript',
}));
const authValue = { user: { uid: 'student-1', photoURL: null, getIdToken: mocks.getIdToken }, loading: false };
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => authValue }));
vi.mock('@/hooks/useProfile', () => ({ useProfile: () => ({ profile: { fullName: 'Ada', university: 'UNILAG', avatarUrl: 'https://img.test/a.png' } }) }));
vi.mock('@/lib/firebase/firestore', () => ({
  deleteDocument: vi.fn(),
  queryCollection: mocks.queryCollection,
  getDocument: vi.fn().mockResolvedValue(null),
  where: vi.fn(),
}));
vi.mock('react-hot-toast', () => ({ default: { error: vi.fn(), success: vi.fn(), loading: vi.fn() } }));

import TranscriptPage from '@/app/(student)/transcript/page';

const DAY = 86_400_000;

function seed() {
  mocks.queryCollection.mockImplementation(async (path: string) => {
    if (path.endsWith('/semesters')) {
      return [{ id: 's1', label: 'Year 1 First Semester', session: '2024/2025', level: 100, semester: 1, gpa: 4, pi: 3.5, creditLoaded: 18, isComplete: true }];
    }
    if (path === 'shared_transcripts') {
      return [{
        id: 'abc123abc123', expiresAt: new Date(Date.now() + 7 * DAY - 60_000), shareLevel: 'summary', pinHash: 'x'.repeat(128),
        viewCount: 3, showPhoto: true, avatarUrl: 'https://img.test/a.png',
      }];
    }
    return [];
  });
}

afterEach(() => vi.unstubAllGlobals());

describe('transcript page controls', () => {
  it('shows the grading scale in the summary and each shared link as chips with labelled actions', async () => {
    seed();
    render(<TranscriptPage />);
    const list = await screen.findByRole('list', { name: 'Link details' }, { timeout: 5000 });
    for (const chip of ['Expires in 7 days', 'Summary', 'PIN', 'Photo', '3 views']) {
      expect(within(list).getByText(chip)).toBeInTheDocument();
    }
    expect(screen.getByText(`${window.location.host}/share/abc123abc123`)).toBeInTheDocument();
    for (const name of ['Copy link', 'Show QR code', 'Open link in a new tab', 'Preview here', 'Delete link']) {
      expect(screen.getByRole(name === 'Open link in a new tab' ? 'link' : 'button', { name })).toBeInTheDocument();
    }
    expect(screen.getByText('Grading scale', { selector: 'dt' })).toBeInTheDocument();
  });

  it('keeps every link setting in the share dialog and sends them in one request', async () => {
    seed();
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ shareId: 'fff000fff000', shareUrl: 'https://app.test/share/fff000fff000', expiresInDays: 7, level: 'summary', hasPin: true }),
    }) as unknown as Response);
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(<TranscriptPage />);

    // Not on the page itself any more.
    await screen.findByRole('button', { name: /Share a link/ }, { timeout: 5000 });
    expect(screen.queryByLabelText('PIN (optional)')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Share a link/ }));
    const dialog = await screen.findByRole('dialog', { name: 'Share a link' });
    await user.click(within(dialog).getByRole('radio', { name: '7 days' }));
    await user.click(within(dialog).getByRole('radio', { name: 'Summary only' }));
    await user.type(within(dialog).getByLabelText('PIN (optional)'), '1234');
    await user.click(within(dialog).getByRole('button', { name: 'Create link' }));

    expect(await screen.findByRole('dialog', { name: 'Your link is ready' })).toBeInTheDocument();
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/transcript/share');
    expect(JSON.parse(String(init.body))).toEqual({ showPhoto: true, expiresInDays: 7, level: 'summary', pin: '1234' });
    expect(screen.getByText('QR for https://app.test/share/fff000fff000')).toBeInTheDocument();
  });

  it('refuses a malformed PIN inside the dialog without sending anything', async () => {
    seed();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(<TranscriptPage />);
    await user.click(await screen.findByRole('button', { name: /Share a link/ }, { timeout: 5000 }));
    const dialog = await screen.findByRole('dialog', { name: 'Share a link' });
    await user.type(within(dialog).getByLabelText('PIN (optional)'), '12');
    await user.click(within(dialog).getByRole('button', { name: 'Create link' }));
    expect(await within(dialog).findByText('Use 4 to 6 digits, or leave the PIN empty.')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
