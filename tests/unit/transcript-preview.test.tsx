import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => true }));

import { TranscriptPreview } from '@/components/transcript/TranscriptPreview';

const record = {
  studentName: 'Ada Example',
  matric: '2022/000001',
  department: 'Computer Science',
  programme: 'B.Sc. Computer Science',
  currentLevel: '300',
  showPhoto: false,
  cgpa: 4,
  pi: 3.4,
  totalCredits: 4,
  shareLevel: 'summary',
  semesters: [{ id: 's1', label: '100L First Semester', session: '2022/2023', level: 100, semester: 1, gpa: 4, pi: 3.4, creditLoaded: 4, courses: [] }],
};

type Reply = { status: number; body: unknown };
const respond = ({ status, body }: Reply) =>
  ({ ok: status >= 200 && status < 300, status, headers: new Headers(), json: async () => body }) as Response;

function serve(handler: (pin: string | null) => Reply) {
  const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) =>
    respond(handler(new Headers(init?.headers).get('X-Share-Pin'))));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

async function paste(value: string) {
  const user = userEvent.setup();
  render(<TranscriptPreview />);
  await user.type(screen.getByLabelText('Share link or ID'), value);
  await user.click(screen.getByRole('button', { name: 'Preview' }));
  return user;
}

afterEach(() => vi.unstubAllGlobals());

describe('Preview a transcript', () => {
  it('explains a pasted link from another site without fetching', async () => {
    const fetchMock = serve(() => ({ status: 200, body: {} }));
    await paste('https://evil.example/share/0a1b2c3d4e5f');
    expect(await screen.findByText('That link is not on AcadeGrade. Paste an AcadeGrade share link.')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('opens a bare id and shows the record at the level the link allows', async () => {
    const fetchMock = serve(() => ({ status: 200, body: { transcript: record, expiresAt: '2026-12-01T00:00:00.000Z' } }));
    await paste('0a1b2c3d4e5f');
    expect(await screen.findByRole('heading', { name: 'Unofficial academic record' })).toBeInTheDocument();
    expect(screen.getByText('Summary')).toBeInTheDocument();
    expect(screen.getByText(/Grading scale:/)).toBeInTheDocument();
    expect(String(fetchMock.mock.calls[0][0])).toBe('/api/transcript/share?id=0a1b2c3d4e5f');
  });

  it('asks for the PIN, says when it is wrong, and opens with the right one sent only as a header', async () => {
    const fetchMock = serve((pin) => {
      if (!pin) return { status: 401, body: { code: 'PIN_REQUIRED' } };
      if (pin === '4821') return { status: 200, body: { transcript: record, expiresAt: null } };
      return { status: 401, body: { code: 'PIN_INCORRECT' } };
    });
    const user = await paste(`${window.location.origin}/share/0a1b2c3d4e5f`);
    const pinField = await screen.findByLabelText('PIN');
    await user.type(pinField, '1111');
    await user.click(screen.getByRole('button', { name: 'View record' }));
    expect(await screen.findByText("That PIN isn't right. Check it and try again.")).toBeInTheDocument();
    await user.type(screen.getByLabelText('PIN'), '4821');
    await user.click(screen.getByRole('button', { name: 'View record' }));
    expect(await screen.findByRole('heading', { name: 'Unofficial academic record' })).toBeInTheDocument();
    for (const [url] of fetchMock.mock.calls) expect(String(url)).not.toMatch(/1111|4821/);
    expect(new Headers(fetchMock.mock.calls.at(-1)?.[1]?.headers).get('X-Share-Pin')).toBe('4821');
  });

  it('shows the locked, expired and not-found states', async () => {
    serve(() => ({ status: 429, body: { code: 'PIN_LOCKED', retryAfterSeconds: 1200 } }));
    const { unmount } = render(<TranscriptPreview request={{ id: '0a1b2c3d4e5f', key: 1 }} />);
    expect(await screen.findByText(/locked for about 20 minutes/)).toBeInTheDocument();
    unmount();

    serve(() => ({ status: 410, body: {} }));
    const second = render(<TranscriptPreview request={{ id: '0a1b2c3d4e5f', key: 2 }} />);
    expect(await screen.findByRole('heading', { name: 'This link has expired' })).toBeInTheDocument();
    second.unmount();

    serve(() => ({ status: 404, body: {} }));
    render(<TranscriptPreview request={{ id: '0a1b2c3d4e5f', key: 3 }} />);
    expect(await screen.findByRole('heading', { name: "We couldn't find this link" })).toBeInTheDocument();
  });

  it('offers Try again after a network error', async () => {
    let calls = 0;
    vi.stubGlobal('fetch', vi.fn(async () => {
      calls += 1;
      if (calls === 1) throw new Error('offline');
      return respond({ status: 200, body: { transcript: record, expiresAt: null } });
    }));
    const user = userEvent.setup();
    render(<TranscriptPreview request={{ id: '0a1b2c3d4e5f', key: 1 }} />);
    await user.click(await screen.findByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Unofficial academic record' })).toBeInTheDocument());
  });
});
