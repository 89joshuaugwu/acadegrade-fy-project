import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import TranscriptPage from '@/app/(student)/transcript/page';

const mocks = vi.hoisted(() => ({
  queryCollection: vi.fn(),
  user: { uid: 'student-1', photoURL: null, getIdToken: vi.fn() },
}));

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: mocks.user, loading: false }) }));
vi.mock('@/hooks/useProfile', () => ({ useProfile: () => ({ profile: { fullName: 'Ada Student', matric: 'AG/001', currentLevel: 300 } }) }));
vi.mock('@/lib/firebase/firestore', () => ({ queryCollection: mocks.queryCollection, deleteDocument: vi.fn(), where: vi.fn() }));
vi.mock('@/components/cgpa/CGPAArc', () => ({ CGPAArc: () => <div data-testid="cgpa-arc" /> }));
vi.mock('react-hot-toast', () => ({ default: { error: vi.fn(), success: vi.fn(), loading: vi.fn() } }));

const semester = { id: 'semester-1', label: 'First Semester', session: '2025/2026', level: 300, semester: 1, gpa: 4.2, pi: 4.1, creditLoaded: 18, isComplete: true };

function loadWith(links: unknown[] = []) {
  mocks.queryCollection
    .mockResolvedValueOnce([semester])
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce(links);
}

function stubShare(reply: Record<string, unknown> = { shareId: 'abc', shareUrl: 'https://grade.example/share/abc' }) {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue(reply) });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const sentBody = (fetchMock: ReturnType<typeof vi.fn>) => {
  const call = fetchMock.mock.calls.find(([url]) => String(url) === '/api/transcript/share');
  return JSON.parse(String(call?.[1]?.body));
};

beforeEach(() => {
  mocks.queryCollection.mockReset();
  mocks.user.getIdToken.mockResolvedValue('token');
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

    const settings = await screen.findByRole('group', { name: /share link settings/i });
    expect(within(settings).getByRole('radio', { name: /30 days/i })).toBeChecked();
    expect(within(settings).getByRole('checkbox', { name: /summary only/i })).not.toBeChecked();

    await user.click(screen.getByRole('button', { name: /share link/i }));
    await screen.findByRole('dialog', { name: /transcript shared/i });
    expect(sentBody(fetchMock)).toEqual({ showPhoto: true, expiresInDays: 30, level: 'full' });
  });

  it('sends the chosen expiry, level and PIN, then forgets the PIN', async () => {
    const user = userEvent.setup();
    loadWith();
    const fetchMock = stubShare({ shareId: 'abc', shareUrl: 'https://grade.example/share/abc', expiresInDays: 7, level: 'summary', hasPin: true });
    render(<TranscriptPage />);

    await user.click(await screen.findByRole('radio', { name: /7 days/i }));
    await user.click(screen.getByRole('checkbox', { name: /summary only/i }));
    const pin = screen.getByLabelText(/^pin/i);
    expect(pin).toHaveAttribute('type', 'password');
    expect(pin).not.toHaveAttribute('name');
    await user.type(pin, '4821');
    await user.click(screen.getByRole('button', { name: /share link/i }));

    const dialog = await screen.findByRole('dialog', { name: /transcript shared/i });
    expect(sentBody(fetchMock)).toEqual({ showPhoto: true, expiresInDays: 7, level: 'summary', pin: '4821' });
    expect(dialog).toHaveAccessibleDescription(/expires in 7 days/i);
    expect(dialog).toHaveTextContent(/pin/i);
    expect(dialog).toHaveTextContent(/summary only/i);
    // The QR code and copy box still carry only the link.
    expect(screen.getByRole('textbox', { name: /shared transcript link/i })).toHaveValue('https://grade.example/share/abc');
    expect(await screen.findByAltText('QR code for your transcript link')).toBeInTheDocument();
    expect(screen.getByLabelText(/^pin/i)).toHaveValue('');
    expect(document.body.innerHTML).not.toContain('4821');
  });

  it('blocks a malformed PIN before calling the server', async () => {
    const user = userEvent.setup();
    loadWith();
    const fetchMock = stubShare();
    render(<TranscriptPage />);

    await user.type(await screen.findByLabelText(/^pin/i), '12');
    await user.click(screen.getByRole('button', { name: /share link/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/4 to 6 digits/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('explains that the PIN cannot be recovered and is typed by the viewer', async () => {
    loadWith();
    stubShare();
    render(<TranscriptPage />);
    const settings = await screen.findByRole('group', { name: /share link settings/i });
    expect(settings).toHaveTextContent(/can't be recovered/i);
    expect(settings).toHaveTextContent(/person opening the link/i);
    expect(settings.textContent ?? '').not.toMatch(/verified/i);
  });

  it('labels active links that are summary-only or PIN-protected, and shows views', async () => {
    loadWith([{ id: 'share-1', expiresAt: new Date(Date.now() + 86_400_000), shareLevel: 'summary', pinHash: 'x', viewCount: 3 }]);
    stubShare();
    render(<TranscriptPage />);

    await screen.findByRole('link', { name: /open shared transcript/i });
    expect(screen.getByText('Summary')).toBeInTheDocument();
    expect(screen.getByText('PIN')).toBeInTheDocument();
    expect(screen.getByText(/3 views/i)).toBeInTheDocument();
    await waitFor(() => expect(document.body.innerHTML).not.toContain('pinHash'));
  });
});
